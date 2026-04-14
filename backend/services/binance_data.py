import httpx
import logging
import time
import numpy as np

logger = logging.getLogger(__name__)

_cache = {}
CACHE_TTL = 60  # 1 minute for Binance

def _get_cached(key):
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    return None

def _set_cached(key, data):
    _cache[key] = (data, time.time())

SYMBOL_MAP = {
    "bitcoin": "BTCUSDT",
    "ethereum": "ETHUSDT",
    "solana": "SOLUSDT",
    "cardano": "ADAUSDT",
    "polkadot": "DOTUSDT",
    "avalanche-2": "AVAXUSDT",
    "chainlink": "LINKUSDT",
    "uniswap": "UNIUSDT",
}

BINANCE_BASE = "https://api.binance.com/api/v3"


async def fetch_binance_ticker(symbol="bitcoin"):
    """Fetch 24hr ticker from Binance"""
    binance_sym = SYMBOL_MAP.get(symbol, "BTCUSDT")
    cache_key = f"binance_ticker_{binance_sym}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(f"{BINANCE_BASE}/ticker/24hr", params={"symbol": binance_sym})
            if resp.status_code == 200:
                data = resp.json()
                result = {
                    "symbol": binance_sym,
                    "price": float(data.get("lastPrice", 0)),
                    "price_change": float(data.get("priceChange", 0)),
                    "price_change_pct": float(data.get("priceChangePercent", 0)),
                    "high_24h": float(data.get("highPrice", 0)),
                    "low_24h": float(data.get("lowPrice", 0)),
                    "volume": float(data.get("volume", 0)),
                    "quote_volume": float(data.get("quoteVolume", 0)),
                    "trades": int(data.get("count", 0)),
                    "open_price": float(data.get("openPrice", 0)),
                    "weighted_avg_price": float(data.get("weightedAvgPrice", 0)),
                }
                _set_cached(cache_key, result)
                return result
    except Exception as e:
        logger.error(f"Binance ticker error: {e}")

    return _fallback_ticker(binance_sym)


async def fetch_binance_klines(symbol="bitcoin", interval="1h", limit=100):
    """Fetch kline/candlestick data from Binance"""
    binance_sym = SYMBOL_MAP.get(symbol, "BTCUSDT")
    cache_key = f"binance_klines_{binance_sym}_{interval}_{limit}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(f"{BINANCE_BASE}/klines", params={
                "symbol": binance_sym,
                "interval": interval,
                "limit": limit
            })
            if resp.status_code == 200:
                raw = resp.json()
                klines = [{
                    "open_time": k[0],
                    "open": float(k[1]),
                    "high": float(k[2]),
                    "low": float(k[3]),
                    "close": float(k[4]),
                    "volume": float(k[5]),
                    "close_time": k[6],
                } for k in raw]
                _set_cached(cache_key, klines)
                return klines
    except Exception as e:
        logger.error(f"Binance klines error: {e}")

    return _fallback_klines(limit)


async def fetch_binance_depth(symbol="bitcoin", limit=20):
    """Fetch order book depth from Binance"""
    binance_sym = SYMBOL_MAP.get(symbol, "BTCUSDT")
    cache_key = f"binance_depth_{binance_sym}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(f"{BINANCE_BASE}/depth", params={"symbol": binance_sym, "limit": limit})
            if resp.status_code == 200:
                data = resp.json()
                result = {
                    "bids": [[float(b[0]), float(b[1])] for b in data.get("bids", [])],
                    "asks": [[float(a[0]), float(a[1])] for a in data.get("asks", [])],
                }
                _set_cached(cache_key, result)
                return result
    except Exception as e:
        logger.error(f"Binance depth error: {e}")

    return {"bids": [], "asks": []}


async def fetch_binance_recent_trades(symbol="bitcoin", limit=20):
    """Fetch recent trades from Binance"""
    binance_sym = SYMBOL_MAP.get(symbol, "BTCUSDT")
    cache_key = f"binance_trades_{binance_sym}"
    cached = _get_cached(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(f"{BINANCE_BASE}/trades", params={"symbol": binance_sym, "limit": limit})
            if resp.status_code == 200:
                raw = resp.json()
                trades = [{
                    "id": t["id"],
                    "price": float(t["price"]),
                    "qty": float(t["qty"]),
                    "time": t["time"],
                    "is_buyer_maker": t["isBuyerMaker"],
                } for t in raw]
                _set_cached(cache_key, trades)
                return trades
    except Exception as e:
        logger.error(f"Binance trades error: {e}")

    return []


def _fallback_ticker(sym):
    base = {"BTCUSDT": 67500, "ETHUSDT": 3450, "SOLUSDT": 145}.get(sym, 100)
    noise = np.random.normal(0, base * 0.01)
    return {
        "symbol": sym,
        "price": round(base + noise, 2),
        "price_change": round(np.random.normal(0, base * 0.02), 2),
        "price_change_pct": round(np.random.normal(0, 2), 2),
        "high_24h": round(base * 1.03, 2),
        "low_24h": round(base * 0.97, 2),
        "volume": round(np.random.uniform(10000, 50000), 2),
        "quote_volume": round(base * np.random.uniform(1e7, 5e7), 2),
        "trades": int(np.random.uniform(100000, 500000)),
        "open_price": round(base * 0.99, 2),
        "weighted_avg_price": round(base, 2),
        "fallback": True
    }


def _fallback_klines(limit):
    base = 67500
    klines = []
    now = time.time() * 1000
    for i in range(limit):
        ts = now - (limit - i) * 3600000
        base += np.random.normal(0, base * 0.003)
        h = base * (1 + abs(np.random.normal(0, 0.005)))
        l = base * (1 - abs(np.random.normal(0, 0.005)))
        klines.append({
            "open_time": int(ts),
            "open": round(base, 2),
            "high": round(h, 2),
            "low": round(l, 2),
            "close": round(base + np.random.normal(0, base * 0.002), 2),
            "volume": round(np.random.uniform(100, 1000), 2),
            "close_time": int(ts + 3600000),
            "fallback": True
        })
    return klines
