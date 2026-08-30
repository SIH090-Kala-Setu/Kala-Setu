import os
import json
import re
from dotenv import load_dotenv

# Ensure .env is loaded
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(env_path):
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List, Optional

try:
    from groq import Groq
except ImportError:
    Groq = None

class ProductCatalog(BaseModel):
    detected_language: str = Field(description="The regional language detected in the input audio or text.")
    raw_transcription: str = Field(description="The verbatim transcription of what the artisan said.")
    
    # English Listing
    title_en: str = Field(description="A professional, catchy e-commerce product title in English.")
    description_en: str = Field(description="An SEO-friendly, engaging product description in English highlighting craftsmanship.")
    
    # Hindi Listing
    title_hi: str = Field(description="A professional, catchy e-commerce product title in Hindi.")
    description_hi: str = Field(description="An SEO-friendly, engaging product description in Hindi highlighting craftsmanship.")
    
    # Metadata
    materials: List[str] = Field(description="List of raw materials detected (e.g., silk, terracotta, bamboo).")
    tags: List[str] = Field(description="List of 5-8 SEO tags or keywords for search optimization.")
    category: str = Field(description="Best fitting product category (e.g., Textiles, Handicrafts, Pottery, Jewelry).")

class Cataloger:
    def __init__(self):
        # 1. Primary Engine: Google Gemini
        self.gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if self.gemini_api_key and not self.gemini_api_key.startswith("your_"):
            try:
                self.gemini_client = genai.Client(api_key=self.gemini_api_key)
                self.gemini_model = "gemini-2.5-flash-lite"
            except Exception as e:
                print(f"[Cataloger] Failed to initialize Gemini client: {e}")
                self.gemini_client = None
        else:
            self.gemini_client = None

        # 2. Secondary Engine: Groq AI Agent
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        if Groq and self.groq_api_key and not self.groq_api_key.startswith("your_") and not self.groq_api_key.startswith("gsk_your_"):
            try:
                self.groq_client = Groq(api_key=self.groq_api_key)
                self.groq_llm_model = "qwen/qwen3.8-27b"
                self.groq_whisper_model = "whisper-large-v3-turbo"
            except Exception as e:
                print(f"[Cataloger] Failed to initialize Groq client: {e}")
                self.groq_client = None
        else:
            self.groq_client = None

    def generate_catalog_from_audio(self, audio_bytes: bytes, mime_type: str = "audio/wav", transcript_hint: str = None) -> ProductCatalog:
        """
        Transcribes the regional audio voice note, translates, and generates a structured product catalog
        in both English and Hindi with multi-tier failover:
        Tier 1: Google Gemini Flash Multimodal
        Tier 2: Groq Whisper (Transcription) + Groq LPU (Bilingual Catalog)
        Tier 3: Local Smart Heuristic
        """
        raw_mime = mime_type.split(';')[0].strip().lower() if mime_type else "audio/mp4"
        mime_map = {
            "audio/x-m4a": "audio/mp4",
            "audio/m4a": "audio/mp4",
            "audio/aac": "audio/aac",
            "audio/mp3": "audio/mp3",
            "audio/mpeg": "audio/mp3",
            "audio/wav": "audio/wav",
            "audio/x-wav": "audio/wav",
            "audio/webm": "audio/webm",
            "audio/ogg": "audio/ogg",
        }
        clean_mime = mime_map.get(raw_mime, raw_mime if raw_mime.startswith("audio/") else "audio/mp4")
        
        # --- TIER 1: Try Gemini Multimodal ---
        if self.gemini_client:
            try:
                prompt = """
                You are an expert Virtual Business Manager for marginalized artisans, weavers, and micro-entrepreneurs.
                You will listen to the provided audio voice note of an artisan describing their handicraft/product in an Indian regional language.
                
                Perform the following steps:
                1. Transcribe the audio note accurately in its original language.
                2. Detect the language used.
                3. Generate a highly professional, appealing, and SEO-optimized product listing in English:
                   - Title: Catchy and descriptive (e.g., "Handwoven Pure Mulberry Silk Banarasi Saree")
                   - Description: Highlighting the artisanal heritage, materials, texture, care instructions, and dimensions if mentioned.
                4. Generate the corresponding product listing in Hindi.
                5. Extract materials, categories, and tags.
                
                Respond strictly in a structured JSON format following this schema:
                {
                   "detected_language": "...",
                   "raw_transcription": "...",
                   "title_en": "...",
                   "description_en": "...",
                   "title_hi": "...",
                   "description_hi": "...",
                   "materials": ["material1", "material2"],
                   "tags": ["tag1", "tag2"],
                   "category": "..."
                }
                """
                
                response = self.gemini_client.models.generate_content(
                    model=self.gemini_model,
                    contents=[types.Part.from_bytes(data=audio_bytes, mime_type=clean_mime), prompt],
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                
                data = json.loads(response.text)
                return ProductCatalog(**data)
                
            except Exception as e:
                print(f"[Cataloger] Gemini audio processing error: {e}. Checking backup providers...")

        # --- TIER 2: Try Groq Agent (Whisper + Groq LPU) ---
        if self.groq_client:
            try:
                ext_map = {
                    "audio/mp4": "m4a",
                    "audio/aac": "aac",
                    "audio/mp3": "mp3",
                    "audio/wav": "wav",
                    "audio/webm": "webm",
                    "audio/ogg": "ogg",
                }
                ext = ext_map.get(clean_mime, "wav")
                file_tuple = (f"artisan_voice.{ext}", audio_bytes, clean_mime)
                
                transcription_res = self.groq_client.audio.transcriptions.create(
                    file=file_tuple,
                    model=self.groq_whisper_model,
                    response_format="verbose_json"
                )
                
                transcribed_text = getattr(transcription_res, "text", "") or transcript_hint or ""
                detected_lang = getattr(transcription_res, "language", "Hindi")
                
                if transcribed_text.strip():
                    return self.generate_catalog_from_text(transcribed_text, regional_lang=detected_lang)
            except Exception as e:
                print(f"[Cataloger] Groq audio transcription fallback error: {e}")
        
        # --- TIER 3: Local Smart Heuristic Fallback ---
        seed = transcript_hint or "Traditional handcrafted artisan piece with natural materials"
        return self._generate_smart_catalog(seed, regional_lang="Hindi / Regional")

    def generate_catalog_from_text(self, description_text: str, regional_lang: str = "Hindi") -> ProductCatalog:
        """
        Takes raw text input in a regional language and translates/enriches it into a catalog with multi-tier failover.
        Tier 1: Google Gemini Flash
        Tier 2: Groq LPU Cloud
        Tier 3: Local Smart Heuristic
        """
        prompt = f"""
        You are an expert Virtual Business Manager for marginalized artisans.
        An artisan describes their product in {regional_lang} as follows:
        "{description_text}"
        
        Please create a structured product catalog matching this schema:
        - detected_language: {regional_lang}
        - raw_transcription: "{description_text}"
        - title_en: Professional catchy e-commerce title in English
        - description_en: SEO-friendly product description in English
        - title_hi: Professional catchy e-commerce title in Hindi
        - description_hi: SEO-friendly product description in Hindi
        - materials: List of raw materials (array of strings)
        - tags: 5-8 SEO tags (array of strings)
        - category: Best fitting category (Textiles, Handicrafts, Pottery, Jewelry, Paintings & Art, Woodwork)
        
        Respond strictly in JSON format matching the schema without markdown tags.
        """

        # --- TIER 1: Try Gemini Text ---
        if self.gemini_client:
            try:
                response = self.gemini_client.models.generate_content(
                    model=self.gemini_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(response_mime_type="application/json")
                )
                data = json.loads(response.text)
                return ProductCatalog(**data)
            except Exception as e:
                print(f"[Cataloger] Gemini text processing error ({e}). Trying Groq backup...")

        # --- TIER 2: Try Groq Backup ---
        if self.groq_client:
            try:
                completion = self.groq_client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a professional e-commerce product cataloger for Indian artisans. Always respond strictly in valid JSON format with keys: detected_language, raw_transcription, title_en, description_en, title_hi, description_hi, materials, tags, category."
                        },
                        {"role": "user", "content": prompt}
                    ],
                    model=self.groq_llm_model,
                    response_format={"type": "json_object"},
                    temperature=0.2
                )
                data = json.loads(completion.choices[0].message.content)
                data["detected_language"] = data.get("detected_language") or regional_lang
                data["raw_transcription"] = data.get("raw_transcription") or description_text
                return ProductCatalog(**data)
            except Exception as groq_err:
                print(f"[Cataloger] Groq text processing error: {groq_err}")

        # --- TIER 3: Local Smart Heuristics ---
        return self._generate_smart_catalog(description_text, regional_lang=regional_lang)

    def _generate_smart_catalog(self, user_text: str, regional_lang: str = "Hindi") -> ProductCatalog:
        """
        Dynamically analyzes what the artisan actually said/typed, extracts keywords, materials,
        determines the craft category, and constructs tailored English & Hindi listings.
        """
        text_lower = (user_text or "").lower()
        
        if any(w in text_lower for w in ["saree", "silk", "cotton", "shawl", "dupatta", "weave", "handloom", "साड़ी", "रेशम", "सूट", "शॉल", "बुनाई", "धागा", "कुर्ता"]):
            category = "Textiles"
            materials = ["Natural Cotton", "Pure Mulberry Silk", "Traditional Thread"]
            title_en = "Handcrafted Artisanal Silk & Cotton Textile"
            title_hi = "पारंपरिक हस्तनिर्मित सूती व रेशमी हथकरघा वस्त्र"
            desc_en = f"Authentic handloom textile woven with traditional heritage craftsmanship. Handcrafted with care: '{user_text}'."
            desc_hi = f"पारंपरिक बुनाई तकनीक से तैयार किया गया शुद्ध और प्रामाणिक हथकरघा उत्पाद। विवरण: '{user_text}'।"
            tags = ["handloom", "traditional weave", "artisan textile", "sustainable fashion", "indian craft", "handmade kurta"]

        elif any(w in text_lower for w in ["pottery", "clay", "terracotta", "vase", "ceramic", "मिट्टी", "बर्तन", "घड़ा", "फूलदान", "टेराकोटा"]):
            category = "Pottery"
            materials = ["Natural Terracotta Clay", "Organic Mineral Glaze"]
            title_en = "Handmade Natural Terracotta Clay Craft"
            title_hi = "पारंपरिक हस्तनिर्मित टेराकोटा मिट्टी की कलाकृति"
            desc_en = f"Hand-molded and kiln-fired by generational master potters using natural clay. Artisan description: '{user_text}'."
            desc_hi = f"प्राकृतिक मिट्टी से हाथ से गढ़ा गया पर्यावरण-अनुकूल उत्पाद। विवरण: '{user_text}'।"
            tags = ["terracotta", "pottery", "handmade clay", "eco friendly", "indian pottery", "home decor"]

        elif any(w in text_lower for w in ["wood", "wooden", "carving", "teak", "sheesham", "लकड़ी", "नक्काशी", "काष्ठ"]):
            category = "Woodwork"
            materials = ["Seasoned Teakwood", "Natural Lacquer Polish"]
            title_en = "Hand-Carved Heritage Wood Decor"
            title_hi = "हस्तनिर्मित काष्ठ नक्काशी कलाकृति"
            desc_en = f"Intricately carved from solid seasoned wood with traditional motifs: '{user_text}'."
            desc_hi = f"शुद्ध और मजबूत लकड़ी पर बारीक हस्त नक्काशी से तैयार की गई सुंदर कलाकृति। विवरण: '{user_text}'।"
            tags = ["wood carving", "teakwood", "handmade decor", "wooden craft", "heritage artifact"]

        elif any(w in text_lower for w in ["jewelry", "jewel", "necklace", "bangle", "silver", "brass", "माला", "आभूषण", "कंगन", "चांदी", "झुमके"]):
            category = "Jewelry"
            materials = ["Brass / Silver Alloy", "Beads", "Natural Thread"]
            title_en = "Handcrafted Ethnic Traditional Jewelry"
            title_hi = "हस्तनिर्मित पारंपरिक आभूषण"
            desc_en = f"Handcrafted ethnic jewelry design crafted with timeless tribal motifs. Artisan notes: '{user_text}'."
            desc_hi = f"पारंपरिक हस्तनिर्मित सुंदर आभूषण, विशिष्ट कारीगरी से युक्त। विवरण: '{user_text}'।"
            tags = ["ethnic jewelry", "handcrafted jewelry", "tribal jewelry", "brass craft", "festive wear"]

        elif any(w in text_lower for w in ["painting", "madhubani", "warli", "pattachitra", "art", "चित्र", "पेंटिंग", "मधुबनी", "कला"]):
            category = "Paintings & Art"
            materials = ["Handmade Canvas Paper", "Natural Organic Pigments"]
            title_en = "Traditional Indian Folk Art Painting"
            title_hi = "पारंपरिक भारतीय लोक चित्रकला (पेंटिंग)"
            desc_en = f"Authentic folk painting rendered with natural mineral and vegetable dyes: '{user_text}'."
            desc_hi = f"प्राकृतिक रंगों और पारंपरिक शैली में बनाई गई मनमोहक लोक चित्रकला। विवरण: '{user_text}'।"
            tags = ["folk painting", "madhubani", "traditional art", "canvas painting", "wall decor", "indian art"]

        else:
            category = "Handicrafts"
            materials = ["Natural Eco-friendly Materials", "Organic Fibers"]
            title_en = f"Handcrafted {user_text[:35].strip().title() if user_text else 'Artisan Creation'}"
            title_hi = f"हस्तनिर्मित पारंपरिक उत्पाद ({user_text[:30].strip() if user_text else 'कलाकृति'})"
            desc_en = f"Exquisite handcrafted creation made by skilled rural artisans using heritage techniques. Spoken description: '{user_text}'."
            desc_hi = f"पारंपरिक शिल्प कौशल और प्राकृतिक सामग्री से तैयार की गई सुंदर कलाकृति। विवरण: '{user_text}'।"
            tags = ["handcrafted", "artisanal", "made in india", "heritage craft", "sustainable decor", "vocal for local"]

        return ProductCatalog(
            detected_language=regional_lang,
            raw_transcription=user_text,
            title_en=title_en,
            description_en=desc_en,
            title_hi=title_hi,
            description_hi=desc_hi,
            materials=materials,
            tags=tags,
            category=category
        )
