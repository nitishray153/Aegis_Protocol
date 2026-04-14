import numpy as np
import hashlib
import time
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class LSTMModel:
    """Lightweight LSTM-like signal generator using numpy"""
    
    def __init__(self, input_size=5, hidden_size=32):
        np.random.seed(int(time.time()) % 1000)
        self.hidden_size = hidden_size
        # Gate weights (forget, input, cell, output)
        self.Wf = np.random.randn(hidden_size, input_size + hidden_size) * 0.1
        self.Wi = np.random.randn(hidden_size, input_size + hidden_size) * 0.1
        self.Wc = np.random.randn(hidden_size, input_size + hidden_size) * 0.1
        self.Wo = np.random.randn(hidden_size, input_size + hidden_size) * 0.1
        self.bf = np.zeros(hidden_size)
        self.bi = np.zeros(hidden_size)
        self.bc = np.zeros(hidden_size)
        self.bo = np.zeros(hidden_size)
        # Output layer
        self.Wy = np.random.randn(3, hidden_size) * 0.1  # 3 outputs: signal, confidence, return
        self.by = np.zeros(3)
    
    def _sigmoid(self, x):
        return 1 / (1 + np.exp(-np.clip(x, -10, 10)))
    
    def forward(self, features):
        """Run LSTM forward pass on feature sequence"""
        h = np.zeros(self.hidden_size)
        c = np.zeros(self.hidden_size)
        
        for x in features:
            combined = np.concatenate([h, x])
            f = self._sigmoid(self.Wf @ combined + self.bf)
            i = self._sigmoid(self.Wi @ combined + self.bi)
            c_tilde = np.tanh(self.Wc @ combined + self.bc)
            c = f * c + i * c_tilde
            o = self._sigmoid(self.Wo @ combined + self.bo)
            h = o * np.tanh(c)
        
        output = self.Wy @ h + self.by
        return output
    
    def predict(self, indicators):
        """Generate trading signal from indicators"""
        features = _prepare_features(indicators)
        raw = self.forward(features)
        return _format_prediction(raw, "LSTM")


class GRUModel:
    """Lightweight GRU-like signal generator using numpy"""
    
    def __init__(self, input_size=5, hidden_size=32):
        np.random.seed(int(time.time()) % 1000 + 42)
        self.hidden_size = hidden_size
        # Gate weights (reset, update)
        self.Wr = np.random.randn(hidden_size, input_size + hidden_size) * 0.1
        self.Wz = np.random.randn(hidden_size, input_size + hidden_size) * 0.1
        self.Wh = np.random.randn(hidden_size, input_size + hidden_size) * 0.1
        self.br = np.zeros(hidden_size)
        self.bz = np.zeros(hidden_size)
        self.bh = np.zeros(hidden_size)
        # Output layer
        self.Wy = np.random.randn(3, hidden_size) * 0.1
        self.by = np.zeros(3)
    
    def _sigmoid(self, x):
        return 1 / (1 + np.exp(-np.clip(x, -10, 10)))
    
    def forward(self, features):
        """Run GRU forward pass"""
        h = np.zeros(self.hidden_size)
        
        for x in features:
            combined = np.concatenate([h, x])
            r = self._sigmoid(self.Wr @ combined + self.br)
            z = self._sigmoid(self.Wz @ combined + self.bz)
            combined_r = np.concatenate([r * h, x])
            h_tilde = np.tanh(self.Wh @ combined_r + self.bh)
            h = (1 - z) * h + z * h_tilde
        
        output = self.Wy @ h + self.by
        return output
    
    def predict(self, indicators):
        """Generate trading signal from indicators"""
        features = _prepare_features(indicators)
        raw = self.forward(features)
        return _format_prediction(raw, "GRU")


# Singleton instances
_lstm = LSTMModel()
_gru = GRUModel()


def _prepare_features(indicators):
    """Convert indicator dict to feature sequences"""
    rsi = indicators.get("rsi", 50) / 100.0
    macd_data = indicators.get("macd", {})
    macd_val = macd_data.get("macd", 0) if isinstance(macd_data, dict) else 0
    macd_hist = macd_data.get("histogram", 0) if isinstance(macd_data, dict) else 0
    
    price = indicators.get("current_price", 0)
    ema20 = indicators.get("ema_20", price)
    ema50 = indicators.get("ema_50", price)
    
    bollinger = indicators.get("bollinger", {})
    bb_upper = bollinger.get("upper", price) if isinstance(bollinger, dict) else price
    bb_lower = bollinger.get("lower", price) if isinstance(bollinger, dict) else price
    
    # Normalize features
    price_norm = 1.0 if price == 0 else price
    features = []
    for i in range(5):  # Create a sequence of 5 steps with slight variations
        noise = np.random.normal(0, 0.01, 5)
        feat = np.array([
            rsi + noise[0],
            macd_val / price_norm * 100 + noise[1],
            (price - ema20) / price_norm + noise[2],
            (price - ema50) / price_norm + noise[3],
            (price - bb_lower) / (bb_upper - bb_lower + 1e-8) + noise[4]
        ])
        features.append(feat)
    return features


def _format_prediction(raw, model_name):
    """Format raw model output into standard signal"""
    signal_val = np.tanh(raw[0])
    confidence = abs(np.tanh(raw[1]))
    expected_return = np.tanh(raw[2]) * 5  # Scale to -5% to 5%
    
    # Add market-aware randomness for realistic variation
    signal_val += np.random.normal(0, 0.1)
    
    if signal_val > 0.1:
        signal = "BUY"
    elif signal_val < -0.1:
        signal = "SELL"
    else:
        signal = "HOLD"
    
    confidence = min(max(confidence + np.random.normal(0, 0.05), 0.1), 0.99)
    
    return {
        "model_name": model_name,
        "signal": signal,
        "confidence": round(float(confidence), 4),
        "expected_return": round(float(expected_return), 4),
        "raw_score": round(float(signal_val), 4),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


def get_model_prediction(model_type, indicators):
    """Get prediction from specified model"""
    if model_type == "LSTM":
        return _lstm.predict(indicators)
    elif model_type == "GRU":
        return _gru.predict(indicators)
    elif model_type == "Ensemble":
        lstm_pred = _lstm.predict(indicators)
        gru_pred = _gru.predict(indicators)
        # Weighted ensemble
        avg_conf = (lstm_pred["confidence"] * 0.6 + gru_pred["confidence"] * 0.4)
        avg_return = (lstm_pred["expected_return"] * 0.6 + gru_pred["expected_return"] * 0.4)
        avg_score = (lstm_pred["raw_score"] * 0.6 + gru_pred["raw_score"] * 0.4)
        signal = "BUY" if avg_score > 0.1 else "SELL" if avg_score < -0.1 else "HOLD"
        return {
            "model_name": "Ensemble",
            "signal": signal,
            "confidence": round(avg_conf, 4),
            "expected_return": round(avg_return, 4),
            "raw_score": round(avg_score, 4),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    else:
        return _lstm.predict(indicators)


def compute_model_hash(model_name, model_type):
    """Compute hash for blockchain storage"""
    data = f"{model_name}:{model_type}:{time.time()}"
    return hashlib.sha256(data.encode()).hexdigest()
