from typing import Any
import pandas as pd
from datetime import timedelta
import os
import logging
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
RESOURCES_DIR = os.path.join(BASE_DIR, "resources", "datasets")
TRANSACTION_FILE = os.path.join(RESOURCES_DIR, "transaction_history.csv")
FRAUD_FILE = os.path.join(RESOURCES_DIR, "fraud_patterns.csv")


def load_data(file_path: str) -> pd.DataFrame:
    """Loads data from a CSV file with error handling."""
    logger.info(f"Attempting to load data from {file_path}")
    try:
        df = pd.read_csv(file_path)
        logger.info(f"Data loaded successfully. Shape: {df.shape}")
        return df
    except FileNotFoundError:
        logger.error(
            f"Error: File not found at {file_path}. Please ensure the file exists."
        )
        return pd.DataFrame()
    except Exception as e:
        logger.error(f"An error occurred while loading data from {file_path}: {e}")
        return pd.DataFrame()


def preprocess_transactions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Performs comprehensive preprocessing on the transaction history data.
    - Cleans column names.
    - Converts data types (datetime, categorical).
    - Feature engineering for time-series and user behavior analysis.
    """
    if df.empty:
        return df
    logger.info("Starting transaction data preprocessing and feature engineering.")
    df.columns = df.columns.str.lower().str.replace(" ", "_")
    if "timestamp" in df.columns:
        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)
        df = df.dropna(subset=["timestamp"])
    if "user_id" in df.columns:
        df["user_id"] = df["user_id"].astype("category")
    if "amount" in df.columns:
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
        df = df.dropna(subset=["amount"])
    if "timestamp" in df.columns:
        df["hour_of_day"] = df["timestamp"].dt.hour
        df["day_of_week"] = df["timestamp"].dt.dayofweek
        df["is_weekend"] = df["day_of_week"].apply(lambda x: 1 if x >= 5 else 0)
        df["transaction_month"] = df["timestamp"].dt.month
    df = df.sort_values(["user_id", "timestamp"]).reset_index(drop=True)
    df["time_since_last_txn"] = (
        df.groupby("user_id")["timestamp"].diff().dt.total_seconds().fillna(0)
    )
    for window in [timedelta(hours=1), timedelta(hours=24), timedelta(days=7)]:
        window_str = f"{int(window.total_seconds() / 3600)}h"
        df[f"txn_count_{window_str}"] = (
            df.groupby("user_id")["timestamp"]
            .rolling(window=window, on="timestamp", closed="left")
            .count()
            .reset_index(level=0, drop=True)
            .fillna(0)
        )
        df[f"mean_amount_{window_str}"] = (
            df.groupby("user_id")["amount"]
            .rolling(window=window, on="timestamp", closed="left")
            .mean()
            .reset_index(level=0, drop=True)
            .fillna(0)
        )
        df[f"max_amount_{window_str}"] = (
            df.groupby("user_id")["amount"]
            .rolling(window=window, on="timestamp", closed="left")
            .max()
            .reset_index(level=0, drop=True)
            .fillna(0)
        )
    df = df.fillna(0)
    logger.info(f"Preprocessing complete. Final shape: {df.shape}")
    return df


def main() -> Any:
    """Main function to load, preprocess, and demonstrate data readiness."""
    transaction_df = load_data(TRANSACTION_FILE)
    if transaction_df.empty:
        logger.warning("No transaction data loaded. Cannot proceed with preprocessing.")
        return
    processed_df = preprocess_transactions(transaction_df.copy())
    fraud_df = load_data(FRAUD_FILE)
    logger.info("\n--- Processed Transaction Data Sample ---")
    logger.info(processed_df.head().to_markdown(index=False))
    logger.info("\n--- Fraud Patterns Data Sample ---")
    if not fraud_df.empty:
        logger.info(fraud_df.head().to_markdown(index=False))
    else:
        logger.info("No fraud patterns data loaded.")


if __name__ == "__main__":
    main()
