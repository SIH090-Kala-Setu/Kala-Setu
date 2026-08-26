from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status, Request
from fastapi.responses import StreamingResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Union
import io
import csv
from services.analytics_service import get_artisan_analytics
import uvicorn
import uuid
import datetime
from sqlalchemy.orm import Session

# Database and Security imports
from database import engine, get_db
import auth

import models
# Import our custom services
from services.image_processor import ImageProcessor
from services.cataloger import Cataloger, ProductCatalog
from services.pricing_assistant import PricingAssistant, PriceBreakdown

# Initialize database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Artisan AI Backend API",
    description="AI-driven backend for artisan studio cataloging, role dashboards, and B2B linkages.",
    version="2.0.0"
)

# Enable CORS for frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize service singletons
cataloger_service = Cataloger()
pricing_service = PricingAssistant()

# --- Pydantic Schemas ---
class PricingRequest(BaseModel):
    category: str
    material_cost: float
    manufacturing_hours: float
    product_description: str

class UserRegister(BaseModel):
    username: str
    password: str
    role: str  # Admin, Artisan, Buyer, Aggregator
    region: Optional[str] = None
    preferred_lang: Optional[str] = "Hindi"
    craft_type: Optional[str] = None
    aadhaar_number: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class UserResponse(BaseModel):
    id: Union[uuid.UUID, str, int]
    username: Optional[str] = None
    role: str
    region: Optional[str] = None
    preferred_lang: Optional[str] = "Hindi"
    craft_type: Optional[str] = None
    aadhaar_number: Optional[str] = None
    is_verified: bool
    phone_number: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    class Config:
        from_attributes = True

class ProductCreate(BaseModel):
    title_en: str
    title_hi: str
    description_en: str
    description_hi: str
    category: str
    materials: List[str]
    tags: List[str]
    retail_price: float
    b2b_price: float
    stock: int = 10
    image_url: Optional[str] = None
    artisan_name: Optional[str] = None
    artisan_coop: Optional[str] = None

class ProductResponse(BaseModel):
    id: Union[uuid.UUID, str, int]
    title_en: str
    title_hi: str
    description_en: Optional[str] = None
    description_hi: Optional[str] = None
    category: str
    materials: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    retail_price: float
    b2b_price: float
    stock: int
    status: str
    image_url: Optional[str] = None
    artisan_name: Optional[str] = None
    artisan_coop: Optional[str] = None
    artisan_id: Optional[Union[uuid.UUID, str, int]] = None
    class Config:
        from_attributes = True

class InquiryCreate(BaseModel):
    product_id: Union[uuid.UUID, str, int]
    buyer_name: str
    buyer_email: str
    quantity: int = 1
    notes: Optional[str] = None

class InquiryResponse(BaseModel):
    id: Union[uuid.UUID, str, int]
    product_id: Union[uuid.UUID, str, int]
    buyer_name: str
    buyer_email: str
    quantity: int
    notes: Optional[str] = None
    status: str
    product: Optional[ProductResponse] = None
    class Config:
        from_attributes = True

class NotificationCreate(BaseModel):
    title: str
    message: str
    target_role: str = "All"

class NotificationResponse(BaseModel):
    id: Union[uuid.UUID, str, int]
    title: str
    message: str
    target_role: str
    class Config:
        from_attributes = True

# --- New Dashboard Pydantic Schemas ---
class ClusterCreate(BaseModel):
    cluster_name: str
    state: str
    district: str
    craft_specialization: Optional[str] = None

class ClusterResponse(BaseModel):
    id: Union[uuid.UUID, str]
    cluster_name: str
    state: str
    district: str
    craft_specialization: Optional[str] = None
    aggregator_id: Optional[Union[uuid.UUID, str]] = None
    total_artisans: int
    created_at: datetime.datetime
    class Config:
        from_attributes = True

class VerificationReview(BaseModel):
    status: str  # Approved, Rejected
    rejection_reason: Optional[str] = None
    aadhaar_verified: bool = True
    bank_verified: bool = True

class GovtSchemeCreate(BaseModel):
    scheme_name: str
    description: str
    eligibility_criteria: Optional[str] = None
    application_url: Optional[str] = None
    valid_until: Optional[str] = None  # YYYY-MM-DD

class SchemeResponse(BaseModel):
    id: Union[uuid.UUID, str]
    scheme_name: str
    description: str
    eligibility_criteria: Optional[str] = None
    application_url: Optional[str] = None
    created_by: Optional[Union[uuid.UUID, str]] = None
    is_active: bool
    valid_until: Optional[datetime.date] = None
    created_at: datetime.datetime
    class Config:
        from_attributes = True

class SchemeAlertCreate(BaseModel):
    target_state: Optional[str] = None
    target_craft_type: Optional[str] = None

class ExhibitionCreate(BaseModel):
    name: str
    location: str
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD

class ExhibitionResponse(BaseModel):
    id: Union[uuid.UUID, str]
    name: str
    location: str
    status: str
    start_date: datetime.date
    end_date: datetime.date
    created_by: Optional[Union[uuid.UUID, str]] = None
    is_active: bool
    class Config:
        from_attributes = True

class ExhibitionRegistrationResponse(BaseModel):
    id: Union[uuid.UUID, str]
    exhibition_id: Union[uuid.UUID, str]
    artisan_id: Union[uuid.UUID, str]
    status: str
    registered_at: datetime.datetime
    class Config:
        from_attributes = True

# --- Model Mapper Helper Functions ---

def map_product_to_response(product) -> ProductResponse:
    if not product:
        return None
    # PostgreSQL
    image_url = None
    if product.images:
        primary_images = [img for img in product.images if img.is_primary]
        if primary_images:
            image_url = primary_images[0].enhanced_url or primary_images[0].original_url
        else:
            image_url = product.images[0].enhanced_url or product.images[0].original_url
        
    artisan_name = "Independent Artisan"
    artisan_coop = None
    if product.artisan:
        if product.artisan.user:
            artisan_name = product.artisan.user.full_name
        artisan_coop = product.artisan.cluster_name

    materials_list = []
    if product.material:
        materials_list = [m.strip() for m in product.material.split(",") if m.strip()]

    return ProductResponse(
        id=str(product.id),
        title_en=product.title_en,
        title_hi=product.title_hi,
        description_en=product.description_en,
        description_hi=product.description_hi,
        category=product.craft_category or "Handicrafts",
        materials=materials_list,
        tags=[],
        retail_price=float(product.base_price),
        b2b_price=float(product.suggested_price) if product.suggested_price else float(product.base_price * 0.85),
        stock=product.stock_count,
        status=product.status,
        image_url=image_url,
        artisan_name=artisan_name,
        artisan_coop=artisan_coop,
        artisan_id=str(product.artisan_id)
    )

def map_user_to_response(user) -> UserResponse:
    if not user:
        return None
    # PostgreSQL
    region = user.district or user.state
    preferred_lang = user.preferred_language
        
    craft_type = None
    aadhaar_number = None
    if user.artisan_profile:
        craft_type = user.artisan_profile.craft_type
        aadhaar_number = user.artisan_profile.aadhaar_number

    return UserResponse(
        id=str(user.id),
        username=user.username or user.phone_number,
        role=user.role,
        region=region,
        preferred_lang=preferred_lang,
        craft_type=craft_type,
        aadhaar_number=aadhaar_number,
        is_verified=user.is_verified,
        phone_number=user.phone_number,
        full_name=user.full_name,
        email=user.email,
        state=user.state,
        district=user.district
    )

