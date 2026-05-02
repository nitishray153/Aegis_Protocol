import csv
from pathlib import Path
import torch
import torch.nn as nn
from torch.utils.data import TensorDataset, DataLoader
from services.torch_models import build_model

DATA = Path(__file__).resolve().parents[1] / "data" / "btc_usd_hourly.csv"
OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "weights"


def load_series():
    prices = []
    with DATA.open() as f:
        r = csv.DictReader(f)
        for row in r:
            prices.append(float(row["price"]))
    return prices


def make_features(prices, seq=24):
    xs, ys = [], []
    for i in range(seq, len(prices) - 1):
        window = prices[i-seq:i]
        base = window[-1]
        norm = [(p / base) - 1 for p in window]
        feats = []
        for j in range(seq):
            v = norm[j]
            feats.append([v, v * 0.8, v * 0.5, v * 0.3, v * 0.1])
        ret = (prices[i+1] - prices[i]) / prices[i]
        target_signal = 1.0 if ret > 0 else -1.0
        target_conf = min(abs(ret) * 50, 1.0)
        target_ret = max(min(ret * 100, 5), -5) / 5
        xs.append(feats)
        ys.append([target_signal, target_conf, target_ret])
    return torch.tensor(xs, dtype=torch.float32), torch.tensor(ys, dtype=torch.float32)


def train_one(model_type):
    prices = load_series()
    x, y = make_features(prices)
    ds = TensorDataset(x, y)
    dl = DataLoader(ds, batch_size=64, shuffle=True)
    model = build_model(model_type)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.MSELoss()
    model.train()
    for _ in range(5):
        for xb, yb in dl:
            pred = model(xb)
            loss = loss_fn(pred, yb)
            opt.zero_grad(); loss.backward(); opt.step()
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{model_type}.pt"
    torch.save(model.state_dict(), path)
    print(f"saved {path}")


if __name__ == "__main__":
    for m in ["lstm", "gru", "transformer"]:
        train_one(m)
