"""
evaluate.py — KalaSetu Dynamic Pricing Engine
Model Evaluation: R², MAE, MAPE, RMSE + SHAP Explainability Plots

मूल्यांकन स्क्रिप्ट — कलासेतु मूल्य निर्धारण इंजन
मॉडल मूल्यांकन और SHAP व्याख्यात्मकता
"""

import logging
import os
import pickle
import warnings
from pathlib import Path
from typing import Dict, Optional

import matplotlib
matplotlib.use("Agg")  # headless rendering for servers / सर्वर के लिए हेडलेस रेंडरिंग
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import numpy as np
import pandas as pd
import shap
import xgboost as xgb
from sklearn.metrics import (
    mean_absolute_error,
    mean_absolute_percentage_error,
    mean_squared_error,
    r2_score,
)

warnings.filterwarnings("ignore")

# ──────────────────────────────────────────────
# Logging / लॉगिंग
# ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("kala_setu.evaluate")

# ──────────────────────────────────────────────
# Paths / पथ
# ──────────────────────────────────────────────
MODEL_PATH   = Path("kala_setu_pricing.ubj")
TEST_PARQUET = Path("test_set.parquet")
FEATURE_COLS = Path("feature_cols.pkl")
PLOTS_DIR    = Path("shap_plots")
TARGET_COL   = "fair_price_inr"
R2_TARGET    = 0.88


