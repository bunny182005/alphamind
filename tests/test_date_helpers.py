"""Tests for trading day calculation utilities."""
from tradingagents.utils.date_helpers import get_previous_trading_day


def test_previous_trading_day_weekday():
    # Tuesday -> Monday
    assert get_previous_trading_day("2026-03-10") == "2026-03-09"


def test_previous_trading_day_weekend_wrap():
    # Monday -> Friday
    assert get_previous_trading_day("2026-03-09") == "2026-03-06"
