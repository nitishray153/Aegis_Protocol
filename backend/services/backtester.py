import numpy as np
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def run_backtest(price_history, model_type="LSTM", initial_capital=10000, timeframe_days=30):
    """Run historical simulation for a model on price data"""
    if not price_history or len(price_history) < 10:
        return _empty_result()
    
    prices = [p["price"] if isinstance(p, dict) else p for p in price_history]
    
    # Limit to timeframe
    if len(prices) > timeframe_days * 24:
        prices = prices[-(timeframe_days * 24):]
    
    capital = initial_capital
    position = 0  # 0 = no position, 1 = long
    entry_price = 0
    trades = []
    equity_curve = [capital]
    
    # Generate signals at each point using simple indicator-based rules
    for i in range(20, len(prices)):
        window = prices[i-20:i]
        current = prices[i]
        
        # Simple moving average crossover + RSI
        sma_short = np.mean(window[-5:])
        sma_long = np.mean(window)
        
        # RSI calculation
        deltas = np.diff(window[-15:])
        gains = np.mean(np.where(deltas > 0, deltas, 0))
        losses = np.mean(np.where(deltas < 0, -deltas, 0))
        rsi = 100 - (100 / (1 + gains / (losses + 1e-8)))
        
        # Model-specific behavior
        if model_type == "LSTM":
            buy_threshold = 0.002
            sell_threshold = -0.001
            noise = np.random.normal(0, 0.001)
        elif model_type == "GRU":
            buy_threshold = 0.003
            sell_threshold = -0.002
            noise = np.random.normal(0, 0.0015)
        else:
            buy_threshold = 0.0025
            sell_threshold = -0.0015
            noise = np.random.normal(0, 0.001)
        
        momentum = (sma_short / sma_long - 1) + noise
        
        # Trading logic
        if position == 0 and momentum > buy_threshold and rsi < 70:
            position = 1
            entry_price = current
            trades.append({"type": "BUY", "price": current, "index": i})
        elif position == 1 and (momentum < sell_threshold or rsi > 80):
            pnl = (current - entry_price) / entry_price
            capital *= (1 + pnl)
            position = 0
            trades.append({"type": "SELL", "price": current, "index": i, "pnl": round(pnl * 100, 2)})
        
        equity_curve.append(capital if position == 0 else capital * (current / entry_price))
    
    # Close any open position
    if position == 1:
        pnl = (prices[-1] - entry_price) / entry_price
        capital *= (1 + pnl)
        trades.append({"type": "SELL", "price": prices[-1], "index": len(prices) - 1, "pnl": round(pnl * 100, 2)})
    
    # Compute metrics
    total_return = (capital - initial_capital) / initial_capital * 100
    equity_arr = np.array(equity_curve)
    returns = np.diff(equity_arr) / equity_arr[:-1]
    
    # Sharpe ratio (annualized, assuming hourly data)
    if len(returns) > 1 and np.std(returns) > 0:
        sharpe = np.mean(returns) / np.std(returns) * np.sqrt(365 * 24)
    else:
        sharpe = 0
    
    # Max drawdown
    peak = np.maximum.accumulate(equity_arr)
    drawdown = (peak - equity_arr) / peak
    max_drawdown = float(np.max(drawdown)) * 100
    
    # Win rate
    winning_trades = [t for t in trades if t.get("pnl", 0) > 0]
    sell_trades = [t for t in trades if t["type"] == "SELL"]
    win_rate = len(winning_trades) / max(len(sell_trades), 1) * 100
    
    # Downsample equity curve for frontend
    step = max(1, len(equity_curve) // 100)
    sampled_equity = [round(equity_curve[i], 2) for i in range(0, len(equity_curve), step)]
    
    return {
        "model_type": model_type,
        "initial_capital": initial_capital,
        "final_capital": round(capital, 2),
        "total_return_pct": round(total_return, 2),
        "sharpe_ratio": round(float(sharpe), 4),
        "max_drawdown_pct": round(max_drawdown, 2),
        "win_rate_pct": round(win_rate, 2),
        "total_trades": len(sell_trades),
        "winning_trades": len(winning_trades),
        "losing_trades": len(sell_trades) - len(winning_trades),
        "equity_curve": sampled_equity,
        "trades": trades[-20:],  # Last 20 trades
        "timeframe_days": timeframe_days,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


def _empty_result():
    return {
        "model_type": "N/A",
        "initial_capital": 0,
        "final_capital": 0,
        "total_return_pct": 0,
        "sharpe_ratio": 0,
        "max_drawdown_pct": 0,
        "win_rate_pct": 0,
        "total_trades": 0,
        "winning_trades": 0,
        "losing_trades": 0,
        "equity_curve": [],
        "trades": [],
        "timeframe_days": 0,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