# ──────────────────────────────────────────────
# Metrics / मेट्रिक्स
# ──────────────────────────────────────────────
def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Compute regression evaluation metrics.
    रिग्रेशन मूल्यांकन मेट्रिक्स की गणना करें।
    """
    r2   = r2_score(y_true, y_pred)
    mae  = mean_absolute_error(y_true, y_pred)
    mape = mean_absolute_percentage_error(y_true, y_pred) * 100  # percent
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))

    # Within-15% accuracy (price band confidence metric)
    # 15% बैंड सटीकता (मूल्य बैंड विश्वास मेट्रिक)
    within_15_pct = float(np.mean(np.abs(y_pred - y_true) / (y_true + 1e-6) <= 0.15))

    return {
        "R2":           round(r2, 4),
        "MAE_INR":      round(mae, 2),
        "MAPE_pct":     round(mape, 2),
        "RMSE_INR":     round(rmse, 2),
        "Within15Pct":  round(within_15_pct * 100, 2),
    }


def print_metrics_report(metrics: Dict[str, float]) -> None:
    """Pretty-print the metrics table / मेट्रिक्स तालिका प्रिंट करें।"""
    print("\n" + "=" * 60)
    print("  KalaSetu Pricing Model — Evaluation Report")
    print("  कलासेतु मूल्य निर्धारण मॉडल — मूल्यांकन रिपोर्ट")
    print("=" * 60)
    print(f"  R²  (Coefficient of Determination) : {metrics['R2']:.4f}")
    r2_status = "✓ PASS" if metrics["R2"] >= R2_TARGET else f"✗ FAIL (target ≥ {R2_TARGET})"
    print(f"      Target ≥ {R2_TARGET} → {r2_status}")
    print(f"  MAE (Mean Absolute Error)           : ₹{metrics['MAE_INR']:,.0f}")
    print(f"  MAPE (Mean Absolute % Error)        : {metrics['MAPE_pct']:.2f}%")
    print(f"  RMSE (Root Mean Squared Error)      : ₹{metrics['RMSE_INR']:,.0f}")
    print(f"  Within ±15% Accuracy                : {metrics['Within15Pct']:.1f}%")
    print("=" * 60 + "\n")


# ──────────────────────────────────────────────
# SHAP Plots / SHAP प्लॉट
# ──────────────────────────────────────────────
def generate_shap_plots(
    model: xgb.Booster,
    X_sample: pd.DataFrame,
    plots_dir: Path = PLOTS_DIR,
    sample_size: int = 500,
) -> None:
    """
    Generate SHAP explainability plots for the artisan dashboard.
    कारीगर डैशबोर्ड के लिए SHAP व्याख्यात्मकता प्लॉट उत्पन्न करें।

    Saves:
        - shap_beeswarm.png  — global feature importance
        - shap_waterfall.png — single prediction explanation
        - shap_dependence_<feature>.png — feature effect plots
        - shap_bar_summary.png — mean |SHAP| bar chart
    """
    plots_dir.mkdir(exist_ok=True)
    logger.info(f"Generating SHAP plots (sample={min(sample_size, len(X_sample))})...")

    # Sub-sample to keep SHAP computation tractable
    # SHAP गणना को व्यावहारिक रखने के लिए सब-सैंपल
    X_plot = X_sample.sample(min(sample_size, len(X_sample)), random_state=42).reset_index(drop=True)

    # Build SHAP explainer using TreeExplainer (GPU-compatible)
    # TreeExplainer (GPU-संगत) का उपयोग करके SHAP explainer बनाएं
    explainer = shap.TreeExplainer(model)
    shap_values = explainer(X_plot)

    plt.rcParams.update(
        {
            "figure.dpi": 120,
            "font.family": "DejaVu Sans",
            "axes.spines.top": False,
            "axes.spines.right": False,
        }
    )

    # ── 1. Beeswarm (global feature importance) / वैश्विक फीचर महत्व ──
    logger.info("  Generating beeswarm plot...")
    fig, ax = plt.subplots(figsize=(12, 8))
    shap.plots.beeswarm(shap_values, max_display=15, show=False)
    plt.title("KalaSetu — SHAP Feature Importance (Beeswarm)\nकलासेतु — SHAP फीचर महत्व", fontsize=13, pad=12)
    plt.tight_layout()
    beeswarm_path = plots_dir / "shap_beeswarm.png"
    plt.savefig(beeswarm_path, bbox_inches="tight")
    plt.close()
    logger.info(f"    Saved → {beeswarm_path}")

    # ── 2. Bar Summary (mean |SHAP|) ──
    logger.info("  Generating bar summary plot...")
    fig, ax = plt.subplots(figsize=(10, 7))
    shap.plots.bar(shap_values, max_display=15, show=False)
    plt.title("KalaSetu — Mean |SHAP| Feature Importance\nकलासेतु — औसत |SHAP| फीचर महत्व", fontsize=13, pad=12)
    plt.tight_layout()
    bar_path = plots_dir / "shap_bar_summary.png"
    plt.savefig(bar_path, bbox_inches="tight")
    plt.close()
    logger.info(f"    Saved → {bar_path}")

    # ── 3. Waterfall (single prediction explanation) ──
    # एकल पूर्वानुमान व्याख्या
    logger.info("  Generating waterfall plot (first test sample)...")
    fig, ax = plt.subplots(figsize=(12, 7))
    shap.plots.waterfall(shap_values[0], max_display=12, show=False)
    plt.title(
        "KalaSetu — Single Prediction Explanation (Waterfall)\nकलासेतु — एकल पूर्वानुमान व्याख्या",
        fontsize=13, pad=12,
    )
    plt.tight_layout()
    waterfall_path = plots_dir / "shap_waterfall.png"
    plt.savefig(waterfall_path, bbox_inches="tight")
    plt.close()
    logger.info(f"    Saved → {waterfall_path}")

    # ── 4. Dependence plots for top-3 features ──
    # शीर्ष-3 फीचर्स के लिए निर्भरता प्लॉट
    mean_abs_shap = np.abs(shap_values.values).mean(axis=0)
    top_features  = [X_plot.columns[i] for i in np.argsort(mean_abs_shap)[::-1][:3]]

    for feat in top_features:
        logger.info(f"  Generating dependence plot for '{feat}'...")
        if feat not in X_plot.columns:
            continue
        try:
            fig, ax = plt.subplots(figsize=(9, 6))
            shap.plots.scatter(shap_values[:, feat], color=shap_values, ax=ax, show=False)
            ax.set_title(
                f"KalaSetu — SHAP Dependence: {feat}\nकलासेतु — SHAP निर्भरता: {feat}",
                fontsize=12, pad=10,
            )
            plt.tight_layout()
            dep_path = plots_dir / f"shap_dependence_{feat}.png"
            plt.savefig(dep_path, bbox_inches="tight")
            plt.close()
            logger.info(f"    Saved → {dep_path}")
        except Exception as e:
            logger.warning(f"    Could not generate dependence plot for {feat}: {e}")

    logger.info(f"All SHAP plots saved to {plots_dir}/")


# ──────────────────────────────────────────────
# Predicted vs Actual Plot / पूर्वानुमानित बनाम वास्तविक
# ──────────────────────────────────────────────
def plot_predictions(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    metrics: Dict[str, float],
    output_path: Path = Path("shap_plots/prediction_scatter.png"),
) -> None:
    """
    Scatter plot of predicted vs actual prices with ±15% confidence bands.
    ±15% विश्वास बैंड के साथ पूर्वानुमानित बनाम वास्तविक मूल्यों का स्कैटर प्लॉट।
    """
    output_path.parent.mkdir(exist_ok=True)
    fig, axes = plt.subplots(1, 2, figsize=(16, 6))

    # ── Scatter: Predicted vs Actual ──
    ax = axes[0]
    sample_idx = np.random.choice(len(y_true), min(2000, len(y_true)), replace=False)
    yt = y_true[sample_idx]; yp = y_pred[sample_idx]

    ax.scatter(yt, yp, alpha=0.3, s=8, color="#4F9CF9", label="Predictions")
    lim = max(yt.max(), yp.max()) * 1.05
    ax.plot([0, lim], [0, lim], "r--", lw=1.5, label="Perfect fit")
    ax.fill_between([0, lim], [0 * 0.85, lim * 0.85], [0 * 1.15, lim * 1.15],
                    alpha=0.1, color="green", label="±15% band")
    ax.set_xlabel("Actual Price (₹)", fontsize=11)
    ax.set_ylabel("Predicted Price (₹)", fontsize=11)
    ax.set_title(f"Predicted vs Actual\nR²={metrics['R2']:.4f} | MAE=₹{metrics['MAE_INR']:,.0f}", fontsize=12)
    ax.legend(fontsize=9)
    ax.set_xlim(0, lim); ax.set_ylim(0, lim)

    # ── Residuals Histogram ──
    ax = axes[1]
    residuals_pct = (y_pred - y_true) / (y_true + 1e-6) * 100
    ax.hist(residuals_pct, bins=60, color="#F97B4F", alpha=0.8, edgecolor="white")
    ax.axvline(0, color="red", lw=1.5, ls="--")
    ax.axvline(-15, color="green", lw=1, ls=":", label="±15% bounds")
    ax.axvline(+15, color="green", lw=1, ls=":")
    ax.set_xlabel("Residual (%)", fontsize=11)
    ax.set_ylabel("Count", fontsize=11)
    ax.set_title(f"Residual Distribution\nMAPE={metrics['MAPE_pct']:.2f}% | Within±15%={metrics['Within15Pct']:.1f}%", fontsize=12)
    ax.legend(fontsize=9)

    plt.suptitle("KalaSetu Dynamic Pricing — Model Evaluation\nकलासेतु गतिशील मूल्य निर्धारण — मॉडल मूल्यांकन",
                 fontsize=14, fontweight="bold", y=1.02)
    plt.tight_layout()
    plt.savefig(output_path, bbox_inches="tight", dpi=130)
    plt.close()
    logger.info(f"Prediction scatter saved → {output_path}")


# ──────────────────────────────────────────────
# Main Evaluation Runner / मुख्य मूल्यांकन रनर
# ──────────────────────────────────────────────
def run_evaluation(
    model_path: Path = MODEL_PATH,
    test_parquet: Path = TEST_PARQUET,
    feature_cols_path: Path = FEATURE_COLS,
    plots_dir: Path = PLOTS_DIR,
    shap_sample_size: int = 500,
) -> Dict[str, float]:
    """
    Full evaluation pipeline: load model → predict → metrics → SHAP plots.
    पूर्ण मूल्यांकन पाइपलाइन: मॉडल लोड → पूर्वानुमान → मेट्रिक्स → SHAP प्लॉट।
    """
    # ── Load model ──
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found at {model_path}. Run train.py first.")
    logger.info(f"Loading model from {model_path}...")
    model = xgb.Booster()
    model.load_model(str(model_path))
    logger.info(f"✓ Model loaded — {model.num_boosted_rounds()} rounds")

    # ── Load test set ──
    if not test_parquet.exists():
        raise FileNotFoundError(f"Test set not found at {test_parquet}. Run train.py first.")
    logger.info(f"Loading test set from {test_parquet}...")
    test_df = pd.read_parquet(test_parquet)

    # ── Restore feature column order ──
    feature_cols = None
    if feature_cols_path.exists():
        with open(feature_cols_path, "rb") as f:
            feature_cols = pickle.load(f)
        logger.info(f"Using {len(feature_cols)} feature columns from training.")
    else:
        feature_cols = [c for c in test_df.columns if c != TARGET_COL]
        logger.warning("feature_cols.pkl not found — inferring from test set.")

    # Re-apply category dtype
    cat_cols = ["craft_category", "material_type", "region_state", "region_zone"]
    for col in cat_cols:
        if col in test_df.columns:
            test_df[col] = test_df[col].astype("category")

    X_test = test_df[feature_cols]
    y_test = test_df[TARGET_COL].values

    # ── Predict ──
    dtest  = xgb.DMatrix(X_test, enable_categorical=True)
    y_pred = model.predict(dtest)

    # ── Metrics ──
    metrics = compute_metrics(y_test, y_pred)
    print_metrics_report(metrics)

    # ── Assertion / दावा ──
    if metrics["R2"] < R2_TARGET:
        logger.warning(
            f"⚠ R²={metrics['R2']:.4f} is below the MoSJE target of {R2_TARGET}. "
            "Review training data quality or increase HPO trials."
        )
    else:
        logger.info(f"✓ R² target met: {metrics['R2']:.4f} ≥ {R2_TARGET}")

    # ── Plots ──
    plot_predictions(y_test, y_pred, metrics, output_path=plots_dir / "prediction_scatter.png")
    generate_shap_plots(model, X_test, plots_dir=plots_dir, sample_size=shap_sample_size)

    return metrics


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="KalaSetu Model Evaluation")
    parser.add_argument("--model",        type=str, default=str(MODEL_PATH))
    parser.add_argument("--test-data",    type=str, default=str(TEST_PARQUET))
    parser.add_argument("--feature-cols", type=str, default=str(FEATURE_COLS))
    parser.add_argument("--plots-dir",    type=str, default=str(PLOTS_DIR))
    parser.add_argument("--shap-sample",  type=int, default=500)
    args = parser.parse_args()

    run_evaluation(
        model_path=Path(args.model),
        test_parquet=Path(args.test_data),
        feature_cols_path=Path(args.feature_cols),
        plots_dir=Path(args.plots_dir),
        shap_sample_size=args.shap_sample,
    )
