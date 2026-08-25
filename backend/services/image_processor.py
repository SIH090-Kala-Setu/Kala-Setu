import cv2
import numpy as np
from PIL import Image
import io
from rembg import remove

class ImageProcessor:
    @staticmethod
    def remove_background(image_bytes: bytes) -> bytes:
        """
        Removes the background of the image using rembg (U2-Net under the hood).
        """
        # Convert bytes to PIL Image
        input_image = Image.open(io.BytesIO(image_bytes))
        
        # Remove background
        output_image = remove(input_image)
        
        # Save output back to bytes
        img_byte_arr = io.BytesIO()
        output_image.save(img_byte_arr, format='PNG')
        return img_byte_arr.getvalue()

    @staticmethod
    def enhance_and_crop(image_bytes: bytes) -> bytes:
        """
        Takes image bytes with transparent background, finds the non-transparent bounding box,
        crops it, centers it in a square canvas, and enhances contrast/brightness.
        """
        # Load image with OpenCV (from PNG bytes to retain alpha channel)
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)
        
        if img is None:
            raise ValueError("Invalid image bytes provided.")

        # Check if image has alpha channel
        if img.shape[2] < 4:
            # If no alpha, return as is (unable to crop based on transparency)
            return image_bytes

        # Extract the alpha channel to find the foreground bounding box
        alpha = img[:, :, 3]
        
        # Find coordinates of all non-transparent pixels
        pts = np.argwhere(alpha > 0)
        
        if len(pts) == 0:
            # Image is completely transparent
            return image_bytes

        # Get bounding box of the object
        y1, x1 = pts.min(axis=0)
        y2, x2 = pts.max(axis=0)
        
        # Crop the image to the bounding box
        cropped = img[y1:y2+1, x1:x2+1]
        
        # Get dimensions
        h, w = cropped.shape[:2]
        
        # Calculate padding to make it a square image
        size = max(h, w)
        square = np.zeros((size, size, 4), dtype=np.uint8)
        
        # Center the cropped image on the square canvas
        y_offset = (size - h) // 2
        x_offset = (size - w) // 2
        square[y_offset:y_offset+h, x_offset:x_offset+w] = cropped

        # Enhance RGB channels (adjust contrast & brightness) using CLAHE
        # Convert to BGR to apply color enhancement
        bgr = square[:, :, :3]
        alpha_channel = square[:, :, 3]

        # Convert to Lab color space to enhance L channel (lightness)
        lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        
        # Merge channels and convert back to BGR
        limg = cv2.merge((cl, a, b))
        enhanced_bgr = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        
        # Merge back with the alpha channel
        enhanced_square = cv2.merge((enhanced_bgr[:, :, 0], enhanced_bgr[:, :, 1], enhanced_bgr[:, :, 2], alpha_channel))

        # Resize to standard size, e.g., 800x800 for high quality e-commerce listings
        final_img = cv2.resize(enhanced_square, (800, 800), interpolation=cv2.INTER_CUBIC)

        # Encode back to PNG bytes
        is_success, buffer = cv2.imencode(".png", final_img)
        if not is_success:
            raise ValueError("Failed to encode processed image.")
            
        return buffer.tobytes()

    @classmethod
    def process_artisan_image(cls, raw_image_bytes: bytes) -> bytes:
        """
        Runs the full pipeline: background removal followed by auto-cropping and lighting enhancement.
        """
        bg_removed = cls.remove_background(raw_image_bytes)
        enhanced = cls.enhance_and_crop(bg_removed)
        return enhanced
