# 🎨 KalaSetu Dynamic Pricing Engine (ML Subsystem)
### *AI-Powered Fair Price Recommendation & MoSJE Fair Wage Floor Enforcement for Indian Artisans*

---

## 📌 Overview

The **KalaSetu Dynamic Pricing Engine** is a specialized machine learning microservice developed under the **Ministry of Social Justice and Empowerment (MoSJE)** initiative. It empowers marginalized Indian artisans by calculating fair, competitive, and sustainable market prices for handcrafted cultural products.

### 🌟 Key Highlights
- **Model Architecture**: GPU-Accelerated XGBoost Regressor (`tree_method="hist"`, `device="cuda"` / CPU fallback) with Optuna hyperparameter optimization.
- **Explainable AI (XAI)**: Integrated **SHAP (SHapley Additive exPlanations)** TreeExplainer delivering real-time feature contribution scores to the artisan dashboard.
- **Statutory Fair Wage Floor**: Automatically calculates and enforces a minimum living wage floor based on the Ministry of Labour's regional wage index:
  $$\text{Fair Wage Floor} = \text{Raw Material Cost} + \left(\frac{\text{Labor Hours}}{8} \times \text{State Daily Minimum Wage} \times 1.3\right)$$
- **Confidence Intervals**: Emits dynamic $\pm 15\%$ price bounds to provide artisans flexible bargaining room.
- **GI-Tag & Bulk Pricing**: Built-in support for Geographical Indication premiums and B2B wholesale discounts.
- **Production API**: Standalone FastAPI microservice running on **Port 8001**, seamlessly integrated with the KalaSetu backend (`port 8000`) and React frontend (`port 5173`).

---

## 📁 Repository Structure

```
ML/
├── .venv/                         # Python Virtual Environment
├── raw_datasets/                  # Raw artisan data & scraped catalog sources
├── shap_plots/                    # Exported SHAP feature importance & dependence plots
├── frontend/
│   └── index.html                 # Standalone interactive browser testing studio
├── data_pipeline.py               # Data ingestion, cleaning & domain feature engineering
├── merge_real_datasets.py         # Real-world dataset harmonizer (Amazon/Flipkart/Etsy)
├── train.py                       # GPU-accelerated XGBoost training + Optuna HPO
├── train-model.py                 # One-shot end-to-end orchestrator (Data → Train → Eval)
├── evaluate.py                    # Evaluation metrics (R², MAE, MAPE) & SHAP visualization
├── pricing_service.py             # FastAPI microservice serving /predict-price on Port 8001
├── requirements_ml.txt            # Pinned dependencies for Python 3.10+
├── kala_setu_pricing.ubj          # Serialized XGBoost production binary model
├── feature_cols.pkl               # Serialized feature column list
├── optuna_study.pkl               # Serialized Optuna hyperparameter study
└── README.md                      # This documentation guide
```

---

## 🚀 Quick Start Guide

### Step 1: Environment Setup

Ensure you have **Python 3.10+** installed. Navigate to the `ML` directory:

```powershell
cd ML
```

#### 1. Create a Virtual Environment
```powershell
python -m venv .venv
```

