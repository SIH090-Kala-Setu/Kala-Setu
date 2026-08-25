import os
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List, Optional

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
        # Retrieve the API key from environment variable
        self.api_key = os.getenv("GEMINI_API_KEY")
        if self.api_key:
            self.client = genai.Client(api_key=self.api_key)
            self.model_name = "gemini-1.5-flash"
        else:
            self.client = None

    def generate_catalog_from_audio(self, audio_bytes: bytes, mime_type: str = "audio/wav") -> ProductCatalog:
        """
        Transcribes the regional audio voice note, translates, and generates a structured product catalog
        in both English and Hindi.
        """
        if not self.client:
            return self._generate_mock_catalog("artisan voice note describing handloom cotton saree")

        try:
            # Upload/pass the audio bytes to Gemini
            # Note: Gemini 1.5 Flash supports raw audio bytes when wrapped properly or using the Files API
            # For simplicity and speed in API endpoints, we can pass it as inline data part
            audio_part = {
                "mime_type": mime_type,
                "data": audio_bytes
            }
            
            prompt = """
            You are an expert Virtual Business Manager for marginalized artisans, weavers, and micro-entrepreneurs.
            You will listen to the provided audio voice note of an artisan describing their handicraft/product in a regional Indian language.
            
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
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[types.Part.from_bytes(data=audio_bytes, mime_type=mime_type), prompt],
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            
            # Parse the JSON response
            data = json.loads(response.text)
            return ProductCatalog(**data)
            
        except Exception as e:
            # Fallback to mock catalog in case of API errors
            print(f"Error during Gemini processing: {e}")
            return self._generate_mock_catalog(f"Error processed audio fallback description. Details: {str(e)}")

    def generate_catalog_from_text(self, description_text: str, regional_lang: str = "Hindi") -> ProductCatalog:
        """
        Takes raw text input in a regional language and translates/enriches it into a catalog.
        """
        if not self.client:
            return self._generate_mock_catalog(description_text)

        try:
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
            - materials: List of raw materials
            - tags: 5-8 SEO tags
            - category: Best fitting category
            
            Respond strictly in JSON format matching the schema.
            """
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(response_mime_type="application/json")
            )
            
            data = json.loads(response.text)
            return ProductCatalog(**data)
        except Exception as e:
            print(f"Error during Gemini processing: {e}")
            return self._generate_mock_catalog(description_text)

    def _generate_mock_catalog(self, seed_text: str) -> ProductCatalog:
        """
        Generates realistic mock data in the absence of a configured Gemini API Key.
        """
        return ProductCatalog(
            detected_language="Hindi (Mock)",
            raw_transcription=seed_text,
            title_en="Handcrafted Terracotta Clay Water Bottle",
            description_en="Stay healthy and hydrated with our 100% natural, organic clay terracotta water bottle. Handmade by traditional pottery artisans, this eco-friendly clay bottle naturally cools water through evaporation. Perfect for daily use and helps retain natural minerals.",
            title_hi="हस्तनिर्मित मिट्टी की बोतल (टेराकोटा)",
            description_hi="हमारे 100% प्राकृतिक और जैविक टेराकोटा मिट्टी की पानी की बोतल से स्वस्थ रहें। पारंपरिक कुम्हारों द्वारा हस्तनिर्मित, यह पर्यावरण-अनुकूल बोतल पानी को प्राकृतिक रूप से ठंडा रखती है। दैनिक उपयोग के लिए सर्वोत्तम।",
            materials=["Terracotta Clay", "Organic Clay"],
            tags=["terracotta bottle", "clay bottle", "handicraft", "organic", "eco-friendly water bottle", "pottery"],
            category="Pottery & Handicrafts"
        )
