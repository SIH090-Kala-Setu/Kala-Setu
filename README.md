# 🎨 KalaSetu (Artisan AI) | कला सेतु

> **AI-Driven Market Linkage, Smart Multilingual Cataloging, and Governance Platform for Marginalized Artisans, Weavers & Micro-Entrepreneurs**  
> *Under the mandate of the Ministry of Social Justice and Empowerment (MoSJE) | Smart India Hackathon (SIH26090)*

---

<div align="center">

![FastAPI](https://img.shields.io/badge/FastAPI-0.100.0-009688.svg?style=flat&logo=fastapi&logoColor=white)
![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B.svg?style=flat&logo=flutter&logoColor=white)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.4.0-646CFF.svg?style=flat&logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg?style=flat&logo=postgresql&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4.svg?style=flat&logo=google&logoColor=white)
![Groq AI](https://img.shields.io/badge/Groq%20AI-Whisper%20%2B%20Llama%203.3-F55036.svg?style=flat)
![FCM v1](https://img.shields.io/badge/Push-Firebase%20FCM%20v1-FFCA28.svg?style=flat&logo=firebase&logoColor=black)
![OpenCV](https://img.shields.io/badge/OpenCV-4.8.0-5C3EE8.svg?style=flat&logo=opencv&logoColor=white)
![ONNX Runtime](https://img.shields.io/badge/ONNX-u2netp%20(4.5MB)-005CED.svg?style=flat&logo=onnx&logoColor=white)
![JWT Auth](https://img.shields.io/badge/Security-JWT%20%2B%20Bcrypt-000000.svg?style=flat&logo=jsonwebtokens&logoColor=white)
![Endpoints](https://img.shields.io/badge/API%20Endpoints-62+-E67E22.svg?style=flat)
![Components](https://img.shields.io/badge/React%20Components-29-61DAFB.svg?style=flat&logo=react)

</div>

---

## 📌 Table of Contents

1. [Problem Statement & Background](#-problem-statement--background)
2. [Repository Structure](#-repository-structure)
3. [Platform Architecture & 9-Module System](#-platform-architecture--9-module-system)
4. [User Roles & Role-Based Dashboards](#-user-roles--role-based-dashboards)
   - [Artisan Capability Suite](#-artisan-capability-suite)
   - [Cluster Aggregator Capability Suite](#-cluster-aggregator-capability-suite)
   - [B2B Buyer Capability Suite](#-b2b-buyer-capability-suite)
   - [MoSJE Admin Governance Console](#-mosje-governance-console-7-pillars)
5. [Module Deep-Dives](#️-module-deep-dives)
   - [Module 1 — User Onboarding & Profile Management](#module-1--user-onboarding--profile-management)
   - [Module 2 — AI Image Enhancer & Studio](#module-2--ai-image-enhancer--studio)
   - [Module 3 — Multilingual Auto-Cataloger](#module-3--multilingual-auto-cataloger)
   - [Module 4 — Dynamic Pricing Assistant](#module-4--dynamic-pricing-assistant)
   - [Module 5 — Product Catalog & Inventory Management](#module-5--product-catalog--inventory-management)
   - [Module 6 — Market Linkage & B2B Connection](#module-6--market-linkage--b2b-connection)
   - [Module 7 — Analytics & Insights](#module-7--analytics--insights)
   - [Module 8 — Notification & Support](#module-8--notification--support)
   - [Module 9 — Role-Based Dashboards](#module-9--role-based-dashboards)
6. [MoSJE Governance Console (7 Pillars)](#-mosje-governance-console-7-pillars)
7. [System Architecture & Data Flow](#-system-architecture--data-flow)
8. [Database Schema (Entity-Relationship)](#️-database-schema-entity-relationship)
9. [API Endpoint Reference (62+ Endpoints)](#-api-endpoint-reference-62-endpoints)
10. [Dynamic Pricing & Fair Wage Engine](#-dynamic-pricing--fair-wage-engine)
11. [Tech Stack](#️-tech-stack)
12. [Setup & Installation Guide](#-setup--installation-guide)
13. [How to Run](#-how-to-run)
14. [Known Issues & Fixes](#-known-issues--fixes)

---

## 📁 Repository Structure

```
KalaSetu/
├── Kama-Setu/                  # Web platform (React frontend + FastAPI backend)
│   ├── backend/                # FastAPI server — 62+ endpoints, 19 DB tables
│   │   ├── main.py             # All API routes
│   │   ├── auth.py             # JWT + bcrypt authentication
│   │   ├── models.py           # SQLAlchemy ORM models
│   │   ├── database.py         # PostgreSQL engine & session
│   │   ├── services/           # AI image processor, cataloger, pricing, notifications
│   │   ├── .env                # Environment variables (DATABASE_URL, GEMINI_API_KEY, etc.)
│   │   └── requirements.txt
│   └── frontend/               # React 18 + Vite SPA — 29 components
│       └── src/
│           ├── components/     # Role dashboards, marketplace, studio, admin console
│           ├── api/            # Typed API client modules per role
│           └── context/        # AuthContext, ToastContext
└── learningdart/               # Flutter mobile app (Android, iOS, Web, Windows)
    └── lib/
        ├── core/               # Network (Dio), router, theme, localization, storage
        ├── features/           # Artisan, Aggregator, Buyer, Auth, Onboarding screens
        └── shared/             # Widgets, models, providers
```

---

## 📖 Problem Statement & Background

* **Problem Statement ID:** SIH26090
* **Theme:** Inclusive Socio-Economic Development & Direct Market Access
* **Target Beneficiaries:** Rural Artisans, Handloom Weavers, Pottery Masters, Tribal Craftsmen, and Micro-Enterprises.

### The Challenge

Government agencies regularly assist marginalized artisans by providing financial assistance, cluster development programs, and organizing traditional fairs (**Shilp Samagam**, **Surajkund Mela**, **Dilli Haat**). However, these events provide only temporary, intermittent sales windows. Once the fair concludes, artisans struggle to maintain digital continuity due to:

* **Digital & Technical Barriers:** Low digital literacy makes listing products on complex e-commerce platforms nearly impossible.
* **Photography & Visual Standards:** Inability to produce clean, studio-quality product photos in cluttered rural workshops.
* **Language & Content Barriers:** Difficulties formulating professional, SEO-optimized titles and descriptions in English and standard Hindi.
* **Pricing Vulnerability:** Exploitation by middlemen, lack of market visibility, and selling below living wage benchmarks.

### The Solution: KalaSetu

**KalaSetu (Artisan AI)** functions as an autonomous **Virtual Business Manager**. It empowers artisans to photograph a product, speak in their native tongue, receive instant pricing intelligence, and publish directly to a national B2B wholesale and D2C marketplace under verified government governance.

---

## 🧩 Platform Architecture & 9-Module System

```mermaid
graph TD
    subgraph Modules["9 Core Platform Modules"]
        M1["🧑‍💼 Module 1\nUser Onboarding\n& Profile"]
        M2["📸 Module 2\nAI Image Enhancer\n& Studio"]
        M3["🎙️ Module 3\nMultilingual\nAuto-Cataloger"]
        M4["💰 Module 4\nDynamic Pricing\nAssistant"]
        M5["📦 Module 5\nProduct Catalog\n& Inventory"]
        M6["🤝 Module 6\nMarket Linkage\n& B2B"]
        M7["📊 Module 7\nAnalytics\n& Insights"]
        M8["🔔 Module 8\nNotification\n& Support"]
        M9["🖥️ Module 9\nRole-Based\nDashboards"]
    end

    subgraph Roles["User Roles"]
        R1["🧵 Artisan / Weaver"]
        R2["🏘️ Cluster Aggregator"]
        R3["🏛️ MoSJE Admin"]
        R4["🏢 B2B Buyer"]
    end

    M1 --> R1 & R2 & R3 & R4
    M9 --> R1 & R2 & R3 & R4
```

---

## 👥 User Roles & Role-Based Dashboards

KalaSetu implements **full role-based routing** — each role sees a completely tailored experience:

| Role | Default View | Accessible Modules |
|:---|:---|:---|
| **Artisan / Weaver** | Artisan Dashboard | Dashboard · AI Studio · Inventory · Analytics · Inquiries & Alerts · Profile · Marketplace |
| **Cluster Aggregator** | Aggregator Dashboard | Cluster Management · Assisted Onboarding · Scheme Relay · MoSJE Reporting · Marketplace |
| **B2B Buyer** | Buyer Dashboard | Sent Inquiries & Order History · Browse Catalog · Matched Artisans · Verified Buyer Badge |
| **MoSJE Admin** | Admin Console | Full Governance Console (7 Pillars: Verifications, Clusters, Schemes, Fairs, Moderation, Buyers, Analytics) |
| **Unauthenticated** | Marketplace | Multi-Criteria Catalog Discovery (Read-Only & Guest Inquiries) |

---

### 🎨 Artisan Capability Suite

1. **Profile, Identity & Bank Details Management**:
   - Register profile with craft specialization (*Textiles & Handloom, Clay & Blue Pottery, Tribal & Silver Jewelry, Folk Paintings, Wood Inlay, Metalcraft*), geographic region, and assigned cooperative cluster.
   - Capture Aadhaar identification with official MoSJE verification badge tracking.
   - Maintain and update direct settlement details: **Bank Account Number**, **IFSC Code**, and **UPI ID** for DBT payouts (`GET /artisan/profile` & `PUT /artisan/profile`).
2. **National Government Exhibition & Mela Registration**:
   - Discover scheduled national fairs (**Shilp Samagam**, **Dilli Haat**, **Surajkund International Crafts Mela**, **Gandhi Shilp Bazar**).
   - 1-click **Register Stall** workflow directly from the dashboard (`POST /admin/exhibitions/{id}/register`).
3. **Inquiries, Scheme Alerts & Real-Time Messaging**:
   - Dedicated **Inquiries & Alerts** hub (`NotificationsCenter.jsx`) to receive wholesale quotation requests from enterprise buyers.
   - Interactive in-app direct reply to quote pricing, production lead times, and customization options (`POST /inquiries/{id}/respond`).
   - Receive broadcasted MoSJE welfare schemes, subsidized credit alerts, and exhibition stall confirmations.
4. **Simple, Visual & Bilingual Income Analytics**:
   - Clean, icon-based metric cards and horizontal bar tracks for catalog views, bulk inquiry volume, active listings, and estimated income (*दृश्य, पूछताछ, अनुमानित आय*).
   - 1-click downloadable CSV Sales & Performance Reports (`GET /artisan/report`).
5. **Digital Product Catalogue & Inventory Management**:
   - 4-step AI Studio product creation with auto-prefill from pricing engine.
   - Live inline price editing, B2B wholesale calculation, stock incrementer ($+/-$), status toggling (`Active`, `Draft`, `Sold Out`), downloadable catalog QR codes (`GET /products/{id}/qr`), and soft-archiving.

---

### 🤝 Cluster Aggregator Capability Suite

1. **Cluster Overview & Artisan Management**:
   - View, search, and manage all artisans registered under their regional handicraft cluster with direct contact info, craft type, and MoSJE verification status.
   - Export full cluster rosters to CSV (`GET /aggregator/artisans`).
2. **Assisted Onboarding for Low-Literacy Artisans**:
   - Register rural artisans directly in the field with name, phone, language preference (*Hindi, Bengali, Gujarati, Tamil, Odia, English*), and craft type.
   - Automatically assigns the artisan to the cluster and initiates the MoSJE verification queue (`POST /aggregator/artisans/onboard`).
3. **Catalogue Completion Status Monitoring**:
   - Color-coded tracking to monitor who has digitized products: `✅ Active Listings (3+ items)`, `⏳ Started (1-2 items)`, and `⚠️ 0 Listings (Unlisted)`.
4. **Photography & Voice Cataloging Support Flagging**:
   - Automatically flags unlisted or struggling members as **"Needs Photography / Voice Help"**.
   - Filterable view to plan studio photography camps and voice-assisted cataloging sessions.
5. **Cluster-Level Analytics & Inquiry Volumes**:
   - Real-time cluster metrics tracking total active listings, buyer inquiry count per member, and active handicraft specializations (`GET /aggregator/dashboard`).
6. **Receive & Relay Government Scheme Alerts**:
   - Broadcast official MoSJE welfare schemes, working capital subsidies, toolkits, and exhibition opportunities directly to cluster members via in-app alerts and SMS (`POST /aggregator/schemes/relay`).
7. **Submit Cluster-Level Reports to MoSJE Admin**:
   - Formally transmit monthly digitization milestones, welfare progress, and field notes directly to Ministry Administrators with automated audit trail logging (`POST /aggregator/reports/submit`).

---

### 🛍️ B2B Buyer Capability Suite

1. **Multi-Criteria Discovery & Advanced Filtering**:
   - Filter the national artisan catalogue by:
     - **Craft Category**: *Textiles & Handloom, Clay & Blue Pottery, Tribal & Silver Jewelry, Folk Paintings & Art, Wood Inlay & Carving, Handicrafts & Decor*.
     - **Region / State**: *Uttar Pradesh, Rajasthan, Gujarat, West Bengal, Odisha, Jammu & Kashmir, Madhya Pradesh, Karnataka, Tamil Nadu, Assam*.
     - **Material**: *Silk, Cotton, Clay, Silver, Brass, Wood, Marble, Terracotta, Jute*.
     - **Price Range Brackets**: *Under ₹1,000, ₹1,000–₹5,000, ₹5,000–₹15,000, Above ₹15,000*.
     - **Instant Keyword Search**: Case-insensitive search across English and Hindi titles, descriptions, and materials.
2. **Professional Listings with AI Photography & SEO**:
   - High-resolution studio-centered product imagery with background removal and enhanced lighting.
   - Dynamic hashtags (`#HandmadeInIndia`, `#VocalForLocal`, `#MoSJEVerified`, `#Silk`, `#Terracotta`) and bilingual story descriptions.
3. **Direct B2B Quotations & Bulk Inquiries**:
   - Submit bulk inquiry drawer specifying quantity, business email, custom pattern/color requirements, and delivery deadlines (`POST /inquiries`).
4. **Verified Artisan Profiles & Cluster Transparency**:
   - Inspect artisan craft clusters, geographic origin, and government-verified badges on dedicated standalone product pages (`ProductPage.jsx`).
5. **Inquiry & Order History Tracking**:
   - Track sent inquiries with real-time status lifecycles (`Pending`, `Responded`, `Completed`) and artisan quotation responses on the **Buyer Dashboard** (`GET /buyer/dashboard`).
6. **Personalized Category-Based Artisan Matching**:
   - Machine learning matching engine recommending top master artisans and SHG cooperatives based on past procurement interests.
7. **MoSJE Verified Buyer Badge**:
   - Verified enterprise buyers receive a trusted **"MoSJE Verified Buyer"** badge after admin KYC review to prevent spam and foster trust.

---

## ⚙️ Module Deep-Dives

### Module 1 — User Onboarding & Profile Management

**Visual, low-literacy-first onboarding wizard** with 7 guided steps:

```
Step 1         Step 2         Step 3         Step 4         Step 5         Step 6         Step 7
Language   →   Name+Phone  →  Role Select →  Craft Type  →  Region      →  Password    →  ✅ Success
(icon tiles)                  (illustrated)  (emoji grid)   (State+Dist)
```

**Features:**
- (i) Artisan registration with minimal input (name, craft type, region, preferred language)
- (ii) **Voice-guided onboarding** — visual icon tiles, no reading skills required
- (iii) Profile management with craft/trade category tagging
- (iv) Role-based access: **Artisan · Aggregator · Admin · Buyer**
- (v) **Aadhaar / Government ID verification** support with admin KYC review
- (vi) **Language preference settings** — Hindi, English, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Odia
- (vii) **Bank Account & Direct Payment Settlement** — Bank Account, IFSC Code, UPI ID

**Supported Craft Categories (visual tiles):**
🧵 Textiles · 🏺 Pottery · 💎 Jewelry · 🪵 Woodcraft · 🎨 Paintings · 🔨 Metal Craft

---

### Module 2 — AI Image Enhancer & Studio

**Memory-safe, production-ready AI photo studio** optimized for rural mobile cameras:

- (i) **AI Background Removal** — powered by lightweight **ONNX `u2netp` (4.57 MB)** consuming **< 80 MB RAM**
- (ii) **Edge-Safe Studio Lighting & Vibrance** — mask-aware unsharp masking (`GaussianBlur` + weighted subtraction) and LAB vibrance boost applied strictly to opaque pixels (completely eliminating CLAHE halo blur)
- (iii) **Mobile Camera & Live Webcam Support** — native smartphone camera capture (`capture="environment"`) and in-browser desktop webcam viewfinder
- (iv) **Professional formatting** — centers product on white/neutral canvas at standard e-commerce aspect ratios ($800 \times 800$)
- (v) **Batch upload & enhancement** — submit multiple images at once via `POST /enhance/batch`
- (vi) **Image quality scoring** — Laplacian sharpness, brightness, and contrast analyzed → `0–100` overall score + `Excellent / Good / Fair / Poor` rating

**Supported Product Types:**
🧵 Textiles & Handloom · 🏺 Handicrafts & Pottery · 💎 Jewelry & Accessories · 🪵 Wooden/Metal Craft · 🎨 Paintings & Wall Art

---

### Module 3 — Multilingual Auto-Cataloger (Multi-Tier AI Engine)

**Real-time voice-to-catalog pipeline with automated Groq fallback:**

- (i) **Tier 1 (Primary): Google Gemini 2.5 Flash** — multimodal audio transcription, bilingual EN+HI catalog expansion, and SEO tag extraction
- (ii) **Tier 2 (Fallback): Groq AI Agent** — ultra-fast audio transcription via **Groq Whisper-large-v3** + structured bilingual catalog synthesis via **Groq Llama-3.3-70b-versatile** (JSON mode)
- (iii) **Tier 3 (Resilience): Local Smart Synthesizer** — rule-based deterministic keyword analyzer and catalog builder ensuring zero downtime
- (iv) **Live microphone recording & speech-to-text** — animated sound wave, digital `MM:SS / 01:00` timer, and real-time transcription
- (v) **SEO-friendly description generation** — extracts materials, occasions, dimensions, and 5-8 search tags
- (vi) **Product category auto-tagging** — craft type, technique, and materials extracted automatically
- (vii) **Draft review & edit** — all generated titles, stories, and tags are fully editable before publishing

**Supported Languages:**

| Voice Input | Output |
|:---|:---|
| Hindi (hi-IN), Bengali (bn-IN), Tamil (ta-IN), Telugu (te-IN) | English (EN) |
| Marathi (mr-IN), Gujarati (gu-IN), Kannada (kn-IN), Odia (or-IN) | Hindi (HI) |

---

### Module 4 — Dynamic Pricing Assistant

**Cost-plus fair wage formula with AI market benchmarking:**

- (i) **Cost-plus fair labor formula** — ₹150/hr skilled labor benchmark + raw material costs
- (ii) **Craft value multipliers** — 1.3× (Pottery) to 2.0× (Folk Art) reflecting artistic rarity
- (iii) **AI Market Benchmarking (Gemini + Groq Llama 3.3 Fallback)** — extracts live competitor price ranges across Amazon Karigar, Etsy, and ONDC
- (iv) **3-tier price display**: Min. Breakeven · Recommended D2C · Premium · B2B Wholesale (15% bulk discount)
- (v) **Actionable pricing strategy tips** — tailored marketing recommendations to justify handmade value
- (vi) **Artisan override** — custom price entry or inline price editing in Inventory (`PUT /products/{id}/price`)

---

### Module 5 — Product Catalog & Inventory Management

**Full digital catalog lifecycle management:**

- (i) Digital catalog creation with AI-enhanced images + auto-generated bilingual descriptions
- (ii) **Inventory tracking** — stock count per product with $+/-$ incrementer
- (iii) **Inline Price Editing** — update base and suggested retail prices directly from the inventory table (`PUT /products/{id}/price`)
- (iv) **Product listing management** — 5 lifecycle states (`Active`, `Draft`, `Sold Out`, `Archived`, `Pending Review`)
- (v) **QR code catalog sharing** — every product generates a scannable QR PNG (`GET /products/{id}/qr`) for exhibitions and trade fairs
- (vi) **Dedicated Product Detail Pages** — standalone view (`ProductPage.jsx`) displaying full specifications, artisan credentials, and bulk inquiry trigger

---

### Module 6 — Market Linkage & B2B Connection

**Direct artisan-to-buyer digital channels:**

- (i) Integration hooks for GeM portal and state e-marketplaces
- (ii) **Multi-Criteria B2B buyer discovery** — filter by craft type, region, material, and price brackets
- (iii) **Inquiry & order conversation tracking** — status tracking (`Pending → Responded → Completed`)
- (iv) **Exhibition digital presence** — QR-linked virtual stalls for Shilp Samagam, Surajkund Mela, Dilli Haat
- (v) **Bulk order request handling** for aggregators and SHG coordinators
- (vi) Artisan profile visibility with verified government badge

---

### Module 7 — Analytics & Insights

**Per-listing and platform-wide analytics:**

**Artisan-Level (personal dashboard):**
- (i) Product view count tracking per listing (via `product_views` table)
- (ii) Sales performance: orders received, estimated income summary
- (iii) Top-performing products by inquiry volume
- (iv) **Visual, bilingual bar charts** for low-literacy users (*उत्पाद दृश्य, पूछताछ, अनुमानित आय*)
- (v) Downloadable CSV sales and performance reports (`GET /artisan/report`)

**Aggregator-Level (cluster analytics):**
- Cluster-wide active listings, total artisans, catalog completion percentage, and members requiring assistance.

**Admin-Level (platform-wide):**
- Total artisans, verified count, new registrations, buyer inquiries count, B2B wholesale transaction values, regional distribution, and cluster output rankings.

---

### Module 8 — Notification & Support (FCM v1 Push Engine)

**Real-time Multilingual Alert & Push Notification System:**

- (i) **Firebase Cloud Messaging (FCM HTTP v1)** — powered by `firebase-admin` for instant push notifications to mobile devices with background system tray & foreground banner handling
- (ii) **Artisan KYC & Verification Alerts** — instant alerts when Aadhaar identity, bank settlement accounts, or overall artisan status is approved or requires re-submission
- (iii) **Inventory & Out of Stock Alerts** — automatic push notifications when a product reaches `0 units` (or `Sold Out`) to prompt restocking
- (iv) **Government Scheme Broadcasts & Relays** — Admin and Aggregators broadcast central/state welfare schemes directly to targeted craft clusters
- (v) **Expiring Scheme Scanner (`POST /admin/schemes/notify-expiring`)** — automated scan alerting artisans of schemes closing within 14 days
- (vi) **Exhibition Announcements & Stall Approvals** — notifications for new national fairs (Shilp Samagam, Surajkund Mela, Dilli Haat) and live stall review decisions
- (vii) **Buyer Inquiry Lifecycles** — instant alerts when buyers inquire, and when artisans respond with quotation decisions (`Accept`, `Deny`, or `Reply`)
- (viii) **Aggregator Cluster Workflows** — alerts on cluster assignment approvals, new cluster registrations, and field-assisted artisan onboarding
- (ix) **In-App Notifications Center** with type filters, unread badges, and 1-click mark all as read (`GET /notifications`, `PUT /notifications/mark-all-read`)

---

### Module 9 — Role-Based Dashboards

#### 🧵 Artisan Dashboard
*Simplified, visual, low-literacy friendly:*
- Stat cards: Total listings, product views, inquiry count, revenue estimate.
- Top Products: Top products by inquiry + view count.
- Government Exhibitions: View upcoming fairs with 1-click stall registration.
- Quick Tools: 6-button grid (AI Studio, Inventory, Analytics, Inquiries & Alerts, Profile).

#### 🏘️ Aggregator Dashboard
*Manages a cohort of artisans across clusters:*
- Cluster summary cards (total artisans, active listings, members needing support).
- Assisted Onboarding modal for low-literacy artisans.
- Catalogue completion monitoring (`Digitized` vs `Needs Support`).
- Scheme and exhibition opportunity broadcaster.
- Official cluster report submission to MoSJE Admin.

#### 🏢 B2B Buyer Dashboard
*Procurement and order tracking:*
- Inquiry tracking table with real-time status (`Pending`, `Responded`, `Completed`).
- Verified Buyer Badge banner.
- Personalized artisan recommendations matched to past procurement interests.

#### 🏛️ Admin Dashboard (MoSJE Governance)
See [MoSJE Governance Console](#-mosje-governance-console-7-pillars) below.

---

## 🏛️ MoSJE Governance Console (7 Pillars)

| Pillar | Capability | Description |
| :--- | :--- | :--- |
| **1. Artisan KYC Verification** | Identity & Scheme Eligibility | Verify artisans via Aadhaar, bank KYC, craft specialization, state, and district. Filter by `Pending`, `Approved`, or `Rejected` with mandatory rejection reasons and audit logging. |
| **2. Cluster & Program Management** | Regional Handloom Clusters | Create craft clusters by region and specialization, assign artisans to clusters, and track cluster-level metrics (enrolled artisans, verified members, active products, buyer inquiries). |
| **3. Exhibition Registry** | Fair-to-Digital Continuity | Digitize fairs (**Shilp Samagam**, **Surajkund Mela**, **Dilli Haat**), manage lifecycle (`Upcoming → Ongoing → Completed / Cancelled`), review artisan digital registrations. |
| **4. Government Schemes & Alerts** | Scheme Broadcast Engine | Publish central/state welfare schemes, toggle active status, broadcast targeted alerts filtered by state or craft type, and inspect broadcast history logs. |
| **5. Product Listing Moderation** | Quality & Standard Control | Inspect unverified artisans' product submissions with full imagery before approving them to go live on the public directory. |
| **6. Platform Impact Analytics** | National Dashboard | Live analytics: artisan verification rates, buyer engagement, average product prices, state-wise adoption, and cluster output rankings. |
| **7. B2B Buyer Verification** | Enterprise Buyer KYC | Audit and verify institutional buyers, export houses, and retail chains before granting direct artisan outreach privileges. |

---

## 🔄 System Architecture & Data Flow

### High-Level System Architecture

```mermaid
flowchart TB
    subgraph Client["Frontend Client (React 18 + Vite) — 29 Components"]
        UI[KalaSetu React SPA]
        subgraph Dashboards["Role-Based Dashboards"]
            ArtisanD[Artisan Dashboard]
            AggregatorD[Aggregator Dashboard]
            BuyerD[Buyer Dashboard]
            AdminD[MoSJE Admin Console]
        end
        subgraph ArtisanTools["Artisan Tools"]
            Studio[AI Studio — 4 Steps]
            Inventory[Inventory Manager]
            Analytics[Analytics & Reports]
            Notifs[Notifications Center]
            Profile[Artisan Profile & Bank]
        end
        subgraph Common["Common"]
            Market[B2B Marketplace]
            ProductView[Dedicated Product Page]
            Onboard[Onboarding Wizard]
            STT[Web SpeechRecognition]
        end
    end

    subgraph Backend["FastAPI Application Server — 62+ Endpoints"]
        API[FastAPI Router & JWT Middleware]
        ImgSvc[ImageProcessor — OpenCV + u2netp]
        CatSvc[Cataloger — Gemini 1.5 Flash]
        PriceSvc[Pricing Assistant Engine]
        AnalyticsSvc[Analytics Service]
        AuthSvc[Bcrypt + JWT Security]
    end

    subgraph Storage["Data & Model Layer"]
        PG[(PostgreSQL 15+\n19 Tables)]
        ONNX[u2netp ONNX Model\n4.57 MB]
        GeminiCloud[Google Gemini API]
        QRLib[qrcode Library]
    end

    Client -->|HTTP / Multipart / JWT| API
    API --> ImgSvc --> ONNX
    API --> CatSvc --> GeminiCloud
    API --> PriceSvc
    API --> AnalyticsSvc
    API --> AuthSvc
    API --> PG
    API --> QRLib
```

---

## 🗄️ Database Schema (Entity-Relationship)

19 PostgreSQL tables across 5 functional groups:

```mermaid
erDiagram
    USERS ||--o| ARTISAN_PROFILES : "has profile"
    USERS ||--o| ADMIN_USERS : "has admin record"
    USERS ||--o{ ARTISAN_VERIFICATIONS : "submitted by"
    USERS ||--o{ BUYER_INQUIRIES : "sent by (Buyer)"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ CLUSTER_ARTISANS : "member of"
    USERS ||--o{ EXHIBITION_REGISTRATIONS : "registers for"
    USERS ||--o{ MANAGED_CLUSTERS : "manages (Aggregator)"
    USERS ||--o{ SCHEME_ALERTS : "broadcasts (Admin)"

    ARTISAN_PROFILES ||--o{ PRODUCTS : "creates"
    ARTISAN_PROFILES ||--o{ VOICE_INPUTS : "records"

    PRODUCTS ||--o{ PRODUCT_IMAGES : "has images"
    PRODUCTS ||--o{ BUYER_INQUIRIES : "subject of"
    PRODUCTS ||--o{ PRICING_SUGGESTIONS : "priced by"
    PRODUCTS ||--o{ PRODUCT_VIEWS : "tracked by"
    PRODUCTS ||--o{ VOICE_INPUTS : "described by"

    CLUSTERS ||--o{ CLUSTER_ARTISANS : "contains"
    EXHIBITIONS ||--o{ EXHIBITION_REGISTRATIONS : "includes"
    GOVT_SCHEMES ||--o{ SCHEME_ALERTS : "broadcasts"
    ADMIN_USERS ||--o{ AUDIT_LOGS : "logs actions"

    USERS {
        uuid id PK
        string username UK
        string email UK
        string phone_number UK
        string password_hash
        string full_name
        string role "Admin | Artisan | Buyer | Aggregator"
        string state
        string district
        string preferred_language
        boolean is_verified
        datetime created_at
    }

    ARTISAN_PROFILES {
        uuid id PK
        uuid user_id FK
        string craft_type
        string cluster_name
        string aadhaar_number
        string bank_account
        string ifsc_code
        string upi_id
        boolean govt_scheme_beneficiary
        string photo_url
    }

    PRODUCTS {
        uuid id PK
        uuid artisan_id FK
        string title_en
        string title_hi
        string description_en
        string description_hi
        string craft_category
        string material
        string dimensions
        decimal base_price
        decimal suggested_price
        integer stock_count
        integer view_count
        string status "Active|Draft|Sold Out|Archived|Pending Review"
        datetime created_at
    }

    PRODUCT_IMAGES {
        uuid id PK
        uuid product_id FK
        string original_url
        string enhanced_url
        boolean bg_removed
        boolean is_primary
        integer display_order
    }

    PRODUCT_VIEWS {
        uuid id PK
        uuid product_id FK
        string viewer_ip
        datetime viewed_at
    }

    PRICING_SUGGESTIONS {
        uuid id PK
        uuid product_id FK
        decimal min_price
        decimal suggested_price
        decimal premium_price
        string pricing_rationale
        jsonb market_data_snapshot
        datetime generated_at
    }

    VOICE_INPUTS {
        uuid id PK
        uuid product_id FK
        uuid artisan_id FK
        string audio_url
        string source_language
        string transcribed_text
        string translated_en
        string translated_hi
        string processing_status "Pending|Processing|Completed|Failed"
    }

    BUYER_INQUIRIES {
        uuid id PK
        uuid product_id FK
        uuid buyer_id FK
        uuid artisan_id FK
        integer quantity
        string message
        string status "Pending|Responded|Completed"
        datetime created_at
        datetime responded_at
    }

    NOTIFICATIONS {
        uuid id PK
        uuid user_id FK
        string title
        string body
        string lang_tag
        string type "System|Inquiry|Verification|Update"
        boolean is_read
        datetime sent_at
    }

    CLUSTERS {
        uuid id PK
        string cluster_name
        string state
        string district
        string craft_specialization
        uuid aggregator_id FK
        integer total_artisans
    }

    CLUSTER_ARTISANS {
        uuid id PK
        uuid cluster_id FK
        uuid artisan_id FK
        datetime joined_at
    }

    ARTISAN_VERIFICATIONS {
        uuid id PK
        uuid artisan_id FK
        uuid reviewed_by FK
        string status "Pending|Approved|Rejected"
        string rejection_reason
        boolean aadhaar_verified
        boolean bank_verified
        datetime submitted_at
        datetime reviewed_at
    }

    GOVT_SCHEMES {
        uuid id PK
        string scheme_name
        string description
        string eligibility_criteria
        string application_url
        uuid created_by FK
        boolean is_active
        date valid_until
    }

    SCHEME_ALERTS {
        uuid id PK
        uuid scheme_id FK
        uuid sent_by FK
        string target_state
        string target_craft_type
        integer recipients_count
        datetime sent_at
    }

    EXHIBITIONS {
        uuid id PK
        string name
        string location
        string status "Upcoming|Ongoing|Completed|Cancelled"
        date start_date
        date end_date
        uuid created_by FK
        boolean is_active
    }

    EXHIBITION_REGISTRATIONS {
        uuid id PK
        uuid exhibition_id FK
        uuid artisan_id FK
        string status "Pending|Approved|Rejected|Attended"
        datetime registered_at
    }

    ADMIN_USERS {
        uuid id PK
        uuid user_id FK
        string department
        string designation
        string access_level "Superadmin|Editor|Viewer"
        datetime last_login
    }

    AUDIT_LOGS {
        uuid id PK
        uuid admin_id FK
        string action
        string entity_type
        uuid entity_id
        jsonb change_snapshot
        string ip_address
        datetime created_at
    }
```

---

## 📡 API Endpoint Reference (62+ Endpoints)

### 🔐 Authentication & User Management

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register Artisan, Buyer, Aggregator, or Admin with role, language, and craft details. |
| `POST` | `/auth/login` | Public | Authenticate and receive a JWT Bearer token. |
| `GET` | `/auth/me` | Authenticated | Retrieve current user profile and verification status. |
| `POST` | `/auth/fcm-token` | Authenticated | Register or update FCM device push token for the current user. |

---

### 🪄 AI Studio & Processing

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/enhance` | Artisan | Remove background with `u2netp` ONNX, apply mask-aware lighting, return enhanced PNG + quality score. |
| `POST` | `/enhance/batch` | Artisan | Batch enhance multiple product images. Returns array of Base64 results + quality scores. |
| `POST` | `/catalog` | Artisan | Voice/text → bilingual EN+HI catalog via Google Gemini 1.5 Flash. |
| `POST` | `/suggest-price` | Artisan | Fair wage + retail + B2B price suggestion from material cost, hours, and category. |

---

### 📦 Product Catalog & Inventory

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/products` | Artisan | Create a listing. Auto-routes to `Pending Review` if artisan KYC is pending. |
| `GET` | `/products` | Public | Multi-criteria search/filter by category, region, material, price brackets, or keyword. |
| `GET` | `/products/{id}` | Public | Get single product detail. Increments `view_count` and logs `ProductView`. |
| `PUT` | `/products/{id}` | Artisan | Update product title, description, price, or stock. |
| `DELETE` | `/products/{id}` | Artisan | Archive (soft-delete) a product listing. |
| `PUT` | `/products/{id}/status` | Artisan | Toggle status: `Active · Draft · Sold Out · Archived · Pending Review`. |
| `PUT` | `/products/{id}/stock` | Artisan | Update stock count. Auto-sets `Sold Out` and triggers Out of Stock push alert when 0. |
| `PUT` | `/products/{id}/price` | Artisan | Update base price and suggested retail price directly. |
| `GET` | `/products/{id}/qr` | Public | Generate and return a scannable QR code PNG for catalog sharing at exhibitions. |

---

### 🧵 Artisan Profile & Dashboard

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/artisan/dashboard` | Artisan | Summary dashboard: listing counts, views, inquiries, revenue estimate, pending items, upcoming exhibitions. |
| `GET` | `/artisan/profile` | Artisan | Full profile: user info, craft type, cluster, bank details, Aadhaar, KYC status. |
| `PUT` | `/artisan/profile` | Artisan | Update language preference, craft type, bank account, IFSC, UPI ID, Aadhaar, name, region. |
| `GET` | `/artisan/analytics` | Artisan | Per-product analytics: views, inquiries, completed orders, revenue estimate, top products. |
| `GET` | `/artisan/report` | Artisan | Export full analytics as downloadable CSV file. |

---

### 🏘️ Aggregator Dashboard

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/aggregator/dashboard` | Aggregator | Summary across all managed clusters: artisan count, catalog status, artisans needing support. |
| `GET` | `/aggregator/artisans` | Aggregator | Full list of all artisans across aggregator's clusters with verification and listing status. |
| `POST` | `/aggregator/artisans/onboard` | Aggregator | Assisted registration of low-literacy artisans directly into the cluster with push notification. |
| `POST` | `/aggregator/schemes/relay` | Aggregator | Broadcast scheme alerts & exhibition opportunities to all cluster artisans via push & DB. |
| `POST` | `/aggregator/reports/submit` | Aggregator | Formally submit cluster progress report to MoSJE Admin. |
| `GET` | `/clusters` | Aggregator / Admin | List all craft clusters. |
| `POST` | `/clusters` | Admin / Aggregator | Create a new cluster and assign aggregator. |
| `GET` | `/clusters/my-clusters` | Aggregator | List clusters managed by the current aggregator. |
| `POST` | `/aggregator/join-cluster` | Aggregator | Adopt and claim an unassigned cluster. |
| `POST` | `/clusters/{id}/artisans` | Admin / Aggregator | Add an artisan to a cluster. |
| `GET` | `/clusters/{id}/artisans` | Admin / Aggregator | List all artisans within a cluster. |

---

### 🏢 B2B Buyer Dashboard

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/buyer/dashboard` | Buyer | Inquiry history, status summary (Pending/Responded/Completed), suggested artisans. |
| `POST` | `/inquiries` | Buyer | Submit bulk order quotation inquiry to an artisan (dispatches instant push to artisan). |
| `GET` | `/inquiries` | Authenticated | List sent or received inquiries. |
| `POST` | `/inquiries/{id}/respond` | Artisan | Respond with decision (`Accepted`, `Denied`, `Responded`) and custom message (pushes to buyer). |

---

### 🔔 Notifications & Push Alerts

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications` | Authenticated | Fetch all user-scoped notifications (inquiry alerts, scheme alerts, verifications, system). |
| `POST` | `/notifications` | Admin | Broadcast or send a notification to a specific user. |
| `PUT` | `/notifications/{id}/read` | Authenticated | Mark a single notification as read. |
| `PUT` | `/notifications/mark-all-read` | Authenticated | Mark all notifications as read for the current user. |

---

### 🛡️ MoSJE Administration & Governance

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/users` | Admin | List all registered users with role filter. |
| `POST` | `/admin/verify-artisan/{id}` | Admin | Quick-verify artisan with instant push notification. |
| `GET` | `/admin/verifications` | Admin | Artisan KYC queue with `status_filter` (Pending/Approved/Rejected). |
| `POST` | `/admin/verifications/{id}/review` | Admin | Approve or reject artisan KYC with Aadhaar/bank flags and push breakdown. |
| `GET` | `/admin/analytics` | Admin | Platform-wide metrics: verification rates, engagement, prices, state breakdown, cluster rankings. |
| `GET` | `/admin/audit-logs` | Admin | Tamper-evident audit trail of all administrative actions. |
| `GET` | `/admin/products/flagged` | Admin | List products awaiting moderation (from unverified artisans). |
| `POST` | `/admin/products/{id}/moderate` | Admin | Approve (`Active`) or archive (`Archived`) a product with audit log entry. |
| `POST` | `/admin/schemes` | Admin | Publish a new government welfare scheme with automatic broadcast push. |
| `GET` | `/admin/schemes` | Public / Admin | List all active government schemes. |
| `PUT` | `/admin/schemes/{id}` | Admin | Update scheme details or toggle active status. |
| `POST` | `/admin/schemes/{id}/alert` | Admin | Broadcast targeted alert filtered by state or craft type. |
| `POST` | `/admin/schemes/notify-expiring` | Admin | Scan and push expiring scheme alerts (closing within 14 days) to artisans. |
| `GET` | `/admin/schemes/{id}/alerts` | Admin | View broadcast history for a scheme. |
| `POST` | `/admin/exhibitions` | Admin | Schedule a new fair and push broadcast to all artisans and aggregators. |
| `GET` | `/admin/exhibitions` | Public / Admin | List all physical fairs & exhibitions. |
| `PUT` | `/admin/exhibitions/{id}/status` | Admin | Update fair lifecycle status. |
| `POST` | `/admin/exhibitions/{id}/register` | Artisan | Register artisan digitally for an exhibition stall. |
| `POST` | `/admin/exhibitions/registrations/{id}/status` | Admin | Approve or reject artisan exhibition registration with stall push notification. |
| `GET` | `/admin/exhibitions/{id}/registrations` | Admin | List all registrations for a fair. |
| `GET` | `/admin/exhibitions/{id}/registrations/detailed` | Admin | Detailed artisan registration data for a fair. |
| `GET` | `/admin/buyers` | Admin | Directory of all B2B buyers and their inquiry history. |
| `POST` | `/admin/buyers/{id}/verify` | Admin | Grant or revoke verified buyer credentials with push alert. |
| `GET` | `/admin/clusters/{id}/stats` | Admin | Cluster performance: member count, verified artisans, active products, inquiry volume. |

---

## 💰 Dynamic Pricing & Fair Wage Engine

The pricing assistant uses a **cost-plus fair wage formula** combined with **craft value multipliers**:

$$\text{Fair Labor Wage} = \text{Manufacturing Hours} \times ₹150/\text{hr}$$

$$\text{Min. Production Floor} = \text{Raw Material Cost} + \text{Fair Labor Wage}$$

$$\text{Recommended Retail Price (D2C)} = \text{Min. Production Floor} \times \text{Craft Multiplier}$$

$$\text{B2B Wholesale Price} = \text{Recommended Retail Price} \times 0.85\quad (\text{15\% Bulk Discount})$$

$$\text{Market Range} = [\text{Retail Price} \times 0.90] \quad\text{to}\quad [\text{Retail Price} \times 1.40]$$

### Craft Multiplier Table

| Craft Category | Multiplier | Rationale |
|:---|:---|:---|
| Folk Paintings & Art | **2.0×** | High artistic originality, one-of-a-kind uniqueness |
| Tribal & Silver Jewelry | **1.8×** | Precious material handling & intricate filigree |
| Textiles & Handloom | **1.5×** | Complex loom setup & warp/weft intricacy |
| Handicrafts & Woodwork | **1.4×** | Carving time, seasoning & decorative demand |
| Clay & Blue Pottery | **1.3×** | Clay volume, kiln firing cycles & daily utility |

### Living Wage Benchmark

The **₹150/hr (₹1,200/day)** benchmark is derived from:
- MNREGA 2024 floor wage: ₹267/day → skilled handicraft premium: ~4.5× unskilled rural rate
- PM Vishwakarma Yojana recognized artisan skill compensation frameworks

---

## 🛠️ Tech Stack

### Frontend

| Technology | Version | Purpose |
|:---|:---|:---|
| React | 18.2.0 | Component-based SPA with hooks and context |
| Vite | 5.4.0 | Lightning-fast HMR dev server + production bundler |
| Lucide React | Latest | Consistent icon system (100+ icons) |
| Web SpeechRecognition | Native Browser | Real-time speech-to-text in 9 Indian languages |
| MediaRecorder API | Native Browser | Live microphone recording with waveform animation |
| CSS3 Design System | Custom | Dark theme — Marigold `#E67E22` + Terracotta `#D35400` |

### Backend

| Technology | Version | Purpose |
|:---|:---|:---|
| FastAPI | ≥0.100.0 | High-performance async REST API framework |
| Uvicorn | ≥0.22.0 | ASGI server for FastAPI |
| SQLAlchemy | ≥2.0.0 | ORM with relationship mapping + async support |
| PostgreSQL | 15+ | Primary relational database (19 tables) |
| psycopg2-binary | ≥2.9.6 | PostgreSQL Python driver |
| Pydantic | v2 | Request/response schema validation |
| python-jose | ≥3.3.0 | JWT token generation and verification |
| passlib[bcrypt] | ≥1.7.4 | Password hashing (bcrypt) |
| rembg | ≥2.0.50 | AI background removal (wraps ONNX u2netp) |
| Pillow | ≥10.0.0 | Image processing, resizing, canvas operations |
| opencv-python | ≥4.8.0 | Mask-aware unsharp enhancement, quality scoring |
| google-genai | ≥1.0.0 | Google Gemini 2.5 Flash multimodal API (Primary AI) |
| groq | ≥0.9.0 | Groq Whisper + Llama 3.3 70B API (Fallback AI Agent) |
| firebase-admin | ≥6.0.0 | Firebase Cloud Messaging (FCM HTTP v1) push engine |
| qrcode[pil] | Latest | QR code PNG generation for catalog sharing |
| python-dotenv | ≥1.0.0 | Environment variable loading |
| python-multipart | ≥0.0.6 | File upload support |

---

## ⚙️ Setup & Installation Guide

### Prerequisites

* **Node.js** (v18 or higher) & **npm**
* **Python** (v3.10 or higher)
* **PostgreSQL Server** (running on port `5432` or cloud instance)

---

### Step 1: Clone & Configure Environment

Navigate into the project directory:

```powershell
cd Kama-Setu
```

Create `backend/.env` (use `backend/.env.example` as template):

```env
# PostgreSQL Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/kala_setu

# JWT Authentication
SECRET_KEY=your_secret_jwt_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Google Gemini 1.5 Flash for voice transcription & catalog generation
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Cloud Messaging Credentials
# Option A (Local File): Place your downloaded service account JSON at backend/firebase-credentials.json
GOOGLE_APPLICATION_CREDENTIALS=firebase-credentials.json

# Option B (Production / Render): Raw JSON string
# FIREBASE_CREDENTIALS_JSON={"type": "service_account", ...}
```

---

### Step 2: Backend Installation

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

---

### Step 3: Frontend Installation

```powershell
cd ..\frontend
npm install
```

---

### Step 4: Run Database Migration & Default Admin Seed

From the `Kama-Setu/backend` directory:

```powershell
python migrate.py
```

> This executes automatic migrations across all 19 tables and seeds the default administrator account (`admin` / `admin`).

---

## 🚀 How to Run

### Option 1: Quick Launch (Windows)

Double-click [`run.bat`](run.bat) in the project root. Launches backend on port `8000`, frontend on port `5173`, and opens your browser automatically.

---

### Option 2: Manual Startup (Two Terminals)

**Terminal 1 — FastAPI Backend:**
```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — React Vite Frontend:**
```powershell
cd frontend
npm run dev
```

---

### Service URLs

| Service | URL | Notes |
|:---|:---|:---|
| React Frontend | http://localhost:5173 | Role-based SPA |
| FastAPI Backend | http://localhost:8000 | REST API |
| Swagger UI (API Docs) | http://localhost:8000/docs | Interactive endpoint explorer |
| ReDoc | http://localhost:8000/redoc | Readable API documentation |

---

### Default Test Credentials

All pre-seeded accounts use the password: **`asdfghjkl`**

| Role | Username / Phone | Password | Notes |
|:---|:---|:---|:---|
| **MoSJE Admin** | `admin` | `asdfghjkl` | Full governance console access |
| **Artisan** | `1234567890` | `asdfghjkl` | Verified artisan with active listings |
| **Artisan** | `8595630567` | `asdfghjkl` | Registered artisan |
| **Aggregator** | `1234` | `asdfghjkl` | Cluster aggregator |
| **B2B Buyer** | `123` | `asdfghjkl` | Verified enterprise buyer |
| **B2B Buyer** | `pkgirpade` | `asdfghjkl` | Registered buyer |

---

## 🐛 Known Issues & Fixes

### Products / Marketplace not loading on `localhost:8000`

**Symptom:** `/products` endpoint returns `HTTP 401` when accessed from the Flutter app or web frontend on localhost, but works fine on the deployed URL.

**Root Cause:** `get_current_user` in `auth.py` was raising a hard `HTTP 401` exception when a stored JWT token was present but invalid or expired (e.g. a token issued by the deployed backend being sent to a fresh local server). Since `/products` uses `Optional[models.User]`, it should gracefully handle missing or invalid auth — but the exception was killing the request before the DB query ran.

**Fix applied in `auth.py`:** `get_current_user` now returns `None` instead of raising on invalid/expired tokens. Endpoints that strictly require authentication (`/auth/me`, `/artisan/dashboard`, etc.) already perform their own `if not current_user: raise HTTPException(401)` check.

```python
# Before (broken on localhost with stale token)
except JWTError:
    raise credentials_exception  # killed /products with 401

# After (fixed)
except JWTError:
    return None  # public endpoints continue normally
```

A `get_password_hash = hash_password` alias was also added to `auth.py` since `main.py` calls `auth.get_password_hash()` in the aggregator onboard endpoint.

---

<div align="center">

**KalaSetu (कला सेतु)** — *Empowering Indian Artisans through AI, Fair Wages & Digital Market Linkages.*  
Developed for the **Smart India Hackathon (SIH26090)** under the **Ministry of Social Justice & Empowerment (MoSJE)**.

*62+ API Endpoints · 19 DB Tables · 29 React Components · Flutter Mobile App · 9 Platform Modules · 4 User Roles*

</div>
