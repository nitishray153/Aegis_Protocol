import numpy as np
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def detect_anomaly(signal_data, historical_signals=None):
    """Z-score based anomaly detection for signals"""
    confidence = signal_data.get("confidence", 0.5)
    expected_return = signal_data.get("expected_return", 0)
    
    # Build distribution from historical signals
    if historical_signals and len(historical_signals) >= 5:
        hist_conf = [s.get("confidence", 0.5) for s in historical_signals]
        hist_ret = [s.get("expected_return", 0) for s in historical_signals]
        
        mean_conf = np.mean(hist_conf)
        std_conf = np.std(hist_conf) + 1e-8
        mean_ret = np.mean(hist_ret)
        std_ret = np.std(hist_ret) + 1e-8
        
        z_conf = abs(confidence - mean_conf) / std_conf
        z_ret = abs(expected_return - mean_ret) / std_ret
    else:
        # Default distribution
        z_conf = abs(confidence - 0.5) / 0.2
        z_ret = abs(expected_return) / 2.0
    
    # Composite z-score
    z_score = max(z_conf, z_ret)
    
    is_anomaly = z_score > 2.5
    severity = "CRITICAL" if z_score > 3.5 else "WARNING" if z_score > 2.5 else "NORMAL"
    
    return {
        "is_anomaly": is_anomaly,
        "z_score": round(float(z_score), 4),
        "severity": severity,
        "z_confidence": round(float(z_conf), 4),
        "z_return": round(float(z_ret), 4),
        "details": f"Z-score: {z_score:.2f} ({'ANOMALY DETECTED' if is_anomaly else 'Normal'})",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


def eva_evaluate(signal_data, anomaly_result, market_data=None):
    """
    EVA (Ethics & Validation Agent)
    - Risk scoring
    - Rule validation
    - Approve / Reject flag
    """
    rules_passed = []
    rules_failed = []
    
    confidence = signal_data.get("confidence", 0)
    expected_return = signal_data.get("expected_return", 0)
    signal = signal_data.get("signal", "HOLD")
    
    # Rule 1: Minimum confidence
    if confidence >= 0.15:
        rules_passed.append("MIN_CONFIDENCE")
    else:
        rules_failed.append("MIN_CONFIDENCE: Below 15% threshold")
    
    # Rule 2: Expected return sanity
    if abs(expected_return) <= 10:
        rules_passed.append("RETURN_SANITY")
    else:
        rules_failed.append("RETURN_SANITY: Expected return exceeds 10%")
    
    # Rule 3: Anomaly check
    if not anomaly_result.get("is_anomaly", False):
        rules_passed.append("ANOMALY_FREE")
    else:
        rules_failed.append(f"ANOMALY_DETECTED: Z-score {anomaly_result.get('z_score', 0):.2f}")
    
    # Rule 4: Market conditions (if available)
    if market_data:
        rsi = market_data.get("rsi", 50)
        if signal == "BUY" and rsi > 85:
            rules_failed.append("OVERBOUGHT_BUY: RSI > 85 while signaling BUY")
        elif signal == "SELL" and rsi < 15:
            rules_failed.append("OVERSOLD_SELL: RSI < 15 while signaling SELL")
        else:
            rules_passed.append("MARKET_CONDITION")
    else:
        rules_passed.append("MARKET_CONDITION")
    
    # Rule 5: Signal coherence
    if signal in ["BUY", "SELL", "HOLD"]:
        rules_passed.append("SIGNAL_VALID")
    else:
        rules_failed.append("SIGNAL_INVALID: Unknown signal type")
    
    # Compute risk score (0-100, lower is better)
    risk_score = 0
    risk_score += (1 - confidence) * 30  # Low confidence = high risk
    risk_score += anomaly_result.get("z_score", 0) * 10  # Anomaly score
    risk_score += len(rules_failed) * 15  # Failed rules
    risk_score = min(round(risk_score, 2), 100)
    
    approved = len(rules_failed) == 0 and risk_score < 60
    
    return {
        "approved": approved,
        "risk_score": risk_score,
        "risk_level": "LOW" if risk_score < 30 else "MEDIUM" if risk_score < 60 else "HIGH",
        "rules_passed": rules_passed,
        "rules_failed": rules_failed,
        "total_rules": len(rules_passed) + len(rules_failed),
        "passed_count": len(rules_passed),
        "failed_count": len(rules_failed),
        "recommendation": "APPROVE" if approved else "REJECT",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