#### 2. Activate the Virtual Environment
- **PowerShell (Windows)**:
  ```powershell
  .\.venv\Scripts\Activate.ps1
  ```
  *(If execution policies block scripts, run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`)*

- **Command Prompt (CMD)**:
  ```cmd
  .\.venv\Scripts\activate.bat
  ```

- **Linux / macOS**:
  ```bash
  source .venv/bin/activate
  ```

#### 3. Install Required Dependencies
```powershell
pip install -r requirements_ml.txt
```

---

### Step 2: Start the Pricing Microservice

You can launch the FastAPI server either using Python directly or via `uvicorn`:

#### Option A: Direct Python Execution
```powershell
python pricing_service.py
```

#### Option B: Using Uvicorn (Recommended for Development)
```powershell
uvicorn pricing_service:app --host 0.0.0.0 --port 8001 --reload
```

When started successfully, you will see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Loading KalaSetu pricing model from kala_setu_pricing.ubj...
INFO:     SHAP TreeExplainer initialised.
INFO:     ✓ Pricing model pre-loaded successfully.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

---

## 🌐 Endpoints & Interactive Documentation

Once the server is running on port **8001**:

| Resource | URL | Description |
| :--- | :--- | :--- |
| **Interactive Swagger Docs** | [http://localhost:8001/docs](http://localhost:8001/docs) | Test endpoints directly with OpenAPI UI |
| **ReDoc Documentation** | [http://localhost:8001/redoc](http://localhost:8001/redoc) | Alternative visual API specification |
| **Health Check** | [http://localhost:8001/health](http://localhost:8001/health) | Verifies model & SHAP explainer status |
| **Predict Price Endpoint** | `POST http://localhost:8001/predict-price` | Main inference API |
| **Standalone Web Tester** | Open `ML/frontend/index.html` | Visual UI playground with live SHAP charts |

---

## 🧪 Testing the API

### 1. Health Check (`GET /health`)
```bash
curl -X GET http://localhost:8001/health
```

**Response**:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_path": "d:\\projects compiled\\Kala-Setu\\ML\\kala_setu_pricing.ubj",
  "feature_count": 24,
  "shap_enabled": true,
  "service": "kala_setu_pricing_engine"
}
```

---

### 2. Predict Price (`POST /predict-price`)

#### Sample Request (`cURL`):
```bash
curl -X POST "http://localhost:8001/predict-price" \
     -H "Content-Type: application/json" \
     -d '{
       "craft_category": "Textiles",
       "material_type": "Silk",
       "region_state": "Uttar Pradesh",
       "gi_tag_certified": true,
       "artisan_experience_yrs": 8,
       "raw_material_cost_inr": 1200.0,
       "labor_hours_estimated": 16.0,
       "product_complexity": 4,
       "bulk_order_qty": 1,
       "season_quarter": 4,
       "state_min_wage_inr": 450.0,
       "listing_views_30d": 240,
       "inquiry_count_30d": 12
     }'
