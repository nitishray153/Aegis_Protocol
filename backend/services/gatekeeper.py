import logging
import hashlib
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def evaluate_signal(prediction, market_data=None):
    """
    Multi-factor gatekeeper evaluation.
    Score = f(confidence, volatility, drawdown, consistency)
    """
    confidence = prediction.get("confidence", 0)
    expected_return = abs(prediction.get("expected_return", 0))
    
    # Factor 1: Confidence score (0-1)
    conf_score = confidence
    
    # Factor 2: Volatility score (lower volatility = higher score)
    volatility = 0.5  # default
    if market_data:
        bollinger = market_data.get("bollinger", {})
        if isinstance(bollinger, dict):
            bb_width = bollinger.get("upper", 0) - bollinger.get("lower", 0)
            price = market_data.get("current_price", 1)
            if price > 0:
                volatility = min(bb_width / price, 1.0)
    vol_score = 1.0 - volatility
    
    # Factor 3: RSI-based drawdown risk (extreme RSI = higher risk)
    rsi = 50
    if market_data:
        rsi = market_data.get("rsi", 50)
    drawdown_score = 1.0 - abs(rsi - 50) / 50  # Best at RSI=50
    
    # Factor 4: Signal-indicator consistency
    consistency = _check_consistency(prediction, market_data)
    
    # Weighted composite score
    weights = {"confidence": 0.35, "volatility": 0.25, "drawdown": 0.20, "consistency": 0.20}
    composite = (
        conf_score * weights["confidence"] +
        vol_score * weights["volatility"] +
        drawdown_score * weights["drawdown"] +
        consistency * weights["consistency"]
    )
    
    # Decision thresholds
    if composite >= 0.65:
        decision = "PASS"
        reason = "Signal meets quality thresholds"
    elif composite >= 0.40:
        decision = "FLAG"
        reason = "Signal requires caution - medium confidence"
    else:
        decision = "BLOCK"
        reason = "Signal blocked - high risk detected"
    
    risk_level = "LOW" if composite >= 0.7 else "MEDIUM" if composite >= 0.4 else "HIGH"
    
    log_entry = {
        "model_name": prediction.get("model_name", "unknown"),
        "signal": prediction.get("signal", "UNKNOWN"),
        "decision": decision,
        "reason": reason,
        "composite_score": round(composite, 4),
        "risk_level": risk_level,
        "factors": {
            "confidence": round(conf_score, 4),
            "volatility": round(vol_score, 4),
            "drawdown": round(drawdown_score, 4),
            "consistency": round(consistency, 4)
        },
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    return log_entry


def _check_consistency(prediction, market_data):
    """Check if signal is consistent with indicators"""
    if not market_data:
        return 0.5
    
    signal = prediction.get("signal", "HOLD")
    rsi = market_data.get("rsi", 50)
    macd = market_data.get("macd", {})
    macd_hist = macd.get("histogram", 0) if isinstance(macd, dict) else 0
    
    score = 0.5  # neutral
    
    if signal == "BUY":
        if rsi < 70:
            score += 0.15  # RSI not overbought
        if macd_hist > 0:
            score += 0.15  # MACD bullish
        if rsi < 30:
            score += 0.1  # Oversold, good for buy
    elif signal == "SELL":
        if rsi > 30:
            score += 0.15  # RSI not oversold
        if macd_hist < 0:
            score += 0.15  # MACD bearish
        if rsi > 70:
            score += 0.1  # Overbought, good for sell
    else:
        score = 0.6  # HOLD is generally safe
    
    return min(score, 1.0)


def compute_gatekeeper_hash(log_entry):
    """Compute hash for blockchain storage"""
    data = f"{log_entry['model_name']}:{log_entry['decision']}:{log_entry['timestamp']}"
    return hashlib.sha256(data.encode()).hexdigest()
