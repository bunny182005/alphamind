"""Tests for financial calculations."""
from tradingagents.utils.math_helpers import calculate_sharpe_ratio, calculate_simple_return


def test_calculate_simple_return():
    ret = calculate_simple_return(100.0, 115.0)
    assert round(ret, 2) == 0.15


def test_calculate_sharpe_ratio():
    returns = [0.05, 0.02, 0.08, 0.03, 0.06]
    sharpe = calculate_sharpe_ratio(returns, 0.01)
    assert sharpe > 0
