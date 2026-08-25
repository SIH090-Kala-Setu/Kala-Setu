import datetime
from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Integer, Numeric, JSON, Date
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship, declarative_base
import uuid

Base = declarative_base()

# 1. Users Model
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(50), unique=True, nullable=True)  # Added for password-based JWT auth compatibility
    password_hash = Column(String(255), nullable=True)         # Added for password-based JWT auth compatibility
    phone_number = Column(String(15), unique=True, nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=True)
    role = Column(String, nullable=False, default="Artisan")  # Enum: Artisan, Aggregator, Admin, Buyer
    preferred_language = Column(String(50), default="Hindi")
    state = Column(String(100), nullable=True)
    district = Column(String(100), nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    artisan_profile = relationship("ArtisanProfile", back_populates="user", uselist=False)
    sent_inquiries = relationship("BuyerInquiry", foreign_keys="[BuyerInquiry.buyer_id]", back_populates="buyer")
    received_inquiries = relationship("BuyerInquiry", foreign_keys="[BuyerInquiry.artisan_id]", back_populates="artisan")
    notifications = relationship("Notification", back_populates="user")
    
    # Admin / Aggregator Relationships
    admin_profile = relationship("AdminUser", back_populates="user", uselist=False)
    verifications_submitted = relationship("ArtisanVerification", foreign_keys="[ArtisanVerification.artisan_id]", back_populates="artisan")
    verifications_reviewed = relationship("ArtisanVerification", foreign_keys="[ArtisanVerification.reviewed_by]", back_populates="reviewer")
    managed_clusters = relationship("Cluster", back_populates="aggregator")
    cluster_memberships = relationship("ClusterArtisan", back_populates="artisan")
    schemes_created = relationship("GovtScheme", back_populates="creator")
    scheme_alerts_sent = relationship("SchemeAlert", back_populates="sender")
    exhibitions_created = relationship("Exhibition", back_populates="creator")
    exhibition_registrations = relationship("ExhibitionRegistration", back_populates="artisan")


# 2. Artisan Profile Model
class ArtisanProfile(Base):
    __tablename__ = "artisan_profile"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    craft_type = Column(String(100), nullable=True)
    cluster_name = Column(String(100), nullable=True)
    aadhaar_number = Column(String(12), unique=True, nullable=True)
    bank_account = Column(String(30), nullable=True)
    ifsc_code = Column(String(15), nullable=True)
    upi_id = Column(String(100), nullable=True)
    govt_scheme_beneficiary = Column(Boolean, default=False)
    photo_url = Column(String, nullable=True)
    subscribed_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="artisan_profile")
    products = relationship("Product", back_populates="artisan")
    voice_inputs = relationship("VoiceInput", back_populates="artisan")


# 3. Products Model
class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    artisan_id = Column(UUID(as_uuid=True), ForeignKey("artisan_profile.id", ondelete="CASCADE"), nullable=False)
    title_en = Column(String(255), nullable=False)
    title_hi = Column(String(255), nullable=False)
    description_en = Column(String, nullable=True)
    description_hi = Column(String, nullable=True)
    craft_category = Column(String(100), nullable=True)
    material = Column(String(255), nullable=True)
    dimensions = Column(String(100), nullable=True)
    base_price = Column(Numeric(12, 2), nullable=False)
    suggested_price = Column(Numeric(12, 2), nullable=True)
    stock_count = Column(Integer, default=0)
    status = Column(String, default="Active")  # Enum: Active, Draft, Sold Out, Archived, Pending Review
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    artisan = relationship("ArtisanProfile", back_populates="products")
    images = relationship("ProductImage", back_populates="product")
    voice_inputs = relationship("VoiceInput", back_populates="product")
    pricing_suggestions = relationship("PricingSuggestion", back_populates="product")
    inquiries = relationship("BuyerInquiry", back_populates="product")


# 4. Product Images Model
class ProductImage(Base):
    __tablename__ = "prod_ct_images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    original_url = Column(String, nullable=False)
    enhanced_url = Column(String, nullable=True)
    bg_removed = Column(Boolean, default=False)
    is_primary = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    processed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    product = relationship("Product", back_populates="images")


# 5. Voice Inputs Model
class VoiceInput(Base):
    __tablename__ = "voice_inputs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    artisan_id = Column(UUID(as_uuid=True), ForeignKey("artisan_profile.id", ondelete="CASCADE"), nullable=False)
    audio_url = Column(String, nullable=False)
    source_language = Column(String(50), nullable=True)
    transcribed_text = Column(String, nullable=True)
    translated_en = Column(String, nullable=True)
    translated_hi = Column(String, nullable=True)
    processing_status = Column(String, default="Pending")  # Enum: Pending, Processing, Completed, Failed
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="voice_inputs")
    artisan = relationship("ArtisanProfile", back_populates="voice_inputs")


# 6. Pricing Suggestions Model
class PricingSuggestion(Base):
    __tablename__ = "pricing_suggestions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    min_price = Column(Numeric(12, 2), nullable=False)
    suggested_price = Column(Numeric(12, 2), nullable=False)
    premium_price = Column(Numeric(12, 2), nullable=False)
    pricing_rationale = Column(String, nullable=True)
    market_data_snapshot = Column(JSONB, nullable=True)
    generated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    product = relationship("Product", back_populates="pricing_suggestions")