```

#### Sample Request (PowerShell):
```powershell
$body = @{
    craft_category         = "Textiles"
    material_type          = "Silk"
    region_state           = "Uttar Pradesh"
    gi_tag_certified       = $true
    artisan_experience_yrs = 8
    raw_material_cost_inr  = 1200.0
    labor_hours_estimated  = 16.0
    product_complexity     = 4
    bulk_order_qty         = 1
    season_quarter         = 4
    state_min_wage_inr     = 450.0
    listing_views_30d      = 240
    inquiry_count_30d      = 12
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8001/predict-price" -Method Post -ContentType "application/json" -Body $body
```

#### Sample Response:
```json
{
  "predicted_price_inr": 4850.00,
  "price_lower_bound_inr": 4122.50,
  "price_upper_bound_inr": 5577.50,
  "fair_wage_floor_inr": 2370.00,
  "floor_compliant": true,
  "gi_premium_applied": true,
  "bulk_discount_applied": false,
  "shap_top_features": [
    {
      "feature": "raw_material_cost_inr",
      "display_name": "Raw Material Cost (कच्चे माल की लागत)",
      "shap_value": 1420.50,
      "direction": "increases_price",
      "relative_importance_pct": 38.2
    },
    {
      "feature": "labor_hours_estimated",
      "display_name": "Labor Hours (श्रम के घंटे)",
      "shap_value": 980.20,
      "direction": "increases_price",
      "relative_importance_pct": 26.4
    },
    {
      "feature": "product_complexity",
      "display_name": "Craft Complexity (शिल्प की जटिलता)",
      "shap_value": 510.10,
      "direction": "increases_price",
      "relative_importance_pct": 13.7
    },
    {
      "feature": "gi_tag_certified",
      "display_name": "GI Tag Certified (जीआई टैग प्रमाणन)",
      "shap_value": 450.00,
      "direction": "increases_price",
      "relative_importance_pct": 12.1
    },
    {
      "feature": "artisan_experience_yrs",
      "display_name": "Artisan Experience (कारीगर का अनुभव)",
      "shap_value": 360.80,
      "direction": "increases_price",
      "relative_importance_pct": 9.6
    }
  ]
}
```

---

## 🛠️ Full Model Pipeline & Training Workflows

If you want to re-train the model, update features, or generate fresh SHAP evaluation charts:

### 1. One-Shot Orchestrator (`train-model.py`)

Runs the entire pipeline end-to-end: **Data Preprocessing $\rightarrow$ Optuna HPO Training $\rightarrow$ Evaluation & SHAP Plots**.

```powershell
# Standard training pipeline (uses real datasets or synthetic fallback):
python train-model.py

# Fast training (skips Optuna HPO, uses baseline hyperparameters):
python train-model.py --skip-hpo

# Training against live PostgreSQL database:
python train-model.py --database-url "postgresql://postgres:password@localhost:5432/kalasetu_db"

# Evaluation only (generates metrics & SHAP charts for existing model):
python train-model.py --eval-only
```

#### CLI Parameters:
| Argument | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `--database-url` | `str` | `None` | PostgreSQL connection URI for live artisan records |
| `--no-real-data` | `flag` | `False` | Disables real datasets and forces synthetic data generation |
| `--n-synthetic` | `int` | `15000` | Number of synthetic records if real datasets are not found |
| `--n-trials` | `int` | `50` | Number of Optuna optimization trials |
| `--skip-hpo` | `flag` | `False` | Uses pre-tuned baseline hyperparams for fast build |
| `--eval-only` | `flag` | `False` | Runs model evaluation without re-training |
| `--shap-sample` | `int` | `500` | Sample size for computing SHAP plots |

---

### 2. Step-by-Step Pipeline Execution

You can also run each pipeline module independently:

```powershell
# Step 1: Feature Engineering & Ingestion
python data_pipeline.py

# Step 2: GPU-Accelerated XGBoost Training + Optuna HPO
python train.py

# Step 3: Model Evaluation & SHAP Plot Generation
python evaluate.py
```

---

## ⚙️ Environment Variables & Configuration

The pricing service can be configured via environment variables or a `.env` file in the root / `ML` directory:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8001` | Microservice listening port |
| `MODEL_PATH` | `kala_setu_pricing.ubj` | Path to serialized XGBoost model binary |
| `FEAT_COLS_PATH` | `feature_cols.pkl` | Path to feature columns pickle file |
| `SECRET_KEY` | `artisan_ai_super_secret_key_123_hackathon_token` | JWT verification secret key |
| `ALGORITHM` | `HS256` | JWT signing algorithm |

> **Authentication Note**: The microservice accepts JWT bearer tokens from registered KalaSetu users or internal service tokens (`internal_service_call`). For testing, unauthenticated requests gracefully fallback to guest mode.

---

## ⚡ GPU vs. CPU Hardware Acceleration

- **NVIDIA GPU (CUDA)**:
  - Configured with `tree_method="hist"` and `device="cuda"`.
  - Tested on NVIDIA GeForce RTX 3050 (4 GB VRAM) with automatic VRAM garbage collection.
- **CPU Fallback**:
  - If CUDA is not detected or no NVIDIA GPU is present, XGBoost automatically falls back to multi-threaded CPU execution (`tree_method="hist"`, `device="cpu"`). No code changes required.

---

## 🖥️ Full Platform Launch (All Services)

To run the entire KalaSetu platform (ML Service + Backend Server + React Frontend) concurrently:

From the workspace root directory:
```powershell
.\run.bat
```

This launches:
1. 🧠 **ML Pricing Engine**: `http://localhost:8001`
2. ⚙️ **FastAPI Backend Server**: `http://localhost:8000`
3. 💻 **React Web Application**: `http://localhost:5173`
