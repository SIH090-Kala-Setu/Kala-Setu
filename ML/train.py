"""
train.py — KalaSetu Dynamic Pricing Engine
GPU-Accelerated XGBoost Training + Optuna Hyperparameter Optimisation
RTX 3050 · 4 GB VRAM — device="cuda", tree_method="hist"

ट्रेनिंग स्क्रिप्ट — कलासेतु गतिशील मूल्य निर्धारण इंजन
GPU-त्वरित XGBoost प्रशिक्षण + Optuna हाइपरपैरामीटर अनुकूलन
"""

import gc
import logging
import os
import pickle
import time
import warnings
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import optuna
import pandas as pd
import xgboost as xgb
from optuna.pruners import MedianPruner
from optuna.samplers import TPESampler
from sklearn.metrics import mean_absolute_error, r2_score

warnings.filterwarnings("ignore", category=UserWarning)
optuna.logging.set_verbosity(optuna.logging.WARNING)

# ──────────────────────────────────────────────
# Logging / लॉगिंग
# ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("kala_setu.train")

# ──────────────────────────────────────────────
# File Paths / फ़ाइल पथ
# ──────────────────────────────────────────────
PROCESSED_PARQUET = Path("processed_artisan_data.parquet")
MODEL_OUTPUT      = Path("kala_setu_pricing.ubj")
STUDY_OUTPUT      = Path("optuna_study.pkl")
RANDOM_SEED       = 42

# ──────────────────────────────────────────────
# Feature & Target Columns / फीचर और लक्ष्य कॉलम
# ──────────────────────────────────────────────
TARGET_COL = "fair_price_inr"

# Columns to exclude from training features
# प्रशिक्षण फीचर्स से बाहर करने के लिए कॉलम
EXCLUDE_COLS = [
    TARGET_COL,
    "implied_hourly_return",   # derived from target — data leakage risk
    "fair_wage_floor_inr",     # used in inference for floor enforcement, not training
]


def get_feature_cols(df: pd.DataFrame) -> List[str]:
    """Return list of feature column names (excludes target & leakage cols)."""
    return [c for c in df.columns if c not in EXCLUDE_COLS]


# ──────────────────────────────────────────────
# DMatrix Builder / DMatrix बिल्डर
# ──────────────────────────────────────────────
def build_dmatrix(X: pd.DataFrame, y: Optional[pd.Series] = None) -> xgb.DMatrix:
    """
    Build XGBoost DMatrix with GPU-compatible categorical encoding.
    GPU-संगत कैटेगोरिकल एन्कोडिंग के साथ XGBoost DMatrix बनाएं।

    enable_categorical=True lets XGBoost handle pandas CategoricalDtype
    natively on GPU — no manual LabelEncoder needed.
    """
    return xgb.DMatrix(X, label=y, enable_categorical=True)


# ──────────────────────────────────────────────
# Baseline GPU Params (from prompt specification)
# बेसलाइन GPU पैरामीटर
# ──────────────────────────────────────────────
BASELINE_PARAMS: Dict = {
    # ── GPU Configuration ── RTX 3050 critical flags
    "device":          "cuda",              # Route all tree building to GPU / सभी ट्री बिल्डिंग GPU पर
    "tree_method":     "hist",              # GPU histogram — 10-20× faster than exact on tabular
    "sampling_method": "gradient_based",   # GPU-native row sampling (CPU "uniform" kills throughput)

    # ── VRAM Budget (4 GB) ── 4 GB VRAM के लिए ट्यून किया गया
    "max_bin":         512,    # 512 fits within 4 GB for <500K artisan rows
    "n_estimators":    800,
    "learning_rate":   0.03,

    # ── Regularisation — prevents overfit on small artisan datasets ──
    # छोटे कारीगर डेटासेट पर ओवरफिट को रोकता है
    "max_depth":       6,
    "min_child_weight":5,
    "subsample":       0.8,
    "colsample_bytree":0.75,
    "reg_alpha":       0.1,    # L1 regularisation
    "reg_lambda":      1.5,    # L2 regularisation
    "gamma":           0.05,

    # ── Objective ──
    "objective":       "reg:squarederror",
    "eval_metric":     ["rmse", "mae"],
    "seed":            RANDOM_SEED,
}