# 7. Buyer Inquiries Model
class BuyerInquiry(Base):
    __tablename__ = "buyer_inquiries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    artisan_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    quantity = Column(Integer, default=1)
    message = Column(String, nullable=True)
    status = Column(String, default="Pending")  # Enum: Pending, Responded, Completed
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    responded_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    product = relationship("Product", back_populates="inquiries")
    buyer = relationship("User", foreign_keys=[buyer_id], back_populates="sent_inquiries")
    artisan = relationship("User", foreign_keys=[artisan_id], back_populates="received_inquiries")


# 8. Notifications Model
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(String, nullable=False)
    lang_tag = Column(String(10), default="en")
    type = Column(String, default="System")  # Enum: System, Inquiry, Verification, Update
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


# 9. Admin Users Model
class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    department = Column(String(100), nullable=True)
    designation = Column(String(100), nullable=True)
    access_level = Column(String(50), default="Viewer")  # e.g., Superadmin, Editor, Viewer
    created_by = Column(String(100), nullable=True)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="admin_profile")
    audit_logs = relationship("AuditLog", back_populates="admin")


# 10. Audit Logs Model
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id = Column(UUID(as_uuid=True), ForeignKey("admin_users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(255), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    change_snapshot = Column(JSONB, nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    admin = relationship("AdminUser", back_populates="audit_logs")


# 11. Artisan Verifications Model
class ArtisanVerification(Base):
    __tablename__ = "artisan_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    artisan_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), default="Pending")  # Pending, Approved, Rejected
    rejection_reason = Column(String, nullable=True)
    aadhaar_verified = Column(Boolean, default=False)
    bank_verified = Column(Boolean, default=False)
    submitted_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    artisan = relationship("User", foreign_keys=[artisan_id], back_populates="verifications_submitted")
    reviewer = relationship("User", foreign_keys=[reviewed_by], back_populates="verifications_reviewed")


# 12. Clusters Model
class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_name = Column(String(150), nullable=False)
    state = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    craft_specialization = Column(String(150), nullable=True)
    aggregator_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    total_artisans = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    aggregator = relationship("User", back_populates="managed_clusters")
    artisans = relationship("ClusterArtisan", back_populates="cluster", cascade="all, delete-orphan")


# 13. Cluster Artisans Model
class ClusterArtisan(Base):
    __tablename__ = "cluster_artisans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cluster_id = Column(UUID(as_uuid=True), ForeignKey("clusters.id", ondelete="CASCADE"), nullable=False)
    artisan_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    joined_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    cluster = relationship("Cluster", back_populates="artisans")
    artisan = relationship("User", back_populates="cluster_memberships")


# 14. Platform Analytics Model
class PlatformAnalytics(Base):
    __tablename__ = "platform_analytics"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    report_date = Column(Date, nullable=False, unique=True)
    total_artisans = Column(Integer, default=0)
    active_listings = Column(Integer, default=0)
    buyer_inquiries = Column(Integer, default=0)
    verified_artisans = Column(Integer, default=0)
    new_registrations = Column(Integer, default=0)
    avg_product_price = Column(Numeric(12, 2), default=0.0)
    generated_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)


# 15. Govt Schemes Model
class GovtScheme(Base):
    __tablename__ = "govt_schemes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scheme_name = Column(String(255), nullable=False)
    description = Column(String, nullable=False)
    eligibility_criteria = Column(String, nullable=True)
    application_url = Column(String, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)
    valid_until = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="schemes_created")
    alerts = relationship("SchemeAlert", back_populates="scheme", cascade="all, delete-orphan")


# 16. Scheme Alerts Model
class SchemeAlert(Base):
    __tablename__ = "scheme_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scheme_id = Column(UUID(as_uuid=True), ForeignKey("govt_schemes.id", ondelete="CASCADE"), nullable=False)
    sent_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    target_state = Column(String(100), nullable=True)
    target_craft_type = Column(String(100), nullable=True)
    recipients_count = Column(Integer, default=0)
    sent_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    scheme = relationship("GovtScheme", back_populates="alerts")
    sender = relationship("User", back_populates="scheme_alerts_sent")


# 17. Exhibitions Model
class Exhibition(Base):
    __tablename__ = "exhibitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    status = Column(String(50), default="Upcoming")  # Upcoming, Ongoing, Completed, Cancelled
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    creator = relationship("User", back_populates="exhibitions_created")
    registrations = relationship("ExhibitionRegistration", back_populates="exhibition", cascade="all, delete-orphan")


# 18. Exhibition Registrations Model
class ExhibitionRegistration(Base):
    __tablename__ = "exhibition_registrations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    exhibition_id = Column(UUID(as_uuid=True), ForeignKey("exhibitions.id", ondelete="CASCADE"), nullable=False)
    artisan_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="Pending")  # Pending, Approved, Rejected, Attended
    registered_at = Column(DateTime(timezone=True), default=datetime.datetime.utcnow)

    # Relationships
    exhibition = relationship("Exhibition", back_populates="registrations")
    artisan = relationship("User", back_populates="exhibition_registrations")

