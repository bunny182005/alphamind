"""Utility functions for financial market trading date calculations."""
from datetime import datetime, timedelta


def get_previous_trading_day(date_str: str) -> str:
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    # If Monday, shift back to Friday
    if dt.weekday() == 0:
        prev = dt - timedelta(days=3)
    elif dt.weekday() == 6:  # Sunday
        prev = dt - timedelta(days=2)
    else:
        prev = dt - timedelta(days=1)
    return prev.strftime("%Y-%m-%d")
