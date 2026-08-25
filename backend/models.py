from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False)  # Admin, Artisan, Buyer, Aggregator
    region = Column(String, nullable=True)
    preferred_lang = Column(String, default="Hindi")
    craft_type = Column(String, nullable=True)
    aadhaar_number = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    
    # Relationships
    products = relationship("Product", back_populates="artisan")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title_en = Column(String, nullable=False)
    title_hi = Column(String, nullable=False)
    description_en = Column(String, nullable=False)
    description_hi = Column(String, nullable=False)
    category = Column(String, nullable=False)
    materials = Column(JSON, nullable=True)  # Store list of materials
    tags = Column(JSON, nullable=True)       # Store list of tags
    retail_price = Column(Float, nullable=False)
    b2b_price = Column(Float, nullable=False)
    stock = Column(Integer, default=10)
    status = Column(String, default="Active")  # Active, Draft, Sold Out, Archived, Pending Review
    image_url = Column(String, nullable=True)
    
    artisan_name = Column(String, nullable=True)
    artisan_coop = Column(String, nullable=True)
    artisan_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relationships
    artisan = relationship("User", back_populates="products")
    inquiries = relationship("Inquiry", back_populates="product")

class Inquiry(Base):
    __tablename__ = "inquiries"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    buyer_name = Column(String, nullable=False)
    buyer_email = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    notes = Column(String, nullable=True)
    status = Column(String, default="Pending")  # Pending, Responded, Completed
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="inquiries")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    target_role = Column(String, nullable=False)  # All, Artisan, Buyer, Aggregator, Admin
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