def check_gpu_available() -> bool:
    """
    Verify CUDA device is available for XGBoost.
    XGBoost के लिए CUDA डिवाइस उपलब्धता जाँचें।
    """
    try:
        test_data = pd.DataFrame({"x": [1.0, 2.0, 3.0]})
        dm = xgb.DMatrix(test_data, label=[1.0, 2.0, 3.0])
        booster = xgb.train(
            {"device": "cuda", "tree_method": "hist", "objective": "reg:squarederror"},
            dm,
            num_boost_round=1,
        )
        del booster
        logger.info("✓ CUDA GPU detected and working!")
        return True
    except Exception as e:
        logger.warning(f"GPU not available ({e}). Falling back to CPU training.")
        return False


# ──────────────────────────────────────────────
# Optuna Objective / Optuna उद्देश्य फ़ंक्शन
# ──────────────────────────────────────────────
def make_optuna_objective(
    dtrain: xgb.DMatrix,
    dval: xgb.DMatrix,
    y_val: np.ndarray,
    use_gpu: bool = True,
):
    """
    Factory that returns an Optuna objective function for XGBoost HPO.
    XGBoost HPO के लिए Optuna उद्देश्य फ़ंक्शन।

    Optimises RMSE on the validation set over 50 trials.
    """
    def objective(trial: optuna.Trial) -> float:
        params = {
            # GPU flags — fixed / GPU फ्लैग — निश्चित
            "device":          "cuda" if use_gpu else "cpu",
            "tree_method":     "hist",
            "sampling_method": "gradient_based" if use_gpu else "uniform",
            "objective":       "reg:squarederror",
            "eval_metric":     "rmse",
            "seed":            RANDOM_SEED,
            "verbosity":       0,

            # ── Hyperparameter search space ──
            # हाइपरपैरामीटर खोज स्थान
            "max_bin":          trial.suggest_int("max_bin", 256, 512, step=64),
            "n_estimators":     trial.suggest_int("n_estimators", 400, 1200, step=100),
            "learning_rate":    trial.suggest_float("learning_rate", 0.01, 0.1, log=True),
            "max_depth":        trial.suggest_int("max_depth", 4, 9),
            "min_child_weight": trial.suggest_int("min_child_weight", 3, 15),
            "subsample":        trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.5, 1.0),
            "reg_alpha":        trial.suggest_float("reg_alpha", 1e-3, 1.0, log=True),
            "reg_lambda":       trial.suggest_float("reg_lambda", 0.5, 5.0, log=True),
            "gamma":            trial.suggest_float("gamma", 0.0, 0.5),
        }

        n_rounds = params.pop("n_estimators")
        booster = xgb.train(
            params,
            dtrain,
            num_boost_round=n_rounds,
            evals=[(dval, "val")],
            early_stopping_rounds=40,
            verbose_eval=False,
        )
        preds = booster.predict(dval)
        rmse = float(np.sqrt(np.mean((preds - y_val) ** 2)))
        r2   = r2_score(y_val, preds)

        # Report intermediate value for pruning
        trial.report(rmse, step=n_rounds)
        if trial.should_prune():
            raise optuna.exceptions.TrialPruned()

        # Store R² as user attr for logging / R² को लॉगिंग के लिए स्टोर करें
        trial.set_user_attr("r2", round(r2, 4))
        trial.set_user_attr("best_iteration", booster.best_iteration)

        del booster
        gc.collect()
        return rmse

    return objective


