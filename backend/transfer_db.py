import sys
import os
import uuid
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Append backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import database models
import models         # SQLite models
import models_pg      # PostgreSQL models

def migrate():
    print("=== ARTISAN AI DATABASE MIGRATION SCRIPT ===")
    
    # 1. Setup SQLite Database Session
    sqlite_url = "sqlite:///./artisan_ai.db"
    print(f"Connecting to source SQLite DB: {sqlite_url}")
    sqlite_engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
    SQLiteSession = sessionmaker(bind=sqlite_engine)
    sqlite_db = SQLiteSession()
    
    # 2. Setup PostgreSQL Database Session
    # Using environment variables or fallback to defaults
    pg_user = os.getenv("POSTGRES_USER", "postgres")
    pg_password = os.getenv("POSTGRES_PASSWORD", "postgres")
    pg_host = os.getenv("POSTGRES_HOST", "localhost")
    pg_port = os.getenv("POSTGRES_PORT", "5432")
    pg_db = os.getenv("POSTGRES_DB", "artisan_ai")
    
    pg_url = os.getenv(
        "DATABASE_URL", 
        f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_db}"
    )
    print(f"Connecting to target PostgreSQL DB: {pg_url}")
    
    try:
        pg_engine = create_engine(pg_url)
        # Verify connection
        pg_engine.connect()
    except Exception as e:
        print(f"\n[ERROR] Failed to connect to PostgreSQL. Make sure your PG database is running and credentials are correct.")
        print(f"Details: {e}")
        print("\nIf you are running this locally, you can set PostgreSQL credentials using environment variables:")
        print("  Windows: set USE_POSTGRES=true && set POSTGRES_PASSWORD=yourpassword")
        print("  Linux/Mac: export USE_POSTGRES=true; export POSTGRES_PASSWORD=yourpassword")
        sys.exit(1)
        
    PGSession = sessionmaker(bind=pg_engine)
    pg_db = PGSession()
    
    # Ensure tables exist in PostgreSQL
    print("Initializing tables in PostgreSQL...")
    models_pg.Base.metadata.create_all(bind=pg_engine)
    
    # Keep ID mapping tables
    user_id_map = {}          # {sqlite_user_id: pg_user_uuid}
    artisan_profile_map = {}  # {sqlite_user_id: pg_artisan_profile_uuid}
    product_id_map = {}          # {sqlite_product_id: pg_product_uuid}
    
    try:
        # --- A. Migrate Users ---
        print("\n[1/4] Migrating Users...")
        sqlite_users = sqlite_db.query(models.User).all()
        print(f"Found {len(sqlite_users)} users in SQLite database.")
        
        for u in sqlite_users:
            # Check if user already exists in PG (by username or phone number)
            # Generate phone number from ID if not present
            phone = u.aadhaar_number[-10:] if (u.aadhaar_number and len(u.aadhaar_number) >= 10) else f"9876543{u.id:03d}"
            
            existing = pg_db.query(models_pg.User).filter(
                (models_pg.User.username == u.username) | 
                (models_pg.User.phone_number == phone)
            ).first()
            
            if existing:
                print(f"  User '{u.username}' already exists in PostgreSQL, skipping user creation.")
                user_id_map[u.id] = existing.id
                
                # Fetch profile if exists
                profile = pg_db.query(models_pg.ArtisanProfile).filter(models_pg.ArtisanProfile.user_id == existing.id).first()
                if profile:
                    artisan_profile_map[u.id] = profile.id
                continue
                
            pg_user = models_pg.User(
                id=uuid.uuid4(),
                username=u.username,
                password_hash=u.password_hash,
                phone_number=phone,
                full_name=u.username.capitalize(),
                email=f"{u.username}@artisan.ai",
                role=u.role,
                preferred_language=u.preferred_lang or "Hindi",
                state=u.region or "Uttar Pradesh",
                district="Varanasi",
                is_verified=u.is_verified,
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow()
            )
            pg_db.add(pg_user)
            pg_db.flush()  # populate ID
            
            user_id_map[u.id] = pg_user.id
            print(f"  Created user '{u.username}' -> PG UUID: {pg_user.id}")
            
            # Create Artisan Profile if user is an Artisan
            if u.role == "Artisan":
                profile = models_pg.ArtisanProfile(
                    id=uuid.uuid4(),
                    user_id=pg_user.id,
                    craft_type=u.craft_type or "Handicrafts",
                    cluster_name="Varanasi Weavers Cooperative",
                    aadhaar_number=u.aadhaar_number or f"123456789{u.id:03d}",
                    bank_account="000000000000",
                    ifsc_code="SBIN0000001",
                    upi_id=f"{u.username}@upi",
                    govt_scheme_beneficiary=False
                )
                pg_db.add(profile)
                pg_db.flush()
                artisan_profile_map[u.id] = profile.id
                
                # Create verification
                verification = models_pg.ArtisanVerification(
                    artisan_id=pg_user.id,
                    status="Approved" if u.is_verified else "Pending",
                    aadhaar_verified=u.is_verified,
                    bank_verified=u.is_verified
                )
                pg_db.add(verification)
                print(f"    Created artisan profile & verification request.")
                
        pg_db.commit()
        
        # --- B. Migrate Products ---
        print("\n[2/4] Migrating Products...")
        sqlite_products = sqlite_db.query(models.Product).all()
        print(f"Found {len(sqlite_products)} products in SQLite database.")
        
        for p in sqlite_products:
            # Match artisan profile UUID
            artisan_profile_uuid = artisan_profile_map.get(p.artisan_id)
            if not artisan_profile_uuid:
                # If no matching profile (e.g. orphan product), link to first available profile
                first_profile = pg_db.query(models_pg.ArtisanProfile).first()
                if first_profile:
                    artisan_profile_uuid = first_profile.id
                else:
                    print(f"  [WARNING] Skipping product '{p.title_en}' because no artisan profile exists in PG.")
                    continue
            
            # Map materials list to comma-separated string
            material_str = ",".join(p.materials) if p.materials else ""
            
            pg_product = models_pg.Product(
                id=uuid.uuid4(),
                artisan_id=artisan_profile_uuid,
                title_en=p.title_en,
                title_hi=p.title_hi,
                description_en=p.description_en,
                description_hi=p.description_hi,
                craft_category=p.category,
                material=material_str,
                base_price=p.retail_price,
                suggested_price=p.b2b_price,
                stock_count=p.stock,
                status=p.status or "Active",
                created_at=datetime.datetime.utcnow()
            )
            pg_db.add(pg_product)
            pg_db.flush()
            product_id_map[p.id] = pg_product.id
            print(f"  Migrated product '{p.title_en}' -> PG UUID: {pg_product.id}")
            
            # Create product image if image_url exists
            if p.image_url:
                pg_image = models_pg.ProductImage(
                    id=uuid.uuid4(),
                    product_id=pg_product.id,
                    original_url=p.image_url,
                    enhanced_url=p.image_url,
                    bg_removed=True,
                    is_primary=True
                )
                pg_db.add(pg_image)
                print(f"    Linked product image.")
                
        pg_db.commit()
        
        # --- C. Migrate Inquiries ---
        print("\n[3/4] Migrating Inquiries...")
        sqlite_inquiries = sqlite_db.query(models.Inquiry).all()
        print(f"Found {len(sqlite_inquiries)} inquiries in SQLite database.")
        
        for i in sqlite_inquiries:
            # Resolve PG Product UUID
            product_uuid = product_id_map.get(i.product_id)
            if not product_uuid:
                print(f"  [WARNING] Skipping inquiry ID {i.id} because product {i.product_id} was not migrated.")
                continue
                
            # Find or create a Buyer User in PostgreSQL
            buyer_username = i.buyer_name.lower().replace(" ", "")
            buyer = pg_db.query(models_pg.User).filter(models_pg.User.username == buyer_username).first()
            if not buyer:
                buyer = models_pg.User(
                    id=uuid.uuid4(),
                    username=buyer_username,
                    phone_number=f"90000{i.id:05d}",
                    full_name=i.buyer_name,
                    email=i.buyer_email,
                    role="Buyer",
                    preferred_language="English",
                    is_verified=True
                )
                pg_db.add(buyer)
                pg_db.flush()
                
            # Find artisan user UUID associated with the product
            prod_record = pg_db.query(models_pg.Product).filter(models_pg.Product.id == product_uuid).first()
            artisan_user_id = prod_record.artisan.user_id if prod_record and prod_record.artisan else buyer.id
            
            pg_inquiry = models_pg.BuyerInquiry(
                id=uuid.uuid4(),
                product_id=product_uuid,
                buyer_id=buyer.id,
                artisan_id=artisan_user_id,
                quantity=i.quantity,
                message=i.notes,
                status=i.status or "Pending",
                created_at=i.created_at or datetime.datetime.utcnow()
            )
            pg_db.add(pg_inquiry)
            print(f"  Migrated inquiry from '{i.buyer_name}' for product UUID {product_uuid}")
            
        pg_db.commit()
        
        # --- D. Migrate Notifications ---
        print("\n[4/4] Migrating Notifications...")
        sqlite_notifications = sqlite_db.query(models.Notification).all()
        print(f"Found {len(sqlite_notifications)} notifications in SQLite database.")
        
        # In PostgreSQL, notifications belong to a user. We will map SQLite notifications to the first Admin or matching user role
        first_admin = pg_db.query(models_pg.User).filter(models_pg.User.role == "Admin").first()
        first_artisan = pg_db.query(models_pg.User).filter(models_pg.User.role == "Artisan").first()
        
        for n in sqlite_notifications:
            target_user = first_admin
            if n.target_role == "Artisan" and first_artisan:
                target_user = first_artisan
                
            if not target_user:
                # Fallback to any user
                target_user = pg_db.query(models_pg.User).first()
                
            if not target_user:
                print("  [WARNING] No users found in PostgreSQL to associate notification, skipping.")
                continue
                
            pg_noti = models_pg.Notification(
                id=uuid.uuid4(),
                user_id=target_user.id,
                title=n.title,
                body=n.message,
                type="System",
                sent_at=n.created_at or datetime.datetime.utcnow()
            )
            pg_db.add(pg_noti)
            
        pg_db.commit()
        print("\n[SUCCESS] All records successfully migrated from SQLite to PostgreSQL!")
        
    except Exception as ex:
        pg_db.rollback()
        print(f"\n[ERROR] Migration failed and transaction rolled back.")
        print(f"Details: {ex}")
    finally:
        sqlite_db.close()
        pg_db.close()

if __name__ == "__main__":
    migrate()
