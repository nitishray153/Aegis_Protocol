import asyncio
import csv
from pathlib import Path
from services.market_data import fetch_price_history

OUT = Path(__file__).resolve().parents[1] / "data" / "btc_usd_hourly.csv"


async def main():
    prices = await fetch_price_history("bitcoin", 90)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["timestamp", "price"])
        for p in prices:
            w.writerow([p["timestamp"], p["price"]])
    print(f"wrote {len(prices)} rows to {OUT}")


if __name__ == "__main__":
    asyncio.run(main())
