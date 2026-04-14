import hashlib
import uuid
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def generate_referral_code(wallet_address):
    """Generate unique referral code from wallet"""
    raw = f"{wallet_address}:{uuid.uuid4().hex[:8]}"
    code = hashlib.sha256(raw.encode()).hexdigest()[:8].upper()
    return code


def calculate_staking_rewards(amount, duration_days, apy_rate=0.12):
    """Calculate staking rewards"""
    daily_rate = apy_rate / 365
    rewards = amount * daily_rate * duration_days
    return round(rewards, 6)


REFERRAL_REWARD = 50  # tokens per successful referral
STAKING_APY = 0.12   # 12% APY
MIN_STAKE = 0.01     # minimum ETH to stake

TIER_THRESHOLDS = {
    "bronze": 0,
    "silver": 100,
    "gold": 500,
    "platinum": 2000,
    "diamond": 10000,
}


def get_tier(total_tokens):
    """Get governance tier based on token balance"""
    tier = "bronze"
    for name, threshold in sorted(TIER_THRESHOLDS.items(), key=lambda x: x[1]):
        if total_tokens >= threshold:
            tier = name
    return tier


def calculate_voting_power(tokens, tier):
    """Calculate voting power based on tokens and tier"""
    multipliers = {"bronze": 1.0, "silver": 1.2, "gold": 1.5, "platinum": 2.0, "diamond": 3.0}
    return round(tokens * multipliers.get(tier, 1.0), 2)
