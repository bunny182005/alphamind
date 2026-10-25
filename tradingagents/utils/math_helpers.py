"""Financial mathematics utilities for return and volatility metrics."""
import math


def calculate_simple_return(entry_price: float, exit_price: float) -> float:
    if entry_price <= 0:
        raise ValueError("Entry price must be positive")
    return (exit_price - entry_price) / entry_price


def calculate_sharpe_ratio(returns: list[float], risk_free_rate: float = 0.0) -> float:
    if not returns or len(returns) < 2:
        return 0.0
    mean = sum(returns) / len(returns)
    variance = sum((r - mean) ** 2 for r in returns) / (len(returns) - 1)
    std_dev = math.sqrt(variance)
    if std_dev == 0:
        return 0.0
    return (mean - risk_free_rate) / std_dev
