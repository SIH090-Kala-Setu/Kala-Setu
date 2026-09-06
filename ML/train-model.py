"""
train-model.py — KalaSetu Dynamic Pricing Engine
One-shot orchestrator: data pipeline → training → evaluation
Run this file to execute the full ML pipeline end-to-end.

"""

import argparse
import logging
import sys
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("kala_setu.orchestrator")


def main():
    parser = argparse.ArgumentParser(
        description="KalaSetu ML Pipeline — train-model.py",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Full pipeline with synthetic data (no DB required):
  python train-model.py

  # Full pipeline with PostgreSQL data:
  python train-model.py --database-url postgresql://user:pass@localhost/kalasetu_db

  # Skip Optuna HPO (use baseline params from prompt spec):
  python train-model.py --skip-hpo

  # Skip to evaluation only (model already trained):
  python train-model.py --eval-only
        """
    )
    parser.add_argument("--database-url", type=str, default=None,
                        help="PostgreSQL connection string. If omitted, checks real datasets or synthetic data.")
    parser.add_argument("--no-real-data", action="store_true",
                        help="Disable real dataset ingestion (Amazon/Flipkart/Etsy) and use synthetic data")
    parser.add_argument("--n-synthetic",  type=int, default=15_000,
                        help="Synthetic records to generate if no real datasets found (default: 15000)")
    parser.add_argument("--n-trials",     type=int, default=50,
                        help="Optuna HPO trials (default: 50)")
    parser.add_argument("--skip-hpo",     action="store_true",
                        help="Skip HPO — use baseline params from prompt specification")
    parser.add_argument("--eval-only",    action="store_true",
                        help="Skip data pipeline and training — run evaluation only")
    parser.add_argument("--shap-sample",  type=int, default=500,
                        help="SHAP sample size for evaluation plots (default: 500)")
    args = parser.parse_args()

    # ── Step 1: Data Pipeline / डेटा पाइपलाइन ──────────────────────────────
    if not args.eval_only:
        logger.info("=" * 65)
        logger.info("STEP 1 / चरण 1: Data Ingestion & Feature Engineering")
        logger.info("=" * 65)
        try:
            from data_pipeline import run_pipeline
            run_pipeline(
                database_url=args.database_url,
                use_real_datasets=not args.no_real_data,
                n_synthetic=args.n_synthetic,
                output_path=Path("processed_artisan_data.parquet"),
            )
        except Exception as e:
            logger.error(f"Data pipeline failed: {e}")
            sys.exit(1)

        # ── Step 2: Training / प्रशिक्षण ──────────────────────────────────
        logger.info("=" * 65)
        logger.info("STEP 2 / चरण 2: GPU-Accelerated XGBoost Training + HPO")
        logger.info("=" * 65)
        try:
            from train import run_training
            run_training(
                parquet_path=Path("processed_artisan_data.parquet"),
                model_output=Path("kala_setu_pricing.ubj"),
                n_optuna_trials=args.n_trials,
                skip_hpo=args.skip_hpo,
            )
        except Exception as e:
            logger.error(f"Training failed: {e}")
            sys.exit(1)

    # ── Step 3: Evaluation / मूल्यांकन ────────────────────────────────────
    logger.info("=" * 65)
    logger.info("STEP 3 / चरण 3: Model Evaluation + SHAP Plots")
    logger.info("=" * 65)
    try:
        from evaluate import run_evaluation
        metrics = run_evaluation(
            model_path=Path("kala_setu_pricing.ubj"),
            test_parquet=Path("test_set.parquet"),
            feature_cols_path=Path("feature_cols.pkl"),
            plots_dir=Path("shap_plots"),
            shap_sample_size=args.shap_sample,
        )
    except Exception as e:
        logger.error(f"Evaluation failed: {e}")
        sys.exit(1)

    # ── Done / समाप्त ──────────────────────────────────────────────────────
    logger.info("=" * 65)
    logger.info("✓ KalaSetu ML Pipeline Complete! / कलासेतु ML पाइपलाइन पूर्ण!")
    logger.info(f"  Model saved → kala_setu_pricing.ubj")
    logger.info(f"  Final R²:    {metrics['R2']:.4f}")
    logger.info(f"  MAE:         ₹{metrics['MAE_INR']:,.0f}")
    logger.info(f"  MAPE:        {metrics['MAPE_pct']:.2f}%")
    logger.info(f"  SHAP plots → shap_plots/")
    logger.info("")
    logger.info("  To serve the pricing API:")
    logger.info("  uvicorn pricing_service:app --host 0.0.0.0 --port 8001 --reload")
    logger.info("=" * 65)


if __name__ == "__main__":
    main()
