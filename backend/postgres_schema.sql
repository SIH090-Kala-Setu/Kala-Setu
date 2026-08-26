-- =============================================================================
-- PostgreSQL Database Schema for KalaSetu (Artisan AI)
-- Ministry of Social Justice and Empowerment (MoSJE) | SIH26090
-- Total: 19 Relational Tables + Seed Data
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Enums
CREATE TYPE user_role AS ENUM ('Artisan', 'Aggregator', 'Admin', 'Buyer');
CREATE TYPE product_status AS ENUM ('Active', 'Draft', 'Sold Out', 'Archived', 'Pending Review');
CREATE TYPE voice_processing_status AS ENUM ('Pending', 'Processing', 'Completed', 'Failed');
CREATE TYPE inquiry_status AS ENUM ('Pending', 'Responded', 'Completed');
CREATE TYPE notification_type AS ENUM ('System', 'Inquiry', 'Verification', 'Update');

-- -----------------------------------------------------------------------------
-- 1. Users Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE,
    password_hash VARCHAR(255),
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role user_role NOT NULL DEFAULT 'Artisan',
    preferred_language VARCHAR(50) DEFAULT 'Hindi',
    state VARCHAR(100),
    district VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. Artisan Profile Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artisan_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    craft_type VARCHAR(100),
    cluster_name VARCHAR(100),
    aadhaar_number VARCHAR(12) UNIQUE,
    bank_account VARCHAR(30),
    ifsc_code VARCHAR(15),
    upi_id VARCHAR(100),
    govt_scheme_beneficiary BOOLEAN DEFAULT FALSE,
    photo_url TEXT,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 3. Products Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artisan_id UUID NOT NULL REFERENCES artisan_profile(id) ON DELETE CASCADE,
    title_en VARCHAR(255) NOT NULL,
    title_hi VARCHAR(255) NOT NULL,
    description_en TEXT,
    description_hi TEXT,
    craft_category VARCHAR(100),
    material VARCHAR(255),
    dimensions VARCHAR(100),
    base_price DECIMAL(12, 2) NOT NULL,
    suggested_price DECIMAL(12, 2),
    stock_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    status product_status DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 4. Product Images Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prod_ct_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    original_url TEXT NOT NULL,
    enhanced_url TEXT,
    bg_removed BOOLEAN DEFAULT FALSE,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    processed_at TIMESTAMP WITH TIME ZONE
);

-- -----------------------------------------------------------------------------
-- 5. Voice Inputs Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS voice_inputs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    artisan_id UUID NOT NULL REFERENCES artisan_profile(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    source_language VARCHAR(50),
    transcribed_text TEXT,
    translated_en TEXT,
    translated_hi TEXT,
    processing_status voice_processing_status DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 6. Pricing Suggestions Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    min_price DECIMAL(12, 2) NOT NULL,
    suggested_price DECIMAL(12, 2) NOT NULL,
    premium_price DECIMAL(12, 2) NOT NULL,
    pricing_rationale TEXT,
    market_data_snapshot JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 7. Buyer Inquiries Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS buyer_inquiries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    message TEXT,
    status inquiry_status DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP WITH TIME ZONE
);

-- -----------------------------------------------------------------------------
-- 8. Notifications Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    lang_tag VARCHAR(10) DEFAULT 'en',
    type notification_type DEFAULT 'System',
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 9. Admin Users Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(100),
    designation VARCHAR(100),
    access_level VARCHAR(50) DEFAULT 'Viewer',
    created_by VARCHAR(100),
    last_login TIMESTAMP WITH TIME ZONE
);

-- -----------------------------------------------------------------------------
-- 10. Audit Logs Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    change_snapshot JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 11. Artisan Verifications Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artisan_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artisan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    rejection_reason TEXT,
    aadhaar_verified BOOLEAN DEFAULT FALSE,
    bank_verified BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP WITH TIME ZONE
);

-- -----------------------------------------------------------------------------
-- 12. Clusters Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clusters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_name VARCHAR(150) NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    craft_specialization VARCHAR(150),
    aggregator_id UUID REFERENCES users(id) ON DELETE SET NULL,
    total_artisans INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 13. Cluster Artisans Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cluster_artisans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 14. Platform Analytics Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_date DATE UNIQUE NOT NULL,
    total_artisans INTEGER DEFAULT 0,
    active_listings INTEGER DEFAULT 0,
    buyer_inquiries INTEGER DEFAULT 0,
    verified_artisans INTEGER DEFAULT 0,
    new_registrations INTEGER DEFAULT 0,
    avg_product_price DECIMAL(12, 2) DEFAULT 0.0,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 15. Govt Schemes Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS govt_schemes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    eligibility_criteria TEXT,
    application_url TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    valid_until DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 16. Scheme Alerts Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheme_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scheme_id UUID NOT NULL REFERENCES govt_schemes(id) ON DELETE CASCADE,
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    target_state VARCHAR(100),
    target_craft_type VARCHAR(100),
    recipients_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 17. Exhibitions Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exhibitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Upcoming',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- -----------------------------------------------------------------------------
-- 18. Exhibition Registrations Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exhibition_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exhibition_id UUID NOT NULL REFERENCES exhibitions(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'Pending',
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 19. Product Views Table (Per-listing view analytics)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    viewer_ip VARCHAR(45),
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- Performance Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_artisan_id ON products(artisan_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_artisan_id ON buyer_inquiries(artisan_id);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_buyer_id ON buyer_inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_cluster_artisans_cluster_id ON cluster_artisans(cluster_id);
CREATE INDEX IF NOT EXISTS idx_artisan_verifications_status ON artisan_verifications(status);

-- =============================================================================
-- SEED DATA: Default Admin Account
-- Credentials: username = 'admin', password = 'admin'
-- (Bcrypt hash: $2b$12$fqqR/HoUt0b4Ht42YMajhun3DCDIyNNIhXvb1ziDHBSUabDWSHtFy)
-- =============================================================================

INSERT INTO users (
    id,
    username,
    password_hash,
    phone_number,
    full_name,
    email,
    role,
    preferred_language,
    state,
    district,
    is_verified
) VALUES (
    gen_random_uuid(),
    'admin',
    '$2b$12$fqqR/HoUt0b4Ht42YMajhun3DCDIyNNIhXvb1ziDHBSUabDWSHtFy',
    '9999999999',
    'MoSJE Administrator',
    'admin@mosje.gov.in',
    'Admin',
    'English',
    'New Delhi',
    'Central Delhi',
    TRUE
)
ON CONFLICT (username) DO UPDATE SET
    password_hash = '$2b$12$fqqR/HoUt0b4Ht42YMajhun3DCDIyNNIhXvb1ziDHBSUabDWSHtFy',
    role = 'Admin',
    is_verified = TRUE;

INSERT INTO admin_users (
    id,
    user_id,
    department,
    designation,
    access_level,
    created_by
)
SELECT gen_random_uuid(), id, 'Ministry of Social Justice and Empowerment (MoSJE)', 'Director of Handicrafts & Cluster Welfare', 'Superadmin', 'System'
FROM users WHERE username = 'admin'
AND id NOT IN (SELECT user_id FROM admin_users);