# ──────────────────────────────────────────────
# Optuna HPO Runner / Optuna HPO रनर
# ──────────────────────────────────────────────
def run_optuna_hpo(
    dtrain: xgb.DMatrix,
    dval: xgb.DMatrix,
    y_val: np.ndarray,
    n_trials: int = 50,
    use_gpu: bool = True,
) -> Dict:
    """
    Run Optuna hyperparameter search and return best params.
    Optuna हाइपरपैरामीटर खोज चलाएं और सर्वश्रेष्ठ पैरामीटर लौटाएं।
    """
    logger.info(f"Starting Optuna HPO — {n_trials} trials on {'GPU' if use_gpu else 'CPU'}...")
    t0 = time.time()

    study = optuna.create_study(
        direction="minimize",                  # minimise RMSE / RMSE को न्यूनतम करें
        sampler=TPESampler(seed=RANDOM_SEED),
        pruner=MedianPruner(n_warmup_steps=10),
    )
    study.optimize(
        make_optuna_objective(dtrain, dval, y_val, use_gpu=use_gpu),
        n_trials=n_trials,
        show_progress_bar=True,
    )

    elapsed = time.time() - t0
    logger.info(f"HPO finished in {elapsed:.1f}s — Best RMSE: {study.best_value:.2f}")
    logger.info(f"Best R²: {study.best_trial.user_attrs.get('r2', 'N/A')}")

    # ── Save study for reproducibility / पुनरुत्पादकता के लिए अध्ययन सहेजें ──
    with open(STUDY_OUTPUT, "wb") as f:
        pickle.dump(study, f)
    logger.info(f"Optuna study saved → {STUDY_OUTPUT}")

    # Merge best params with fixed GPU settings
    best_params = study.best_params.copy()
    best_params.update(
        {
            "device":          "cuda" if use_gpu else "cpu",
            "tree_method":     "hist",
            "sampling_method": "gradient_based" if use_gpu else "uniform",
            "objective":       "reg:squarederror",
            "eval_metric":     ["rmse", "mae"],
            "seed":            RANDOM_SEED,
            "verbosity":       1,
        }
    )
    return best_params, study


# ──────────────────────────────────────────────
# Final Model Training / अंतिम मॉडल प्रशिक्षण
# ──────────────────────────────────────────────
def train_final_model(
    dtrain: xgb.DMatrix,
    dval: xgb.DMatrix,
    params: Dict,
    num_rounds: int = 800,
) -> xgb.Booster:
    """
    Train the final XGBoost model with best params + early stopping.
    सर्वश्रेष्ठ पैरामीटर के साथ अंतिम XGBoost मॉडल प्रशिक्षित करें।
    """
    n_rounds = params.pop("n_estimators", num_rounds)
    logger.info(f"Training final model — {n_rounds} rounds on GPU...")
    t0 = time.time()

    callbacks = [
        xgb.callback.EarlyStopping(rounds=50, data_name="val", metric_name="rmse", save_best=True),
    ]

    evals_result = {}
    model = xgb.train(
        params,
        dtrain,
        num_boost_round=n_rounds,
        evals=[(dtrain, "train"), (dval, "val")],
        early_stopping_rounds=50,
        verbose_eval=25,         # print every 25 rounds
        evals_result=evals_result,
    )

    elapsed = time.time() - t0
    logger.info(f"Training complete in {elapsed:.1f}s — Best iteration: {model.best_iteration}")
    return model, evals_result


