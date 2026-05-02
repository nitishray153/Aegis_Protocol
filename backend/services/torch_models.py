import torch
import torch.nn as nn
from typing import Dict


class LSTMNet(nn.Module):
    def __init__(self, input_size: int = 5, hidden_size: int = 32):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.head = nn.Linear(hidden_size, 3)

    def forward(self, x):
        out, _ = self.lstm(x)
        return self.head(out[:, -1, :])


class GRUNet(nn.Module):
    def __init__(self, input_size: int = 5, hidden_size: int = 32):
        super().__init__()
        self.gru = nn.GRU(input_size, hidden_size, batch_first=True)
        self.head = nn.Linear(hidden_size, 3)

    def forward(self, x):
        out, _ = self.gru(x)
        return self.head(out[:, -1, :])


class TransformerNet(nn.Module):
    def __init__(self, input_size: int = 5, d_model: int = 32, nhead: int = 4):
        super().__init__()
        self.proj = nn.Linear(input_size, d_model)
        enc_layer = nn.TransformerEncoderLayer(d_model=d_model, nhead=nhead, batch_first=True)
        self.encoder = nn.TransformerEncoder(enc_layer, num_layers=2)
        self.head = nn.Linear(d_model, 3)

    def forward(self, x):
        x = self.proj(x)
        x = self.encoder(x)
        return self.head(x[:, -1, :])


def decode_output(raw: torch.Tensor) -> Dict:
    s = torch.tanh(raw[0]).item()
    c = torch.sigmoid(raw[1]).item()
    r = (torch.tanh(raw[2]) * 5.0).item()
    signal = "BUY" if s > 0.1 else "SELL" if s < -0.1 else "HOLD"
    return {"signal": signal, "confidence": round(float(c), 4), "expected_return": round(float(r), 4)}


def build_model(model_type: str):
    model_type = model_type.lower()
    if model_type == "lstm":
        return LSTMNet()
    if model_type == "gru":
        return GRUNet()
    if model_type == "transformer":
        return TransformerNet()
    raise ValueError(f"Unsupported model_type: {model_type}")