def map_inquiry_to_response(inquiry) -> InquiryResponse:
    if not inquiry:
        return None
    # PostgreSQL
    buyer_name = "B2B Buyer"
    buyer_email = ""
    if inquiry.buyer:
        buyer_name = inquiry.buyer.full_name
        buyer_email = inquiry.buyer.email or ""

    return InquiryResponse(
        id=str(inquiry.id),
        product_id=str(inquiry.product_id),
        buyer_name=buyer_name,
        buyer_email=buyer_email,
        quantity=inquiry.quantity,
        notes=inquiry.message,
        status=inquiry.status,
        product=map_product_to_response(inquiry.product) if inquiry.product else None
    )

def map_notification_to_response(notification) -> NotificationResponse:
    if not notification:
        return None
    return NotificationResponse(
        id=str(notification.id),
        title=notification.title,
        message=notification.body,
        target_role="All"
    )

# --- Endpoints ---

@app.get("/")
def read_root():
    db_mode = "PostgreSQL"
    return {
        "message": "Welcome to Artisan AI API! Use /docs for API documentation.",
        "database_backend": db_mode
    }

# --- Legacy & AI Studio Core Routes ---

@app.post("/enhance", summary="AI Studio Background Removal & Lighting Correction")
async def enhance_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    try:
        raw_bytes = await file.read()
        enhanced_bytes = ImageProcessor.process_artisan_image(raw_bytes)
        
        return StreamingResponse(
            io.BytesIO(enhanced_bytes),
            media_type="image/png",
            headers={"Content-Disposition": f"attachment; filename=enhanced_{file.filename.split('.')[0]}.png"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image enhancement failed: {str(e)}")

@app.post("/catalog", response_model=ProductCatalog, summary="Multilingual Catalog Generator")
async def generate_catalog(
    audio: UploadFile = File(None),
    text_desc: str = Form(None),
    lang: str = Form("Hindi")
):
    if audio:
        try:
            audio_bytes = await audio.read()
            mime_type = audio.content_type or "audio/wav"
            catalog = cataloger_service.generate_catalog_from_audio(audio_bytes, mime_type=mime_type)
            return catalog
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Voice cataloging failed: {str(e)}")
    elif text_desc:
        try:
            catalog = cataloger_service.generate_catalog_from_text(text_desc, regional_lang=lang)
            return catalog
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Text cataloging failed: {str(e)}")
    else:
        raise HTTPException(
            status_code=400, 
            detail="Either a regional audio voice note or a text description must be provided."
        )

@app.post("/suggest-price", response_model=PriceBreakdown, summary="Dynamic Pricing Assistant")
def suggest_price(request: PricingRequest):
    try:
        breakdown = pricing_service.calculate_suggested_price(
            category=request.category,
            material_cost=request.material_cost,
            manufacturing_hours=request.manufacturing_hours,
            product_description=request.product_description
        )
        return breakdown
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pricing suggestions failed: {str(e)}")

# --- Authentication Endpoints ---

@app.post("/auth/register", response_model=UserResponse)
def register_user(user: UserRegister, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        (models.User.username == user.username) | 
        (models.User.phone_number == user.username)
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="User already registered")
    
    hashed_pwd = auth.hash_password(user.password)
    is_verified = user.role in ["Buyer", "Aggregator", "Admin"]
    
    # PostgreSQL
    phone = user.aadhaar_number[-10:] if (user.aadhaar_number and len(user.aadhaar_number) >= 10) else f"98765{str(uuid.uuid4().int)[:10]}"
    if user.username.isdigit() and len(user.username) >= 10:
        phone = user.username
        
    new_user = models.User(
        username=user.username,
        phone_number=phone,
        full_name=user.username.capitalize(),
        email=f"{user.username}@artisan.ai",
        password_hash=hashed_pwd,
        role=user.role,
        preferred_language=user.preferred_lang,
        state=user.region or "Uttar Pradesh",
        district="Varanasi",
        is_verified=is_verified
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Automatically create ArtisanProfile for Artisan role
    if user.role == "Artisan":
        profile = models.ArtisanProfile(
            user_id=new_user.id,
            craft_type=user.craft_type or "Handicrafts",
            cluster_name="Independent Cooperative",
            aadhaar_number=user.aadhaar_number or str(uuid.uuid4().int)[:12],
            bank_account="000000000000",
            ifsc_code="SBIN0000001",
            upi_id=f"{new_user.username}@upi",
            govt_scheme_beneficiary=False
        )
        db.add(profile)
            
        # Create a pending verification record
        verification = models.ArtisanVerification(
            artisan_id=new_user.id,
            status="Pending",
            aadhaar_verified=False,
            bank_verified=False
        )
        db.add(verification)
            
        db.commit()
        db.refresh(new_user)
            
    return map_user_to_response(new_user)

@app.post("/auth/login", response_model=TokenResponse)
def login_user(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(
        (models.User.username == user.username) | 
        (models.User.phone_number == user.username)
    ).first()
    if not db_user or not auth.verify_password(user.password, db_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    # Update last login for Admin User if applicable
    if db_user.role == "Admin" and db_user.admin_profile:
        db_user.admin_profile.last_login = datetime.datetime.utcnow()
        db.commit()
        
    access_token = auth.create_access_token(data={"sub": db_user.username or db_user.phone_number})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": db_user.role,
        "username": db_user.username or db_user.phone_number
    }

@app.get("/auth/me", response_model=UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return map_user_to_response(current_user)

# --- Product Catalog & Database Routes ---

@app.get("/products", response_model=List[ProductResponse])
def get_products(
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(models.Product)
    # PostgreSQL
    if category and category != "all" and category != "All":
        query = query.filter(models.Product.craft_category == category)
    if search:
        query = query.filter(
            (models.Product.title_en.contains(search)) | 
            (models.Product.title_hi.contains(search)) | 
            (models.Product.description_en.contains(search))
        )
            
    products_list = query.order_by(models.Product.id.desc()).all()
    return [map_product_to_response(p) for p in products_list]

@app.post("/products", response_model=ProductResponse)
def create_product(
    product: ProductCreate, 
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    artisan_id = current_user.id if current_user else None
    artisan_name = current_user.username if current_user else "Independent Artisan"
    
    # PostgreSQL
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required to list products.")
            
    # Get or create ArtisanProfile for PostgreSQL
    profile = db.query(models.ArtisanProfile).filter(models.ArtisanProfile.user_id == current_user.id).first()
    if not profile:
        profile = models.ArtisanProfile(
            user_id=current_user.id,
            craft_type=product.category,
            cluster_name=product.artisan_coop or "Independent Cooperative",
            aadhaar_number=str(uuid.uuid4().int)[:12]
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
            
    new_product = models.Product(
        artisan_id=profile.id,
        title_en=product.title_en,
        title_hi=product.title_hi,
        description_en=product.description_en,
        description_hi=product.description_hi,
        craft_category=product.category,
        material=",".join(product.materials),
        base_price=product.retail_price,
        suggested_price=product.b2b_price,
        stock_count=product.stock,
        status="Active" if current_user.is_verified else "Pending Review"
    )
    db.add(new_product)
    db.commit()
    db.refresh(new_product)
        
    # Link image to images table
    if product.image_url:
        prod_img = models.ProductImage(
            product_id=new_product.id,
            original_url=product.image_url,
            enhanced_url=product.image_url,
            is_primary=True
        )
        db.add(prod_img)
        db.commit()
        db.refresh(new_product)
            
    return map_product_to_response(new_product)

@app.put("/products/{product_id}", response_model=ProductResponse)
def update_product_status(
    product_id: str, 
    status: str = Form(...), 
    db: Session = Depends(get_db)
):
    product = db.query(models.Product).filter(models.Product.id == uuid.UUID(product_id)).first()
        
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.status = status
    db.commit()
    db.refresh(product)
    return map_product_to_response(product)

# --- Inquiry Routes ---

@app.post("/inquiries", response_model=InquiryResponse)
def create_inquiry(
    inquiry: InquiryCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_current_user)
):
    if current_user and current_user.role == "Buyer" and not current_user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Your buyer account is pending admin verification before you can contact artisans."
        )
    product = db.query(models.Product).filter(models.Product.id == uuid.UUID(str(inquiry.product_id))).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # PostgreSQL
    # Map or find default buyer in PostgreSQL users
    buyer = db.query(models.User).filter(models.User.role == "Buyer").first()
    if not buyer:
        # Create a mock buyer
        buyer = models.User(
            username=inquiry.buyer_name.lower().replace(" ", ""),
            phone_number=f"90000{str(uuid.uuid4().int)[:5]}",
            full_name=inquiry.buyer_name,
            email=inquiry.buyer_email,
            role="Buyer"
        )
        db.add(buyer)
        db.commit()
        db.refresh(buyer)
            
    # Get artisan user id
    artisan_user_id = product.artisan.user_id
        
    new_inquiry = models.BuyerInquiry(
        product_id=product.id,
        buyer_id=buyer.id,
        artisan_id=artisan_user_id,
        quantity=inquiry.quantity,
        message=inquiry.notes,
        status="Pending"
    )
    db.add(new_inquiry)
        
    new_notification = models.Notification(
        user_id=artisan_user_id,
        title="New Bulk Inquiry",
        body=f"Buyer {inquiry.buyer_name} requested {inquiry.quantity} pcs of '{product.title_en}'",
        type="Inquiry"
    )
    db.add(new_notification)
        
    db.commit()
    db.refresh(new_inquiry)
    return map_inquiry_to_response(new_inquiry)

@app.get("/inquiries", response_model=List[InquiryResponse])
def get_inquiries(db: Session = Depends(get_db)):
    inqs = db.query(models.BuyerInquiry).all()
    return [map_inquiry_to_response(i) for i in inqs]

# --- Notifications & Admin Oversight ---

@app.get("/notifications", response_model=List[NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    notis = db.query(models.Notification).order_by(models.Notification.sent_at.desc()).all()
    return [map_notification_to_response(n) for n in notis]

@app.post("/notifications", response_model=NotificationResponse)
def create_notification(notification: NotificationCreate, db: Session = Depends(get_db)):
    # Link notification to first user or all users in PostgreSQL
    user = db.query(models.User).first()
    if not user:
        raise HTTPException(status_code=400, detail="No users exist in DB to target.")
    new_noti = models.Notification(
        user_id=user.id,
        title=notification.title,
        body=notification.message,
        type="System"
    )
    db.add(new_noti)
        
    db.commit()
    db.refresh(new_noti)
    return map_notification_to_response(new_noti)

@app.get("/admin/users", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    users_list = db.query(models.User).all()
    return [map_user_to_response(u) for u in users_list]

@app.post("/admin/verify-artisan/{user_id}", response_model=UserResponse)
def verify_artisan(user_id: str, verify: bool = Form(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == uuid.UUID(user_id)).first()
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.is_verified = verify
    
    # Create or update verification record
    verification = db.query(models.ArtisanVerification).filter(models.ArtisanVerification.artisan_id == user.id).first()
    if verification:
        verification.status = "Approved" if verify else "Rejected"
        verification.reviewed_at = datetime.datetime.utcnow()
        verification.aadhaar_verified = verify
        verification.bank_verified = verify
    else:
        verification = models.ArtisanVerification(
            artisan_id=user.id,
            status="Approved" if verify else "Rejected",
            reviewed_at=datetime.datetime.utcnow(),
            aadhaar_verified=verify,
            bank_verified=verify
        )
        db.add(verification)
            
    db.commit()
    db.refresh(user)
    return map_user_to_response(user)

@app.get("/admin/analytics")
def get_admin_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
    from sqlalchemy import func

    # --- Artisans ---
    total_artisans = db.query(models.User).filter(models.User.role == "Artisan").count()
    verified_artisans_count = db.query(models.User).filter(
        models.User.role == "Artisan", models.User.is_verified == True
    ).count()
    pending_verifications_count = db.query(models.ArtisanVerification).filter(
        models.ArtisanVerification.status == "Pending"
    ).count()

    # --- Buyers ---
    buyers_count = db.query(models.User).filter(models.User.role == "Buyer").count()
    verified_buyers_count = db.query(models.User).filter(
        models.User.role == "Buyer", models.User.is_verified == True
    ).count()

    # --- Clusters ---
    clusters_count = db.query(models.Cluster).count()

    # --- Products ---
    total_products = db.query(models.Product).count()
    active_products_count = db.query(models.Product).filter(
        models.Product.status == "Active"
    ).count()
    pending_moderation_count = db.query(models.Product).filter(
        models.Product.status == "Pending Review"
    ).count()
    avg_price_row = db.query(func.avg(models.Product.base_price)).filter(
        models.Product.status == "Active"
    ).scalar()
    avg_product_price = float(avg_price_row) if avg_price_row else 0.0

    # --- Inquiries & Sales ---
    total_inquiries = db.query(models.BuyerInquiry).count()
    inquiries = db.query(models.BuyerInquiry).all()
    estimated_sales = 0.0
    for inq in inquiries:
        if inq.product:
            estimated_sales += inq.quantity * float(
                inq.product.suggested_price or inq.product.base_price * 0.85
            )

    # --- Regional breakdown (artisans by state) ---
    regional_rows = (
        db.query(models.User.state, func.count(models.User.id))
        .filter(models.User.role == "Artisan", models.User.state != None)
        .group_by(models.User.state)
        .order_by(func.count(models.User.id).desc())
        .all()
    )
    regional_breakdown = [{"state": r[0], "artisan_count": r[1]} for r in regional_rows]

    # --- Cluster breakdown (products per cluster) ---
    cluster_rows = (
        db.query(models.Cluster.cluster_name, func.count(models.Product.id))
        .join(models.ArtisanProfile, models.ArtisanProfile.cluster_name == models.Cluster.cluster_name)
        .join(models.Product, models.Product.artisan_id == models.ArtisanProfile.id)
        .filter(models.Product.status == "Active")
        .group_by(models.Cluster.cluster_name)
        .order_by(func.count(models.Product.id).desc())
        .limit(10)
        .all()
    )
    cluster_breakdown = [{"cluster_name": r[0], "active_products": r[1]} for r in cluster_rows]

    return {
        "artisans_count": total_artisans,
        "verified_artisans_count": verified_artisans_count,
        "pending_verifications_count": pending_verifications_count,
        "buyers_count": buyers_count,
        "verified_buyers_count": verified_buyers_count,
        "clusters_count": clusters_count,
        "products_count": total_products,
        "active_products_count": active_products_count,
        "pending_moderation_count": pending_moderation_count,
        "avg_product_price": round(avg_product_price, 2),
        "inquiries_count": total_inquiries,
        "estimated_sales_value": round(estimated_sales, 2),
        "regional_breakdown": regional_breakdown,
        "cluster_breakdown": cluster_breakdown,
    }

# --- New Dashboard & API Routes (PostgreSQL Only) ---

@app.get("/clusters", response_model=List[ClusterResponse])
def get_clusters(db: Session = Depends(get_db)):
    clusters = db.query(models.Cluster).all()
    return clusters

@app.post("/clusters", response_model=ClusterResponse)
def create_cluster(
    cluster: ClusterCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role not in ["Aggregator", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Aggregators or Admins can register clusters.")
        
    new_cluster = models.Cluster(
        cluster_name=cluster.cluster_name,
        state=cluster.state,
        district=cluster.district,
        craft_specialization=cluster.craft_specialization,
        aggregator_id=current_user.id
    )
    db.add(new_cluster)
    db.commit()
    db.refresh(new_cluster)
    return new_cluster

@app.get("/clusters/my-clusters", response_model=List[ClusterResponse])
def get_my_clusters(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Aggregator":
        raise HTTPException(status_code=403, detail="Only Aggregators can view their managed clusters.")
        
    clusters = db.query(models.Cluster).filter(models.Cluster.aggregator_id == current_user.id).all()
    return clusters

@app.post("/clusters/{cluster_id}/artisans", response_model=UserResponse)
def add_artisan_to_cluster(
    cluster_id: str,
    artisan_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role not in ["Aggregator", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Aggregators or Admins can manage cluster members.")
        
    cluster = db.query(models.Cluster).filter(models.Cluster.id == uuid.UUID(cluster_id)).first()
    artisan = db.query(models.User).filter(models.User.id == uuid.UUID(artisan_id), models.User.role == "Artisan").first()
    
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")
    if not artisan:
        raise HTTPException(status_code=404, detail="Artisan user not found")
        
    # Check if already in cluster
    existing = db.query(models.ClusterArtisan).filter(
        models.ClusterArtisan.cluster_id == cluster.id,
        models.ClusterArtisan.artisan_id == artisan.id
    ).first()
    
    if not existing:
        cluster_art = models.ClusterArtisan(
            cluster_id=cluster.id,
            artisan_id=artisan.id
        )
        db.add(cluster_art)
        
        # Increment cluster count
        cluster.total_artisans += 1
        
        # Link cluster_name in ArtisanProfile if exists
        if artisan.artisan_profile:
            artisan.artisan_profile.cluster_name = cluster.cluster_name
            
        db.commit()
        db.refresh(artisan)
        
    return map_user_to_response(artisan)

@app.get("/clusters/{cluster_id}/artisans", response_model=List[UserResponse])
def get_cluster_artisans(cluster_id: str, db: Session = Depends(get_db)):
    members = db.query(models.ClusterArtisan).filter(models.ClusterArtisan.cluster_id == uuid.UUID(cluster_id)).all()
    artisans = [m.artisan for m in members if m.artisan]
    return [map_user_to_response(a) for a in artisans]

@app.get("/admin/verifications")
def get_verifications(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
        
    query = db.query(models.ArtisanVerification)
    if status_filter:
        query = query.filter(models.ArtisanVerification.status == status_filter)
    verifications = query.order_by(models.ArtisanVerification.submitted_at.desc()).all()
    results = []
    for v in verifications:
        artisan = v.artisan
        profile = artisan.artisan_profile if artisan else None
        results.append({
            "id": str(v.id),
            "artisan_id": str(v.artisan_id),
            "artisan_name": artisan.full_name if artisan else "Unknown",
            "phone_number": artisan.phone_number if artisan else "N/A",
            "email": artisan.email if artisan else None,
            "state": artisan.state if artisan else None,
            "district": artisan.district if artisan else None,
            "craft_type": profile.craft_type if profile else None,
            "aadhaar_number": profile.aadhaar_number if profile else None,
            "cluster_name": profile.cluster_name if profile else None,
            "status": v.status,
            "rejection_reason": v.rejection_reason,
            "aadhaar_verified": v.aadhaar_verified,
            "bank_verified": v.bank_verified,
            "submitted_at": v.submitted_at,
            "reviewed_at": v.reviewed_at,
            "reviewed_by_name": v.reviewer.full_name if v.reviewer else None,
        })
    return results

@app.post("/admin/verifications/{verification_id}/review", response_model=UserResponse)
def review_verification(
    verification_id: str,
    review: VerificationReview,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
        
    verification = db.query(models.ArtisanVerification).filter(models.ArtisanVerification.id == uuid.UUID(verification_id)).first()
    if not verification:
        raise HTTPException(status_code=404, detail="Verification record not found.")
        
    verification.status = review.status
    verification.rejection_reason = review.rejection_reason
    verification.aadhaar_verified = review.aadhaar_verified
    verification.bank_verified = review.bank_verified
    verification.reviewed_by = current_user.id
    verification.reviewed_at = datetime.datetime.utcnow()
    
    # Update main user verification status
    verification.artisan.is_verified = (review.status == "Approved")
    
    # Audit trail
    log = models.AuditLog(
        admin_id=current_user.admin_profile.id if current_user.admin_profile else None,
        action=f"Reviewed artisan verification: {review.status}",
        entity_type="ArtisanVerification",
        entity_id=verification.id,
        change_snapshot={"status": review.status, "rejection_reason": review.rejection_reason}
    )
    db.add(log)
    
    db.commit()
    db.refresh(verification.artisan)
    return map_user_to_response(verification.artisan)

@app.post("/admin/schemes", response_model=SchemeResponse)
def create_govt_scheme(
    scheme: GovtSchemeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
        
    valid_date = None
    if scheme.valid_until:
        valid_date = datetime.datetime.strptime(scheme.valid_until, "%Y-%m-%d").date()
        
    new_scheme = models.GovtScheme(
        scheme_name=scheme.scheme_name,
        description=scheme.description,
        eligibility_criteria=scheme.eligibility_criteria,
        application_url=scheme.application_url,
        created_by=current_user.id,
        valid_until=valid_date
    )
    db.add(new_scheme)
    db.commit()
    db.refresh(new_scheme)
    return new_scheme

@app.get("/admin/schemes", response_model=List[SchemeResponse])
def list_govt_schemes(db: Session = Depends(get_db)):
    schemes = db.query(models.GovtScheme).all()
    return schemes

@app.post("/admin/schemes/{scheme_id}/alert")
def broadcast_scheme_alert(
    scheme_id: str,
    alert_spec: SchemeAlertCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
        
    scheme = db.query(models.GovtScheme).filter(models.GovtScheme.id == uuid.UUID(scheme_id)).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Government scheme not found.")
        
    # Find matching artisan users
    query = db.query(models.User).filter(models.User.role == "Artisan")
    if alert_spec.target_state:
        query = query.filter(models.User.state == alert_spec.target_state)
        
    # Filter by craft type in profile if spec is provided
    artisans = query.all()
    if alert_spec.target_craft_type:
        artisans = [a for a in artisans if a.artisan_profile and a.artisan_profile.craft_type == alert_spec.target_craft_type]
        
    # Send notification to all matching artisans
    for artisan in artisans:
        notification = models.Notification(
            user_id=artisan.id,
            title=f"New Government Scheme: {scheme.scheme_name}",
            body=f"You may be eligible for '{scheme.scheme_name}'. Description: {scheme.description[:100]}...",
            type="Update"
        )
        db.add(notification)
        
    # Save alert log
    alert_log = models.SchemeAlert(
        scheme_id=scheme.id,
        sent_by=current_user.id,
        target_state=alert_spec.target_state,
        target_craft_type=alert_spec.target_craft_type,
        recipients_count=len(artisans)
    )
    db.add(alert_log)
    db.commit()
    
    return {
        "message": f"Successfully broadcasted scheme alerts to {len(artisans)} artisans.",
        "recipients_count": len(artisans)
    }

@app.post("/admin/exhibitions", response_model=ExhibitionResponse)
def create_exhibition(
    exhib: ExhibitionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
        
    start_date = datetime.datetime.strptime(exhib.start_date, "%Y-%m-%d").date()
    end_date = datetime.datetime.strptime(exhib.end_date, "%Y-%m-%d").date()
    
    new_exhib = models.Exhibition(
        name=exhib.name,
        location=exhib.location,
        status="Upcoming",
        start_date=start_date,
        end_date=end_date,
        created_by=current_user.id
    )
    db.add(new_exhib)
    db.commit()
    db.refresh(new_exhib)
    return new_exhib

@app.get("/admin/exhibitions", response_model=List[ExhibitionResponse])
def get_exhibitions(db: Session = Depends(get_db)):
    exhibs = db.query(models.Exhibition).all()
    return exhibs

@app.post("/admin/exhibitions/{exhibition_id}/register", response_model=ExhibitionRegistrationResponse)
def register_for_exhibition(
    exhibition_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Artisan":
        raise HTTPException(status_code=403, detail="Only Artisans can register for exhibitions.")
        
    exhibition = db.query(models.Exhibition).filter(models.Exhibition.id == uuid.UUID(exhibition_id)).first()
    if not exhibition:
        raise HTTPException(status_code=404, detail="Exhibition not found.")
        
    # Check if already registered
    existing = db.query(models.ExhibitionRegistration).filter(
        models.ExhibitionRegistration.exhibition_id == exhibition.id,
        models.ExhibitionRegistration.artisan_id == current_user.id
    ).first()
    
    if existing:
        return existing
        
    reg = models.ExhibitionRegistration(
        exhibition_id=exhibition.id,
        artisan_id=current_user.id,
        status="Pending"
    )
    db.add(reg)
    db.commit()
    db.refresh(reg)
    return reg

@app.get("/admin/exhibitions/{exhibition_id}/registrations", response_model=List[ExhibitionRegistrationResponse])
def get_exhibition_registrations(exhibition_id: str, db: Session = Depends(get_db)):
    regs = db.query(models.ExhibitionRegistration).filter(models.ExhibitionRegistration.exhibition_id == uuid.UUID(exhibition_id)).all()
    return regs

@app.post("/admin/exhibitions/registrations/{registration_id}/status")
def review_exhibition_registration(
    registration_id: str,
    status: str = Form(...),  # Approved, Rejected
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
        
    reg = db.query(models.ExhibitionRegistration).filter(models.ExhibitionRegistration.id == uuid.UUID(registration_id)).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Registration record not found.")
        
    reg.status = status
    
    # Notify artisan
    noti = models.Notification(
        user_id=reg.artisan_id,
        title=f"Exhibition Registration {status}",
        body=f"Your registration status for exhibition '{reg.exhibition.name}' has been updated to {status}.",
        type="Update"
    )
    db.add(noti)
    db.commit()
    return {"message": "Registration updated successfully.", "status": status}

@app.get("/admin/audit-logs")
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
        
    logs = db.query(models.AuditLog).order_by(models.AuditLog.created_at.desc()).all()
    results = []
    for log in logs:
        results.append({
            "id": str(log.id),
            "admin_name": log.admin.user.full_name if (log.admin and log.admin.user) else "System",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": str(log.entity_id) if log.entity_id else None,
            "change_snapshot": log.change_snapshot,
            "created_at": log.created_at
        })
    return results


# =============================================================================
# FEATURE 5 -- Product Listing Moderation
# =============================================================================

class ProductModerateRequest(BaseModel):
    status: str  # Active or Archived
    reason: Optional[str] = None

@app.get("/admin/products/flagged", response_model=List[ProductResponse])
def get_flagged_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
    products = db.query(models.Product).filter(
        models.Product.status == "Pending Review"
    ).order_by(models.Product.created_at.asc()).all()
    return [map_product_to_response(p) for p in products]

@app.post("/admin/products/{product_id}/moderate", response_model=ProductResponse)
def moderate_product(
    product_id: str,
    req: ProductModerateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
    if req.status not in ["Active", "Archived"]:
        raise HTTPException(status_code=400, detail="status must be Active or Archived.")
    product = db.query(models.Product).filter(models.Product.id == uuid.UUID(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    product.status = req.status
    db.add(models.AuditLog(
        admin_id=current_user.admin_profile.id if current_user.admin_profile else None,
        action=f"Product moderation: set to {req.status}",
        entity_type="Product", entity_id=product.id,
        change_snapshot={"status": req.status, "reason": req.reason}
    ))
    artisan_user_id = product.artisan.user_id if product.artisan else None
    if artisan_user_id:
        body = (
            f"Your listing '{product.title_en}' has been approved and is now live."
            if req.status == "Active"
            else f"Your listing '{product.title_en}' was not approved. Reason: {req.reason or 'Quality standards not met.'}"
        )
        db.add(models.Notification(user_id=artisan_user_id, title=f"Listing {req.status}", body=body, type="Verification"))
    db.commit()
    db.refresh(product)
    return map_product_to_response(product)


# =============================================================================
# FEATURE 7 -- B2B Buyer Verification
# =============================================================================

@app.get("/admin/buyers")
def get_all_buyers(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
    buyers = db.query(models.User).filter(models.User.role == "Buyer").all()
    return [
        {
            "id": str(b.id),
            "full_name": b.full_name,
            "username": b.username,
            "email": b.email,
            "phone_number": b.phone_number,
            "state": b.state,
            "is_verified": b.is_verified,
            "created_at": b.created_at,
            "inquiries_sent": len(b.sent_inquiries)
        }
        for b in buyers
    ]

@app.post("/admin/buyers/{buyer_id}/verify")
def verify_buyer(
    buyer_id: str,
    verify: bool = True,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
    buyer = db.query(models.User).filter(
        models.User.id == uuid.UUID(buyer_id),
        models.User.role == "Buyer"
    ).first()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer not found.")
    buyer.is_verified = verify
    db.add(models.AuditLog(
        admin_id=current_user.admin_profile.id if current_user.admin_profile else None,
        action=f"Buyer {'verified' if verify else 'unverified'}",
        entity_type="User", entity_id=buyer.id,
        change_snapshot={"is_verified": verify}
    ))
    db.add(models.Notification(
        user_id=buyer.id,
        title="Account Verified" if verify else "Verification Revoked",
        body="Your buyer account has been verified." if verify else "Your verification was revoked.",
        type="Update"
    ))
    db.commit()
    return {"message": f"Buyer {'verified' if verify else 'unverified'} successfully.", "is_verified": verify}


# =============================================================================
# FEATURE 2 -- Cluster Performance Stats
# =============================================================================

@app.get("/admin/clusters/{cluster_id}/stats")
def get_cluster_stats(
    cluster_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role not in ["Admin", "Aggregator"]:
        raise HTTPException(status_code=403, detail="Admin or Aggregator access required.")
    cluster = db.query(models.Cluster).filter(models.Cluster.id == uuid.UUID(cluster_id)).first()
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found.")
    member_ids = [m.artisan_id for m in cluster.artisans]
    verified = (
        db.query(models.User).filter(
            models.User.id.in_(member_ids), models.User.is_verified == True
        ).count()
        if member_ids else 0
    )
    profile_ids = (
        [r[0] for r in db.query(models.ArtisanProfile.id).filter(
            models.ArtisanProfile.user_id.in_(member_ids)
        ).all()]
        if member_ids else []
    )
    active_p = (
        db.query(models.Product).filter(
            models.Product.artisan_id.in_(profile_ids),
            models.Product.status == "Active"
        ).count()
        if profile_ids else 0
    )
    inquiries = (
        db.query(models.BuyerInquiry).join(
            models.Product, models.BuyerInquiry.product_id == models.Product.id
        ).filter(models.Product.artisan_id.in_(profile_ids)).count()
        if profile_ids else 0
    )
    return {
        "cluster_id": str(cluster.id),
        "cluster_name": cluster.cluster_name,
        "state": cluster.state,
        "district": cluster.district,
        "craft_specialization": cluster.craft_specialization,
        "total_artisans": len(member_ids),
        "verified_artisans": verified,
        "active_product_listings": active_p,
        "total_buyer_inquiries": inquiries
    }


# =============================================================================
# FEATURE 3 -- Exhibition Status & Enriched Registrations
# =============================================================================

@app.put("/admin/exhibitions/{exhibition_id}/status")
def update_exhibition_status(
    exhibition_id: str,
    status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
    valid = ["Upcoming", "Ongoing", "Completed", "Cancelled"]
    if status not in valid:
        raise HTTPException(status_code=400, detail=f"status must be one of: {valid}")
    exhib = db.query(models.Exhibition).filter(models.Exhibition.id == uuid.UUID(exhibition_id)).first()
    if not exhib:
        raise HTTPException(status_code=404, detail="Exhibition not found.")
    exhib.status = status
    if status in ["Completed", "Cancelled"]:
        exhib.is_active = False
    db.commit()
    return {"message": f"Status updated to {status!r}.", "exhibition_id": exhibition_id}

@app.get("/admin/exhibitions/{exhibition_id}/registrations/detailed")
def get_exhibition_registrations_detailed(
    exhibition_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
    exhib = db.query(models.Exhibition).filter(models.Exhibition.id == uuid.UUID(exhibition_id)).first()
    if not exhib:
        raise HTTPException(status_code=404, detail="Exhibition not found.")
    results = []
    for reg in exhib.registrations:
        artisan = reg.artisan
        profile = artisan.artisan_profile if artisan else None
        results.append({
            "registration_id": str(reg.id),
            "artisan_id": str(reg.artisan_id),
            "artisan_name": artisan.full_name if artisan else "Unknown",
            "phone_number": artisan.phone_number if artisan else None,
            "email": artisan.email if artisan else None,
            "craft_type": profile.craft_type if profile else None,
            "state": artisan.state if artisan else None,
            "status": reg.status,
            "registered_at": reg.registered_at
        })
    return {"exhibition": exhib.name, "location": exhib.location, "registrations": results}


# =============================================================================
# FEATURE 4 -- Govt Scheme Edit + Alert History
# =============================================================================

class SchemeUpdate(BaseModel):
    scheme_name: Optional[str] = None
    description: Optional[str] = None
    eligibility_criteria: Optional[str] = None
    application_url: Optional[str] = None
    valid_until: Optional[str] = None
    is_active: Optional[bool] = None

@app.put("/admin/schemes/{scheme_id}", response_model=SchemeResponse)
def update_govt_scheme(
    scheme_id: str,
    updates: SchemeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
    scheme = db.query(models.GovtScheme).filter(models.GovtScheme.id == uuid.UUID(scheme_id)).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found.")
    if updates.scheme_name is not None:
        scheme.scheme_name = updates.scheme_name
    if updates.description is not None:
        scheme.description = updates.description
    if updates.eligibility_criteria is not None:
        scheme.eligibility_criteria = updates.eligibility_criteria
    if updates.application_url is not None:
        scheme.application_url = updates.application_url
    if updates.is_active is not None:
        scheme.is_active = updates.is_active
    if updates.valid_until is not None:
        scheme.valid_until = datetime.datetime.strptime(updates.valid_until, "%Y-%m-%d").date()
    db.commit()
    db.refresh(scheme)
    return scheme

@app.get("/admin/schemes/{scheme_id}/alerts")
def get_scheme_alert_history(
    scheme_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    if not current_user or current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Admin authorization required.")
    scheme = db.query(models.GovtScheme).filter(models.GovtScheme.id == uuid.UUID(scheme_id)).first()
    if not scheme:
        raise HTTPException(status_code=404, detail="Scheme not found.")
    return [
        {
            "alert_id": str(a.id),
            "sent_by": a.sender.full_name if a.sender else "System",
            "target_state": a.target_state,
            "target_craft_type": a.target_craft_type,
            "recipients_count": a.recipients_count,
            "sent_at": a.sent_at
        }
        for a in scheme.alerts
    ]

# ===== ARTISAN DASHBOARD & PROFILE ENDPOINTS =====

@app.get("/artisan/dashboard")
def get_artisan_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Artisan dashboard — summary cards for listings, inquiries, notifications."""
    profile = db.query(models.ArtisanProfile).filter(
        models.ArtisanProfile.user_id == current_user.id
    ).first()

    if not profile:
        raise HTTPException(status_code=404, detail="Artisan profile not found.")

    analytics = get_artisan_analytics(str(profile.id), db)

    pending_inquiries = db.query(models.BuyerInquiry).filter(
        models.BuyerInquiry.artisan_id == current_user.id,
        models.BuyerInquiry.status == "Pending"
    ).count()

    unread_notifications = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).count()

    exhibition_regs = db.query(models.ExhibitionRegistration).filter(
        models.ExhibitionRegistration.artisan_id == current_user.id
    ).order_by(models.ExhibitionRegistration.registered_at.desc()).limit(3).all()

    upcoming_exhibitions = []
    for reg in exhibition_regs:
        ex = db.query(models.Exhibition).filter(models.Exhibition.id == reg.exhibition_id).first()
        if ex:
            upcoming_exhibitions.append({
                "id": str(ex.id),
                "name": ex.name,
                "location": ex.location,
                "start_date": str(ex.start_date),
                "reg_status": reg.status
            })

    return {
        "artisan_name": current_user.full_name,
        "craft_type": profile.craft_type,
        "is_verified": current_user.is_verified,
        "preferred_language": current_user.preferred_language,
        "total_listings": analytics["total_listings"],
        "active_listings": analytics["active_listings"],
        "pending_listings": analytics["pending_listings"],
        "total_views": analytics["total_views"],
        "total_inquiries": analytics["total_inquiries"],
        "pending_inquiries": pending_inquiries,
        "revenue_estimate": analytics["total_revenue_estimate"],
        "unread_notifications": unread_notifications,
        "top_products": analytics["top_products"],
        "upcoming_exhibitions": upcoming_exhibitions,
    }


@app.get("/artisan/profile")
def get_artisan_profile(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get full artisan profile including bank & craft details."""
    profile = db.query(models.ArtisanProfile).filter(
        models.ArtisanProfile.user_id == current_user.id
    ).first()

    cluster = None
    if profile:
        membership = db.query(models.ClusterArtisan).filter(
            models.ClusterArtisan.artisan_id == current_user.id
        ).first()
        if membership:
            cluster_obj = db.query(models.Cluster).filter(
                models.Cluster.id == membership.cluster_id
            ).first()
            if cluster_obj:
                cluster = {"id": str(cluster_obj.id), "name": cluster_obj.cluster_name, "craft": cluster_obj.craft_specialization}

    return {
        "user_id": str(current_user.id),
        "full_name": current_user.full_name,
        "phone_number": current_user.phone_number,
        "email": current_user.email,
        "role": current_user.role,
        "state": current_user.state,
        "district": current_user.district,
        "preferred_language": current_user.preferred_language,
        "is_verified": current_user.is_verified,
        "craft_type": profile.craft_type if profile else None,
        "cluster_name": profile.cluster_name if profile else None,
        "aadhaar_number": profile.aadhaar_number if profile else None,
        "bank_account": profile.bank_account if profile else None,
        "ifsc_code": profile.ifsc_code if profile else None,
        "upi_id": profile.upi_id if profile else None,
        "govt_scheme_beneficiary": profile.govt_scheme_beneficiary if profile else False,
        "photo_url": profile.photo_url if profile else None,
        "cluster": cluster,
    }


@app.put("/artisan/profile")
def update_artisan_profile(
    full_name: Optional[str] = Form(None),
    preferred_language: Optional[str] = Form(None),
    craft_type: Optional[str] = Form(None),
    state: Optional[str] = Form(None),
    district: Optional[str] = Form(None),
    bank_account: Optional[str] = Form(None),
    ifsc_code: Optional[str] = Form(None),
    upi_id: Optional[str] = Form(None),
    aadhaar_number: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Update artisan profile fields."""
    if full_name:
        current_user.full_name = full_name
    if preferred_language:
        current_user.preferred_language = preferred_language
    if state:
        current_user.state = state
    if district:
        current_user.district = district

    profile = db.query(models.ArtisanProfile).filter(
        models.ArtisanProfile.user_id == current_user.id
    ).first()

    if not profile:
        profile = models.ArtisanProfile(user_id=current_user.id)
        db.add(profile)

    if craft_type:
        profile.craft_type = craft_type
    if bank_account:
        profile.bank_account = bank_account
    if ifsc_code:
        profile.ifsc_code = ifsc_code
    if upi_id:
        profile.upi_id = upi_id
    if aadhaar_number:
        profile.aadhaar_number = aadhaar_number

    db.commit()
    return {"message": "Profile updated successfully."}


# ===== PRODUCT MANAGEMENT ENDPOINTS =====

@app.get("/products/{product_id}", response_model=ProductResponse)
def get_product_detail(
    product_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get single product detail and track view."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    # Track view
    viewer_ip = request.client.host if request.client else None
    view = models.ProductView(product_id=product.id, viewer_ip=viewer_ip)
    db.add(view)
    product.view_count = (product.view_count or 0) + 1
    db.commit()

    artisan = db.query(models.ArtisanProfile).filter(
        models.ArtisanProfile.id == product.artisan_id
    ).first()
    user = db.query(models.User).filter(
        models.User.id == artisan.user_id
    ).first() if artisan else None

    images = db.query(models.ProductImage).filter(
        models.ProductImage.product_id == product.id
    ).all()
    image_urls = [img.enhanced_url or img.original_url for img in images]

    return ProductResponse(
        id=str(product.id),
        title_en=product.title_en,
        title_hi=product.title_hi,
        description_en=product.description_en or "",
        description_hi=product.description_hi or "",
        craft_category=product.craft_category or "",
        material=product.material or "",
        base_price=float(product.base_price),
        suggested_price=float(product.suggested_price) if product.suggested_price else None,
        stock_count=product.stock_count or 0,
        status=product.status,
        artisan_name=user.full_name if user else "Unknown",
        artisan_state=user.state if user else None,
        images=image_urls,
        created_at=product.created_at.isoformat() if product.created_at else "",
    )


@app.delete("/products/{product_id}")
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Archive (soft-delete) or permanently delete a product."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    artisan = db.query(models.ArtisanProfile).filter(
        models.ArtisanProfile.id == product.artisan_id
    ).first()
    if not artisan or str(artisan.user_id) != str(current_user.id):
        if current_user.role not in ["Admin"]:
            raise HTTPException(status_code=403, detail="Not authorized.")

    product.status = "Archived"
    db.commit()
    return {"message": "Product archived successfully.", "id": product_id}


@app.put("/products/{product_id}/status")
def update_product_status(
    product_id: str,
    status: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Toggle product status: Active, Draft, Sold Out, Archived, Pending Review"""
    valid_statuses = ["Active", "Draft", "Sold Out", "Archived", "Pending Review"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid_statuses}")

    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    product.status = status
    db.commit()
    return {"message": f"Product status updated to {status}.", "id": product_id, "status": status}


@app.put("/products/{product_id}/stock")
def update_product_stock(
    product_id: str,
    stock_count: int = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Update product stock count."""
    if stock_count < 0:
        raise HTTPException(status_code=400, detail="Stock count cannot be negative.")

    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    product.stock_count = stock_count
    if stock_count == 0:
        product.status = "Sold Out"
    db.commit()
    return {"message": "Stock updated.", "id": product_id, "stock_count": stock_count, "status": product.status}


@app.get("/products/{product_id}/qr")
def get_product_qr(
    product_id: str,
    db: Session = Depends(get_db)
):
    """Generate QR code PNG for product catalog sharing."""
    import qrcode
    import io as _io
    from fastapi.responses import Response as FastAPIResponse

    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    catalog_url = f"http://localhost:5173/?product={product_id}"

    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(catalog_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffer = _io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return FastAPIResponse(content=buffer.getvalue(), media_type="image/png")


# ===== ARTISAN ANALYTICS ENDPOINT =====

@app.get("/artisan/analytics")
def get_artisan_analytics_endpoint(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Per-product views, inquiries, income summary for the logged-in artisan."""
    profile = db.query(models.ArtisanProfile).filter(
        models.ArtisanProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Artisan profile not found.")

    return get_artisan_analytics(str(profile.id), db)


# ===== ARTISAN REPORT (CSV EXPORT) =====

@app.get("/artisan/report")
def export_artisan_report(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Export artisan product data as CSV."""
    profile = db.query(models.ArtisanProfile).filter(
        models.ArtisanProfile.user_id == current_user.id
    ).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Artisan profile not found.")

    analytics = get_artisan_analytics(str(profile.id), db)
    products = analytics["all_products"]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "product_id", "title", "status", "stock_count", "base_price",
        "view_count", "inquiry_count", "completed_orders", "revenue_estimate"
    ])
    writer.writeheader()
    for p in products:
        writer.writerow(p)

    output.seek(0)
    filename = f"kala_setu_report_{current_user.username or 'artisan'}_{datetime.datetime.now().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ===== BATCH IMAGE ENHANCEMENT =====

@app.post("/enhance/batch")
async def batch_enhance_images(
    files: List[UploadFile] = File(...),
):
    """Batch AI enhancement for multiple product images."""
    processor = ImageProcessor()
    results = []

    for file in files:
        try:
            contents = await file.read()
            result_b64, quality = processor.process_product_image_with_quality(contents)
            results.append({
                "filename": file.filename,
                "success": True,
                "enhanced_image": result_b64,
                "quality_score": quality,
            })
        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(e),
                "enhanced_image": None,
                "quality_score": None,
            })

    return {"results": results, "total": len(results), "successful": sum(1 for r in results if r["success"])}


# ===== AGGREGATOR DASHBOARD ENDPOINTS =====

@app.get("/aggregator/dashboard")
def get_aggregator_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Aggregator dashboard — clusters managed, artisan status, catalog completion."""
    if current_user.role not in ["Aggregator", "Admin"]:
        raise HTTPException(status_code=403, detail="Aggregator access required.")

    clusters = db.query(models.Cluster).filter(
        models.Cluster.aggregator_id == current_user.id
    ).all()

    cluster_summaries = []
    total_artisans = 0
    total_active_listings = 0
    total_pending_inquiries = 0

    for cluster in clusters:
        memberships = db.query(models.ClusterArtisan).filter(
            models.ClusterArtisan.cluster_id == cluster.id
        ).all()

        artisan_details = []
        for m in memberships:
            artisan_user = db.query(models.User).filter(models.User.id == m.artisan_id).first()
            artisan_profile = db.query(models.ArtisanProfile).filter(
                models.ArtisanProfile.user_id == m.artisan_id
            ).first()

            listing_count = 0
            has_active_listing = False
            if artisan_profile:
                listing_count = db.query(models.Product).filter(
                    models.Product.artisan_id == artisan_profile.id
                ).count()
                has_active_listing = db.query(models.Product).filter(
                    models.Product.artisan_id == artisan_profile.id,
                    models.Product.status == "Active"
                ).count() > 0

            if artisan_user:
                artisan_details.append({
                    "user_id": str(artisan_user.id),
                    "name": artisan_user.full_name,
                    "craft_type": artisan_profile.craft_type if artisan_profile else None,
                    "is_verified": artisan_user.is_verified,
                    "listing_count": listing_count,
                    "has_active_listing": has_active_listing,
                    "needs_support": not has_active_listing,
                })

        active_in_cluster = sum(1 for a in artisan_details if a["has_active_listing"])
        total_artisans += len(artisan_details)
        total_active_listings += active_in_cluster

        cluster_summaries.append({
            "cluster_id": str(cluster.id),
            "cluster_name": cluster.cluster_name,
            "state": cluster.state,
            "district": cluster.district,
            "craft_specialization": cluster.craft_specialization,
            "total_artisans": len(artisan_details),
            "artisans_with_listings": active_in_cluster,
            "artisans_needing_support": len(artisan_details) - active_in_cluster,
            "artisans": artisan_details,
        })

    return {
        "aggregator_name": current_user.full_name,
        "total_clusters": len(clusters),
        "total_artisans": total_artisans,
        "total_active_listings": total_active_listings,
        "total_pending_inquiries": total_pending_inquiries,
        "clusters": cluster_summaries,
    }


@app.get("/aggregator/artisans")
def get_aggregator_artisans(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get all artisans managed under aggregator's clusters."""
    if current_user.role not in ["Aggregator", "Admin"]:
        raise HTTPException(status_code=403, detail="Aggregator access required.")

    clusters = db.query(models.Cluster).filter(
        models.Cluster.aggregator_id == current_user.id
    ).all()

    all_artisans = []
    seen_ids = set()

    for cluster in clusters:
        memberships = db.query(models.ClusterArtisan).filter(
            models.ClusterArtisan.cluster_id == cluster.id
        ).all()
        for m in memberships:
            if str(m.artisan_id) in seen_ids:
                continue
            seen_ids.add(str(m.artisan_id))
            artisan_user = db.query(models.User).filter(models.User.id == m.artisan_id).first()
            artisan_profile = db.query(models.ArtisanProfile).filter(
                models.ArtisanProfile.user_id == m.artisan_id
            ).first()
            if artisan_user:
                all_artisans.append({
                    "user_id": str(artisan_user.id),
                    "name": artisan_user.full_name,
                    "phone": artisan_user.phone_number,
                    "state": artisan_user.state,
                    "district": artisan_user.district,
                    "craft_type": artisan_profile.craft_type if artisan_profile else None,
                    "is_verified": artisan_user.is_verified,
                    "cluster_name": cluster.cluster_name,
                    "preferred_language": artisan_user.preferred_language,
                })

    return {"artisans": all_artisans, "total": len(all_artisans)}


# ===== BUYER DASHBOARD ENDPOINTS =====

@app.get("/buyer/dashboard")
def get_buyer_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Buyer dashboard — inquiry history and matched artisans."""
    if current_user.role not in ["Buyer", "Admin"]:
        raise HTTPException(status_code=403, detail="Buyer access required.")

    inquiries = db.query(models.BuyerInquiry).filter(
        models.BuyerInquiry.buyer_id == current_user.id
    ).order_by(models.BuyerInquiry.created_at.desc()).all()

    inquiry_list = []
    for inq in inquiries:
        product = db.query(models.Product).filter(models.Product.id == inq.product_id).first()
        artisan_user = db.query(models.User).filter(models.User.id == inq.artisan_id).first()
        inquiry_list.append({
            "inquiry_id": str(inq.id),
            "product_id": str(inq.product_id),
            "product_title": product.title_en if product else "Unknown",
            "artisan_name": artisan_user.full_name if artisan_user else "Unknown",
            "quantity": inq.quantity,
            "message": inq.message,
            "status": inq.status,
            "created_at": inq.created_at.isoformat() if inq.created_at else "",
        })

    # Suggested artisans based on craft categories from past inquiries
    craft_categories = set()
    for inq in inquiries:
        product = db.query(models.Product).filter(models.Product.id == inq.product_id).first()
        if product and product.craft_category:
            craft_categories.add(product.craft_category)

    suggested_artisans = []
    if craft_categories:
        for cat in list(craft_categories)[:3]:
            profiles = db.query(models.ArtisanProfile).filter(
                models.ArtisanProfile.craft_type == cat
            ).limit(3).all()
            for p in profiles:
                user = db.query(models.User).filter(models.User.id == p.user_id).first()
                if user and str(user.id) != str(current_user.id):
                    suggested_artisans.append({
                        "user_id": str(user.id),
                        "name": user.full_name,
                        "craft_type": p.craft_type,
                        "state": user.state,
                        "is_verified": user.is_verified,
                    })

    pending = sum(1 for i in inquiry_list if i["status"] == "Pending")
    responded = sum(1 for i in inquiry_list if i["status"] == "Responded")
    completed = sum(1 for i in inquiry_list if i["status"] == "Completed")

    return {
        "buyer_name": current_user.full_name,
        "total_inquiries": len(inquiry_list),
        "pending_inquiries": pending,
        "responded_inquiries": responded,
        "completed_inquiries": completed,
        "inquiry_history": inquiry_list,
        "suggested_artisans": suggested_artisans,
    }


# ===== INQUIRY RESPONSE ENDPOINT =====

@app.post("/inquiries/{inquiry_id}/respond")
def respond_to_inquiry(
    inquiry_id: str,
    response_message: str = Form(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Artisan responds to a buyer inquiry."""
    inquiry = db.query(models.BuyerInquiry).filter(
        models.BuyerInquiry.id == inquiry_id
    ).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found.")

    if str(inquiry.artisan_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to respond to this inquiry.")

    inquiry.status = "Responded"
    inquiry.responded_at = datetime.datetime.utcnow()

    # Send notification to buyer
    notification = models.Notification(
        user_id=inquiry.buyer_id,
        title="Inquiry Responded",
        body=f"{current_user.full_name} has responded to your inquiry: {response_message[:200]}",
        type="Inquiry",
        lang_tag="en"
    )
    db.add(notification)
    db.commit()

    return {"message": "Response sent successfully.", "inquiry_id": inquiry_id, "status": "Responded"}


# ===== NOTIFICATION MARK-READ ENDPOINT =====

@app.put("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Mark a notification as read."""
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    return {"message": "Marked as read.", "id": notification_id}


@app.put("/notifications/mark-all-read")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Mark all notifications as read for current user."""
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
