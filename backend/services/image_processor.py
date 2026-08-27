import cv2
import numpy as np
from PIL import Image
import io
import gc
import logging
from rembg import remove, new_session

logger = logging.getLogger(__name__)

class ImageProcessor:
    _session = None

    @classmethod
    def get_session(cls):
        """
        Lazily initialize a lightweight, fast ONNX session using u2netp (4.5 MB model).
        Consumes < 80MB RAM vs 1GB+ for standard models.
        """
        if cls._session is None:
            try:
                cls._session = new_session('u2netp')
                logger.info("Initialized lightweight u2netp background removal session.")
            except Exception as e:
                logger.warning(f"Could not load u2netp session: {e}. Will fallback to default.")
                cls._session = None
        return cls._session

    @classmethod
    def remove_background(cls, image_bytes: bytes) -> bytes:
        """
        Removes the background using lightweight u2netp model with image pre-scaling.
        Pre-scales large camera photos (e.g. 12MP/4K) to max 1024px to prevent RAM spikes.
        """
        try:
            # 1. Load image
            input_image = Image.open(io.BytesIO(image_bytes))

            # 2. Convert to RGB if palette/CMYK
            if input_image.mode not in ('RGB', 'RGBA'):
                input_image = input_image.convert('RGB')

            # 3. Downscale if dimensions exceed 1024px to prevent high RAM allocation
            max_dimension = 1024
            if max(input_image.size) > max_dimension:
                input_image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

            # 4. Remove background using lightweight u2netp session
            session = cls.get_session()
            if session:
                output_image = remove(input_image, session=session)
            else:
                output_image = remove(input_image)

            # 5. Save output back to PNG bytes
            img_byte_arr = io.BytesIO()
            output_image.save(img_byte_arr, format='PNG')
            result_bytes = img_byte_arr.getvalue()

            # Clean up memory
            del input_image, output_image, img_byte_arr
            gc.collect()

            return result_bytes

        except Exception as e:
            logger.error(f"Background removal error: {e}. Applying fallback transparent mask.")
            # Fallback: return original image encoded as PNG
            try:
                fallback_img = Image.open(io.BytesIO(image_bytes)).convert('RGBA')
                img_byte_arr = io.BytesIO()
                fallback_img.save(img_byte_arr, format='PNG')
                return img_byte_arr.getvalue()
            except Exception:
                return image_bytes

    @classmethod
    def enhance_and_crop(cls, image_bytes: bytes) -> bytes:
        """
        Takes image bytes with transparent background, finds the non-transparent bounding box,
        crops it, centers it in a square canvas, and applies sharpness-preserving enhancement.

        Enhancement pipeline (avoids CLAHE blurring):
        1. Gentle gamma correction to lift shadows (gamma=0.92)
        2. Unsharp masking on foreground pixels only (sharpens without blurring edges)
        3. Vibrance boost via saturation bump in HSV (not affecting luminance)
        4. INTER_LANCZOS4 for pixel-quality resizing
        """
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)

            if img is None:
                return image_bytes

            # If no alpha channel, enhance RGB directly
            if len(img.shape) < 3 or img.shape[2] < 4:
                return cls._enhance_rgb_only(img)

            # Extract alpha channel
            alpha = img[:, :, 3]
            pts = np.argwhere(alpha > 10)

            if len(pts) == 0:
                return image_bytes

            # Bounding box of the craft subject
            y1, x1 = pts.min(axis=0)
            y2, x2 = pts.max(axis=0)

            cropped = img[y1:y2 + 1, x1:x2 + 1]
            h, w = cropped.shape[:2]

            # 5% margin around subject on a square canvas
            margin = int(max(h, w) * 0.05)
            size = max(h, w) + (margin * 2)

            square = np.zeros((size, size, 4), dtype=np.uint8)
            y_offset = (size - h) // 2
            x_offset = (size - w) // 2
            square[y_offset:y_offset + h, x_offset:x_offset + w] = cropped

            bgr = square[:, :, :3].astype(np.float32)
            alpha_channel = square[:, :, 3]

            # Foreground mask for targeted enhancement (avoid enhancing transparent borders)
            fg_mask = (alpha_channel > 10).astype(np.float32)[:, :, np.newaxis]

            # Step 1: Gentle gamma correction (gamma < 1 lifts shadows, preserves highlights)
            gamma = 0.92
            bgr_gamma = np.clip(np.power(bgr / 255.0, gamma) * 255.0, 0, 255)

            # Step 2: Unsharp masking (sharpens edges without blurring)
            # Blur radius=0 means "don't blur" — use a gentle 1px Gaussian
            blurred = cv2.GaussianBlur(bgr_gamma, (0, 0), sigmaX=1.2)
            # amount=0.6 keeps sharpening subtle (0=none, 1=strong)
            sharpened = cv2.addWeighted(bgr_gamma, 1.6, blurred, -0.6, 0)
            sharpened = np.clip(sharpened, 0, 255)

            # Step 3: Gentle vibrance boost via HSV saturation — only on foreground
            sharpened_uint8 = sharpened.astype(np.uint8)
            hsv = cv2.cvtColor(sharpened_uint8, cv2.COLOR_BGR2HSV).astype(np.float32)
            # Boost saturation by 12% (soft, not oversaturated)
            hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.12, 0, 255)
            vibrant_bgr = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR).astype(np.float32)

            # Blend: apply enhancement only to foreground pixels
            final_bgr = (vibrant_bgr * fg_mask + bgr * (1 - fg_mask)).astype(np.uint8)

            enhanced_square = cv2.merge((
                final_bgr[:, :, 0],
                final_bgr[:, :, 1],
                final_bgr[:, :, 2],
                alpha_channel
            ))

            # Resize to 800x800 using LANCZOS for clean quality (no softening)
            interp = cv2.INTER_LANCZOS4 if size < 800 else cv2.INTER_AREA
            final_img = cv2.resize(enhanced_square, (800, 800), interpolation=interp)

            is_success, buffer = cv2.imencode(".png", final_img)
            if not is_success:
                return image_bytes

            del img, square, enhanced_square, final_img
            gc.collect()

            return buffer.tobytes()

        except Exception as e:
            logger.error(f"Image enhancement error: {e}")
            return image_bytes

    @staticmethod
    def _enhance_rgb_only(img: np.ndarray) -> bytes:
        """
        Enhance standard RGB images without alpha channel.
        Uses unsharp mask + vibrance instead of CLAHE to avoid blurring.
        """
        try:
            bgr = img.astype(np.float32)

            # Gamma correction
            bgr_gamma = np.clip(np.power(bgr / 255.0, 0.92) * 255.0, 0, 255)

            # Unsharp mask
            blurred = cv2.GaussianBlur(bgr_gamma, (0, 0), sigmaX=1.2)
            sharpened = np.clip(cv2.addWeighted(bgr_gamma, 1.6, blurred, -0.6, 0), 0, 255).astype(np.uint8)

            # Saturation boost
            hsv = cv2.cvtColor(sharpened, cv2.COLOR_BGR2HSV).astype(np.float32)
            hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.12, 0, 255)
            vibrant = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

            # Resize
            h, w = vibrant.shape[:2]
            interp = cv2.INTER_LANCZOS4 if max(h, w) < 800 else cv2.INTER_AREA
            resized = cv2.resize(vibrant, (800, 800), interpolation=interp)

            _, buffer = cv2.imencode(".png", resized)
            return buffer.tobytes()
        except Exception:
            _, buffer = cv2.imencode(".png", img)
            return buffer.tobytes()

    @classmethod
    def process_artisan_image(cls, raw_image_bytes: bytes) -> bytes:
        """
        Runs the optimized full pipeline: lightweight background removal followed by auto-crop & CLAHE lighting.
        """
        bg_removed = cls.remove_background(raw_image_bytes)
        enhanced = cls.enhance_and_crop(bg_removed)
        return enhanced

    # Legacy method wrapper
    @classmethod
    def process_product_image(cls, raw_image_bytes: bytes) -> bytes:
        return cls.process_artisan_image(raw_image_bytes)

    def score_image_quality(self, img: object) -> dict:
        """Score image quality: sharpness, brightness, contrast (0-100 each)."""
        import cv2
        import numpy as np
        from PIL import Image as PILImage
        
        try:
            if not isinstance(img, PILImage.Image):
                return {"sharpness": 50, "brightness": 50, "contrast": 50, "overall_score": 50, "rating": "Unknown"}
            
            # Convert to numpy
            img_rgb = img.convert("RGB")
            img_np = np.array(img_rgb)
            gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
            
            # Sharpness: Laplacian variance (higher = sharper)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            sharpness = min(100, int(laplacian_var / 5))  # normalize: 500+ = perfect
            
            # Brightness: mean pixel value
            brightness = int(gray.mean() / 255 * 100)
            
            # Contrast: std deviation of pixel values
            contrast = int(min(gray.std() / 80 * 100, 100))
            
            overall = int(sharpness * 0.4 + brightness * 0.3 + contrast * 0.3)
            
            return {
                "sharpness": sharpness,
                "brightness": brightness,
                "contrast": contrast,
                "overall_score": overall,
                "rating": "Excellent" if overall >= 75 else "Good" if overall >= 50 else "Fair" if overall >= 25 else "Poor"
            }
        except Exception:
            return {"sharpness": 50, "brightness": 50, "contrast": 50, "overall_score": 50, "rating": "Unknown"}

    def process_product_image_with_quality(self, image_bytes: bytes):
        """Process image and return (base64_result, quality_score)."""
        from PIL import Image as PILImage
        import io
        original_img = PILImage.open(io.BytesIO(image_bytes))
        quality_before = self.score_image_quality(original_img)
        # Assuming process_product_image returns bytes, converting to base64 as the instruction states "result_b64"
        # However, to keep it simple, if process_product_image just returns bytes, we can b64 encode it here.
        # Actually the instruction expects result_b64, let's just encode it.
        import base64
        enhanced_bytes = self.process_product_image(image_bytes)
        result_b64 = base64.b64encode(enhanced_bytes).decode('utf-8')
        return result_b64, quality_before

    def process_batch(self, image_files: list) -> list:
        results = []
        for f in image_files:
            try:
                res_b64, qual = self.process_product_image_with_quality(f)
                results.append(res_b64)
            except Exception:
                results.append(None)
        return results