# ──────────────────────────────────────────────
# Main Training Pipeline / मुख्य प्रशिक्षण पाइपलाइन
# ──────────────────────────────────────────────
def run_training(
    parquet_path: Path = PROCESSED_PARQUET,
    model_output: Path = MODEL_OUTPUT,
    n_optuna_trials: int = 50,
    skip_hpo: bool = False,
) -> Tuple[xgb.Booster, List[str]]:
    """
    Full training pipeline: load → split → HPO → train → save.
    पूर्ण प्रशिक्षण पाइपलाइन: लोड → विभाजन → HPO → प्रशिक्षण → सेव।
    """
    # ── Load processed data / प्रसंस्कृत डेटा लोड करें ──
    if not parquet_path.exists():
        logger.error(f"Processed data not found at {parquet_path}. Run data_pipeline.py first.")
        raise FileNotFoundError(f"{parquet_path} not found. Run data_pipeline.py first.")

    logger.info(f"Loading processed data from {parquet_path}...")
    df = pd.read_parquet(parquet_path)
    logger.info(f"Loaded {len(df):,} records, {df.shape[1]} columns.")

    # ── Re-apply category dtype (parquet may lose it) ──
    cat_cols = ["craft_category", "material_type", "region_state", "region_zone"]
    for col in cat_cols:
        if col in df.columns and df[col].dtype != "category":
            df[col] = df[col].astype("category")

    # ── Split / विभाजन ──
    feature_cols = get_feature_cols(df)
    logger.info(f"Training with {len(feature_cols)} features.")

    X = df[feature_cols]
    y = df[TARGET_COL]

    from sklearn.model_selection import train_test_split
    X_temp, X_test, y_temp, y_test = train_test_split(X, y, test_size=0.15, random_state=RANDOM_SEED)
    X_train, X_val, y_train, y_val = train_test_split(X_temp, y_temp, test_size=0.1765, random_state=RANDOM_SEED)

    logger.info(f"Split — Train: {len(X_train):,} | Val: {len(X_val):,} | Test: {len(X_test):,}")

    # ── Build DMatrices / DMatrices बनाएं ──
    logger.info("Building DMatrix objects...")
    dtrain = build_dmatrix(X_train, y_train)
    dval   = build_dmatrix(X_val,   y_val)
    dtest  = build_dmatrix(X_test,  y_test)

    # ── GPU check / GPU जाँच ──
    use_gpu = check_gpu_available()

    # ── Hyperparameter Optimisation / हाइपरपैरामीटर अनुकूलन ──
    if skip_hpo:
        logger.info("Skipping Optuna HPO — using baseline params from prompt specification.")
        best_params = BASELINE_PARAMS.copy()
        if not use_gpu:
            best_params["device"] = "cpu"
            best_params["sampling_method"] = "uniform"
        study = None
    else:
        best_params, study = run_optuna_hpo(dtrain, dval, y_val.values, n_trials=n_optuna_trials, use_gpu=use_gpu)

    # ── Train final model / अंतिम मॉडल प्रशिक्षित करें ──
    model, evals_result = train_final_model(dtrain, dval, best_params)

    # ── Quick val metrics / त्वरित वैल मेट्रिक्स ──
    val_preds = model.predict(dval)
    val_r2    = r2_score(y_val, val_preds)
    val_mae   = mean_absolute_error(y_val, val_preds)
    logger.info(f"\nValidation R²: {val_r2:.4f} | MAE: ₹{val_mae:,.0f}")

    if val_r2 < 0.88:
        logger.warning(
            f"⚠ Val R²={val_r2:.4f} is below the target of 0.88. "
            f"Consider more data, additional HPO trials, or feature engineering."
        )
    else:
        logger.info(f"✓ Target R² ≥ 0.88 achieved on validation set!")

    # ── Save model (.ubj binary) / मॉडल सहेजें (.ubj बाइनरी) ──
    model.save_model(str(model_output))
    logger.info(f"Model saved → {model_output} ({model_output.stat().st_size / 1024:.1f} KB)")

    # ── Save test set for evaluate.py / evaluate.py के लिए टेस्ट सेट सहेजें ──
    test_df = X_test.copy()
    test_df[TARGET_COL] = y_test.values
    test_df.to_parquet("test_set.parquet", index=False)
    logger.info("Test set saved → test_set.parquet")

    # ── Save feature column list / फीचर कॉलम सूची सहेजें ──
    with open("feature_cols.pkl", "wb") as f:
        pickle.dump(feature_cols, f)
    logger.info("Feature column list saved → feature_cols.pkl")

    return model, feature_cols


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="KalaSetu XGBoost Training Pipeline")
    parser.add_argument("--parquet",       type=str, default=str(PROCESSED_PARQUET),
                        help="Path to processed parquet file from data_pipeline.py")
    parser.add_argument("--model-output",  type=str, default=str(MODEL_OUTPUT),
                        help="Output path for .ubj model file")
    parser.add_argument("--n-trials",      type=int, default=50,
                        help="Number of Optuna HPO trials")
    parser.add_argument("--skip-hpo",      action="store_true",
                        help="Skip Optuna HPO and use baseline params")
    args = parser.parse_args()

    run_training(
        parquet_path=Path(args.parquet),
        model_output=Path(args.model_output),
        n_optuna_trials=args.n_trials,
        skip_hpo=args.skip_hpo,
    )
