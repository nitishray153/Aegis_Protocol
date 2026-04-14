from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
import hashlib
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Aegis Protocol API")
api_router = APIRouter(prefix="/api")

# Services
from services.market_data import (
    fetch_crypto_prices, fetch_price_history, fetch_fear_greed_index,
    compute_all_indicators
)
from services.ai_models import get_model_prediction, compute_model_hash
from services.gatekeeper import evaluate_signal, compute_gatekeeper_hash
from services.ipfs_service import upload_to_ipfs, upload_json_to_ipfs
from services.backtester import run_backtest
from services.anomaly import detect_anomaly, eva_evaluate
from services.zk_proof import generate_zk_proof, verify_proof, compute_prediction_hash
from services.binance_data import fetch_binance_ticker, fetch_binance_klines, fetch_binance_depth, fetch_binance_recent_trades
from services.referral import generate_referral_code, calculate_staking_rewards, get_tier, calculate_voting_power, REFERRAL_REWARD, STAKING_APY, MIN_STAKE

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─── Pydantic Models ─────────────────────────────────────────

class ModelCreate(BaseModel):
    name: str
    model_type: str = "LSTM"
    strategy: str = ""
    description: str = ""
    developer_wallet: str = ""

class VoteCreate(BaseModel):
    model_id: str
    voter_wallet: str
    vote_count: int = 1
    vote_type: str = "approve"  # approve, reject, remove
    tx_hash: str = ""

class AllocationCreate(BaseModel):
    model_id: str
    wallet_address: str
    amount: float
    tx_hash: str = ""

class ExecutionCreate(BaseModel):
    signal_id: str
    model_id: str
    wallet_address: str
    action: str  # BUY or SELL
    amount: float = 0
    tx_hash: str = ""

class ReferralCreate(BaseModel):
    wallet_address: str
    referral_code: str = ""

class StakeCreate(BaseModel):
    wallet_address: str
    amount: float
    tx_hash: str = ""

class UnstakeCreate(BaseModel):
    wallet_address: str
    stake_id: str
    tx_hash: str = ""

class ContractDeployment(BaseModel):
    contract_name: str
    address: str
    tx_hash: str
    deployer: str

# ─── Health & Status ─────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "Aegis Protocol API", "version": "1.0.0", "status": "active"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ─── Market Data ─────────────────────────────────────────────

@api_router.get("/market/prices")
async def get_prices():
    data = await fetch_crypto_prices()
    return {"prices": data}

@api_router.get("/market/history/{symbol}")
async def get_history(symbol: str = "bitcoin", days: int = 30):
    data = await fetch_price_history(symbol, days)
    return {"symbol": symbol, "days": days, "prices": data}

@api_router.get("/market/indicators/{symbol}")
async def get_indicators(symbol: str = "bitcoin"):
    history = await fetch_price_history(symbol, 30)
    indicators = compute_all_indicators(history)
    return {"symbol": symbol, "indicators": indicators}

@api_router.get("/market/fear-greed")
async def get_fear_greed():
    data = await fetch_fear_greed_index()
    return {"fear_greed": data}

# ─── AI Models ───────────────────────────────────────────────

@api_router.get("/models")
async def list_models():
    models = await db.models.find({}, {"_id": 0}).to_list(100)
    return {"models": models}

@api_router.get("/models/{model_id}")
async def get_model(model_id: str):
    model = await db.models.find_one({"id": model_id}, {"_id": 0})
    if not model:
        raise HTTPException(404, "Model not found")
    return model

@api_router.post("/models")
async def create_model(data: ModelCreate):
    model_id = str(uuid.uuid4())[:8]
    model_hash = compute_model_hash(data.name, data.model_type)
    
    model_doc = {
        "id": model_id,
        "name": data.name,
        "model_type": data.model_type,
        "strategy": data.strategy,
        "description": data.description,
        "developer_wallet": data.developer_wallet,
        "model_hash": model_hash,
        "ipfs_cid": "",
        "status": "pending_votes",
        "trust_score": 50,
        "total_signals": 0,
        "accuracy": 0,
        "total_votes": 0,
        "approve_votes": 0,
        "reject_votes": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.models.insert_one(model_doc)
    model_doc.pop("_id", None)
    return model_doc

@api_router.post("/models/{model_id}/upload")
async def upload_model_file(
    model_id: str,
    file: UploadFile = File(...),
    strategy_doc: Optional[str] = Form(None)
):
    model = await db.models.find_one({"id": model_id})
    if not model:
        raise HTTPException(404, "Model not found")
    
    content = await file.read()
    ipfs_result = await upload_to_ipfs(content, file.filename, {"model_id": model_id})
    
    update = {"ipfs_cid": ipfs_result.get("cid", ""), "ipfs_url": ipfs_result.get("url", "")}
    
    if strategy_doc:
        doc_result = await upload_json_to_ipfs({"strategy": strategy_doc, "model_id": model_id}, f"strategy_{model_id}")
        update["strategy_cid"] = doc_result.get("cid", "")
    
    await db.models.update_one({"id": model_id}, {"$set": update})
    return {"model_id": model_id, "ipfs": ipfs_result}

# ─── Signals ─────────────────────────────────────────────────

@api_router.get("/signals/generate/{model_id}")
async def generate_signal(model_id: str, symbol: str = "bitcoin"):
    model = await db.models.find_one({"id": model_id}, {"_id": 0})
    if not model:
        raise HTTPException(404, "Model not found")
    
    # Get market data & indicators
    history = await fetch_price_history(symbol, 30)
    indicators = compute_all_indicators(history)
    
    # Generate prediction
    prediction = get_model_prediction(model.get("model_type", "LSTM"), indicators)
    prediction["model_id"] = model_id
    prediction["symbol"] = symbol
    
    # Run through gatekeeper
    gatekeeper_result = evaluate_signal(prediction, indicators)
    gatekeeper_result["model_id"] = model_id
    
    # Anomaly detection
    recent_signals = await db.signals.find(
        {"model_id": model_id}, {"_id": 0}
    ).sort("timestamp", -1).to_list(20)
    anomaly_result = detect_anomaly(prediction, recent_signals)
    
    # EVA evaluation
    eva_result = eva_evaluate(prediction, anomaly_result, indicators)
    
    # ZK proof
    zk_proof = generate_zk_proof(model_id, indicators, prediction)
    
    # Store signal
    signal_id = str(uuid.uuid4())[:12]
    signal_doc = {
        "id": signal_id,
        "model_id": model_id,
        "model_name": model.get("name", ""),
        "symbol": symbol,
        "prediction": prediction,
        "gatekeeper": gatekeeper_result,
        "anomaly": anomaly_result,
        "eva": eva_result,
        "zk_proof": {
            "proof_hash": zk_proof["proof_hash"],
            "verified": zk_proof["verified"]
        },
        "prediction_hash": compute_prediction_hash(prediction),
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.signals.insert_one(signal_doc)
    signal_doc.pop("_id", None)
    
    # Update model stats
    await db.models.update_one(
        {"id": model_id},
        {"$inc": {"total_signals": 1}}
    )
    
    # Store gatekeeper log
    gk_log = {**gatekeeper_result, "signal_id": signal_id, "gk_hash": compute_gatekeeper_hash(gatekeeper_result)}
    await db.gatekeeper_logs.insert_one(gk_log)
    
    return signal_doc

@api_router.get("/signals")
async def list_signals(limit: int = 50, model_id: Optional[str] = None):
    query = {}
    if model_id:
        query["model_id"] = model_id
    signals = await db.signals.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"signals": signals}

@api_router.get("/signals/{signal_id}")
async def get_signal(signal_id: str):
    signal = await db.signals.find_one({"id": signal_id}, {"_id": 0})
    if not signal:
        raise HTTPException(404, "Signal not found")
    return signal

# ─── Gatekeeper ──────────────────────────────────────────────

@api_router.get("/gatekeeper/logs")
async def get_gatekeeper_logs(limit: int = 50, model_id: Optional[str] = None):
    query = {}
    if model_id:
        query["model_id"] = model_id
    logs = await db.gatekeeper_logs.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"logs": logs}

# ─── DAO Voting ──────────────────────────────────────────────

@api_router.post("/dao/vote")
async def cast_vote(data: VoteCreate):
    model = await db.models.find_one({"id": data.model_id})
    if not model:
        raise HTTPException(404, "Model not found")
    
    # Quadratic voting: cost = votes^2
    cost = data.vote_count ** 2
    
    vote_doc = {
        "id": str(uuid.uuid4())[:12],
        "model_id": data.model_id,
        "voter_wallet": data.voter_wallet,
        "vote_count": data.vote_count,
        "vote_type": data.vote_type,
        "cost": cost,
        "tx_hash": data.tx_hash,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.votes.insert_one(vote_doc)
    vote_doc.pop("_id", None)
    
    # Update model vote counts
    if data.vote_type == "approve":
        update = {"$inc": {"total_votes": data.vote_count, "approve_votes": data.vote_count}}
    elif data.vote_type == "reject":
        update = {"$inc": {"total_votes": data.vote_count, "reject_votes": data.vote_count}}
    else:
        update = {"$inc": {"total_votes": data.vote_count}}
    
    await db.models.update_one({"id": data.model_id}, update)
    
    # Check if model should be activated (>= 10 net approve votes)
    updated_model = await db.models.find_one({"id": data.model_id}, {"_id": 0})
    if updated_model:
        net_votes = updated_model.get("approve_votes", 0) - updated_model.get("reject_votes", 0)
        if net_votes >= 10 and updated_model.get("status") == "pending_votes":
            await db.models.update_one({"id": data.model_id}, {"$set": {"status": "active"}})
        elif net_votes <= -10:
            await db.models.update_one({"id": data.model_id}, {"$set": {"status": "rejected"}})
    
    return vote_doc

@api_router.get("/dao/votes")
async def get_votes(model_id: Optional[str] = None, limit: int = 50):
    query = {}
    if model_id:
        query["model_id"] = model_id
    votes = await db.votes.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"votes": votes}

@api_router.get("/dao/proposals")
async def get_proposals():
    models = await db.models.find({"status": {"$in": ["pending_votes", "active"]}}, {"_id": 0}).to_list(100)
    proposals = []
    for m in models:
        proposals.append({
            "model_id": m["id"],
            "name": m.get("name", ""),
            "status": m.get("status", ""),
            "total_votes": m.get("total_votes", 0),
            "approve_votes": m.get("approve_votes", 0),
            "reject_votes": m.get("reject_votes", 0),
            "developer_wallet": m.get("developer_wallet", ""),
            "created_at": m.get("created_at", "")
        })
    return {"proposals": proposals}

# ─── Fund Allocation ─────────────────────────────────────────

@api_router.post("/allocations")
async def create_allocation(data: AllocationCreate):
    model = await db.models.find_one({"id": data.model_id}, {"_id": 0})
    if not model:
        raise HTTPException(404, "Model not found")
    
    alloc_doc = {
        "id": str(uuid.uuid4())[:12],
        "model_id": data.model_id,
        "model_name": model.get("name", ""),
        "wallet_address": data.wallet_address,
        "amount": data.amount,
        "tx_hash": data.tx_hash,
        "status": "confirmed",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.allocations.insert_one(alloc_doc)
    alloc_doc.pop("_id", None)
    return alloc_doc

@api_router.get("/allocations")
async def get_allocations(wallet: Optional[str] = None, limit: int = 50):
    query = {}
    if wallet:
        query["wallet_address"] = wallet
    allocs = await db.allocations.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    
    total = sum(a.get("amount", 0) for a in allocs)
    return {"allocations": allocs, "total_allocated": total}

# ─── Signal Execution ────────────────────────────────────────

@api_router.post("/executions")
async def create_execution(data: ExecutionCreate):
    exec_doc = {
        "id": str(uuid.uuid4())[:12],
        "signal_id": data.signal_id,
        "model_id": data.model_id,
        "wallet_address": data.wallet_address,
        "action": data.action,
        "amount": data.amount,
        "tx_hash": data.tx_hash,
        "status": "user_executed",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.executions.insert_one(exec_doc)
    exec_doc.pop("_id", None)
    
    # Log to history
    await db.history.insert_one({
        "type": "execution",
        "wallet_address": data.wallet_address,
        "details": exec_doc,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return exec_doc

@api_router.get("/executions")
async def get_executions(wallet: Optional[str] = None, limit: int = 50):
    query = {}
    if wallet:
        query["wallet_address"] = wallet
    execs = await db.executions.find(query, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"executions": execs}

# ─── Backtest ────────────────────────────────────────────────

@api_router.get("/backtest/{model_id}")
async def backtest_model(model_id: str, symbol: str = "bitcoin", days: int = 30):
    model = await db.models.find_one({"id": model_id}, {"_id": 0})
    if not model:
        raise HTTPException(404, "Model not found")
    
    history = await fetch_price_history(symbol, days)
    result = run_backtest(history, model.get("model_type", "LSTM"), timeframe_days=days)
    result["model_id"] = model_id
    result["model_name"] = model.get("name", "")
    result["symbol"] = symbol
    return result

# ─── ZK Verification ────────────────────────────────────────

@api_router.get("/zk/proofs")
async def get_zk_proofs(limit: int = 20):
    signals = await db.signals.find(
        {"zk_proof.proof_hash": {"$exists": True}},
        {"_id": 0, "id": 1, "model_id": 1, "zk_proof": 1, "prediction_hash": 1, "timestamp": 1}
    ).sort("timestamp", -1).to_list(limit)
    return {"proofs": signals}

@api_router.post("/zk/verify")
async def verify_zk_proof(proof_data: dict):
    result = verify_proof(proof_data)
    return result

# ─── User History ────────────────────────────────────────────

@api_router.get("/history/{wallet}")
async def get_user_history(wallet: str, limit: int = 100):
    # Collect from multiple collections
    allocs = await db.allocations.find({"wallet_address": wallet}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    execs = await db.executions.find({"wallet_address": wallet}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    votes = await db.votes.find({"voter_wallet": wallet}, {"_id": 0}).sort("timestamp", -1).to_list(50)
    
    history = []
    for a in allocs:
        history.append({"type": "allocation", **a})
    for e in execs:
        history.append({"type": "execution", **e})
    for v in votes:
        history.append({"type": "vote", **v})
    
    # Sort by timestamp
    history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    return {"wallet": wallet, "history": history[:limit]}

# ─── Admin Monitoring (READ ONLY) ───────────────────────────

@api_router.get("/admin/stats")
async def admin_stats():
    model_count = await db.models.count_documents({})
    signal_count = await db.signals.count_documents({})
    vote_count = await db.votes.count_documents({})
    alloc_count = await db.allocations.count_documents({})
    exec_count = await db.executions.count_documents({})
    active_models = await db.models.count_documents({"status": "active"})
    
    recent_signals = await db.signals.find({}, {"_id": 0}).sort("timestamp", -1).to_list(5)
    
    return {
        "total_models": model_count,
        "active_models": active_models,
        "total_signals": signal_count,
        "total_votes": vote_count,
        "total_allocations": alloc_count,
        "total_executions": exec_count,
        "recent_signals": recent_signals,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@api_router.get("/admin/gatekeeper-stats")
async def admin_gatekeeper_stats():
    total = await db.gatekeeper_logs.count_documents({})
    passed = await db.gatekeeper_logs.count_documents({"decision": "PASS"})
    flagged = await db.gatekeeper_logs.count_documents({"decision": "FLAG"})
    blocked = await db.gatekeeper_logs.count_documents({"decision": "BLOCK"})
    return {
        "total": total, "passed": passed, "flagged": flagged, "blocked": blocked,
        "pass_rate": round(passed / max(total, 1) * 100, 2)
    }

# ─── Binance Market Data ─────────────────────────────────────

@api_router.get("/binance/ticker/{symbol}")
async def binance_ticker(symbol: str = "bitcoin"):
    data = await fetch_binance_ticker(symbol)
    return {"ticker": data}

@api_router.get("/binance/klines/{symbol}")
async def binance_klines(symbol: str = "bitcoin", interval: str = "1h", limit: int = 100):
    data = await fetch_binance_klines(symbol, interval, min(limit, 500))
    return {"symbol": symbol, "interval": interval, "klines": data}

@api_router.get("/binance/depth/{symbol}")
async def binance_depth(symbol: str = "bitcoin", limit: int = 20):
    data = await fetch_binance_depth(symbol, limit)
    return {"symbol": symbol, "depth": data}

@api_router.get("/binance/trades/{symbol}")
async def binance_trades(symbol: str = "bitcoin", limit: int = 20):
    data = await fetch_binance_recent_trades(symbol, limit)
    return {"symbol": symbol, "trades": data}

# ─── Referral System ─────────────────────────────────────────

@api_router.post("/referral/register")
async def register_referral(data: ReferralCreate):
    existing = await db.referrals.find_one({"wallet_address": data.wallet_address}, {"_id": 0})
    if existing:
        return existing

    code = generate_referral_code(data.wallet_address)
    ref_doc = {
        "id": str(uuid.uuid4())[:12],
        "wallet_address": data.wallet_address,
        "referral_code": code,
        "referred_by": data.referral_code or None,
        "referral_count": 0,
        "total_tokens_earned": 0,
        "tier": "bronze",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    # If referred by someone, reward the referrer
    if data.referral_code:
        referrer = await db.referrals.find_one({"referral_code": data.referral_code})
        if referrer:
            await db.referrals.update_one(
                {"referral_code": data.referral_code},
                {"$inc": {"referral_count": 1, "total_tokens_earned": REFERRAL_REWARD}}
            )
            # Grant tokens to referrer
            await _grant_tokens(referrer["wallet_address"], REFERRAL_REWARD, "referral_bonus")

    await db.referrals.insert_one(ref_doc)
    ref_doc.pop("_id", None)

    # Initialize token balance
    await _ensure_token_balance(data.wallet_address)

    return ref_doc

@api_router.get("/referral/{wallet}")
async def get_referral(wallet: str):
    ref = await db.referrals.find_one({"wallet_address": wallet}, {"_id": 0})
    if not ref:
        return {"wallet_address": wallet, "referral_code": None, "referral_count": 0}
    return ref

# ─── Staking System ──────────────────────────────────────────

@api_router.post("/staking/stake")
async def create_stake(data: StakeCreate):
    if data.amount < MIN_STAKE:
        raise HTTPException(400, f"Minimum stake is {MIN_STAKE} ETH")

    stake_doc = {
        "id": str(uuid.uuid4())[:12],
        "wallet_address": data.wallet_address,
        "amount": data.amount,
        "tx_hash": data.tx_hash,
        "status": "active",
        "apy": STAKING_APY,
        "rewards_earned": 0,
        "staked_at": datetime.now(timezone.utc).isoformat(),
        "last_reward_calc": datetime.now(timezone.utc).isoformat()
    }
    await db.staking.insert_one(stake_doc)
    stake_doc.pop("_id", None)

    # Grant initial staking tokens
    await _grant_tokens(data.wallet_address, data.amount * 100, "staking_deposit")

    return stake_doc

@api_router.post("/staking/unstake")
async def unstake(data: UnstakeCreate):
    stake = await db.staking.find_one({"id": data.stake_id, "wallet_address": data.wallet_address})
    if not stake:
        raise HTTPException(404, "Stake not found")
    if stake.get("status") != "active":
        raise HTTPException(400, "Stake already withdrawn")

    # Calculate rewards
    staked_at = datetime.fromisoformat(stake["staked_at"])
    now = datetime.now(timezone.utc)
    days = max((now - staked_at).total_seconds() / 86400, 0)
    rewards = calculate_staking_rewards(stake["amount"], days)

    await db.staking.update_one(
        {"id": data.stake_id},
        {"$set": {"status": "withdrawn", "rewards_earned": rewards, "withdrawn_at": now.isoformat()}}
    )

    # Grant reward tokens
    await _grant_tokens(data.wallet_address, rewards * 1000, "staking_reward")

    return {"stake_id": data.stake_id, "amount": stake["amount"], "rewards": rewards, "status": "withdrawn"}

@api_router.get("/staking/{wallet}")
async def get_stakes(wallet: str):
    stakes = await db.staking.find({"wallet_address": wallet}, {"_id": 0}).to_list(50)
    total_staked = sum(s["amount"] for s in stakes if s.get("status") == "active")
    total_rewards = sum(s.get("rewards_earned", 0) for s in stakes)
    return {"stakes": stakes, "total_staked": total_staked, "total_rewards": total_rewards}

# ─── Governance Tokens ───────────────────────────────────────

@api_router.get("/tokens/{wallet}")
async def get_token_balance(wallet: str):
    balance = await db.governance_tokens.find_one({"wallet_address": wallet}, {"_id": 0})
    if not balance:
        return {"wallet_address": wallet, "balance": 0, "tier": "bronze", "voting_power": 0, "history": []}

    tier = get_tier(balance.get("balance", 0))
    voting_power = calculate_voting_power(balance.get("balance", 0), tier)
    balance["tier"] = tier
    balance["voting_power"] = voting_power
    return balance

@api_router.get("/tokens/{wallet}/history")
async def get_token_history(wallet: str, limit: int = 50):
    txs = await db.token_transactions.find({"wallet_address": wallet}, {"_id": 0}).sort("timestamp", -1).to_list(limit)
    return {"transactions": txs}

# ─── Smart Contract Tracking ─────────────────────────────────

@api_router.post("/contracts/deployed")
async def track_contract_deployment(data: ContractDeployment):
    doc = {
        "id": str(uuid.uuid4())[:12],
        "contract_name": data.contract_name,
        "address": data.address,
        "tx_hash": data.tx_hash,
        "deployer": data.deployer,
        "network": "sepolia",
        "chain_id": 11155111,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.contracts.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.get("/contracts")
async def get_deployed_contracts():
    contracts = await db.contracts.find({}, {"_id": 0}).to_list(20)
    return {"contracts": contracts}

# ─── WebSocket Signal Streaming ──────────────────────────────

ws_clients = set()

@app.websocket("/api/ws/signals")
async def websocket_signals(websocket: WebSocket):
    await websocket.accept()
    ws_clients.add(websocket)
    logger.info(f"WebSocket client connected. Total: {len(ws_clients)}")
    try:
        while True:
            # Keep connection alive, listen for model selection
            data = await websocket.receive_text()
            # Client can send model_id to subscribe
            logger.info(f"WS received: {data}")
    except WebSocketDisconnect:
        ws_clients.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total: {len(ws_clients)}")
    except Exception:
        ws_clients.discard(websocket)


async def broadcast_signal(signal_data):
    """Broadcast signal to all connected WebSocket clients"""
    dead = set()
    for ws in ws_clients:
        try:
            await ws.send_json(signal_data)
        except Exception:
            dead.add(ws)
    ws_clients.difference_update(dead)


async def signal_streaming_task():
    """Background task that generates signals periodically"""
    await asyncio.sleep(5)  # Wait for startup
    logger.info("Signal streaming task started")
    model_ids = ["lstm-001", "gru-001", "ens-001"]
    idx = 0

    while True:
        try:
            if ws_clients:
                model_id = model_ids[idx % len(model_ids)]
                model = await db.models.find_one({"id": model_id}, {"_id": 0})
                if model:
                    history = await fetch_price_history("bitcoin", 30)
                    indicators = compute_all_indicators(history)
                    prediction = get_model_prediction(model.get("model_type", "LSTM"), indicators)
                    prediction["model_id"] = model_id
                    prediction["symbol"] = "bitcoin"

                    gatekeeper_result = evaluate_signal(prediction, indicators)
                    gatekeeper_result["model_id"] = model_id

                    signal_data = {
                        "type": "signal",
                        "id": str(uuid.uuid4())[:12],
                        "model_id": model_id,
                        "model_name": model.get("name", ""),
                        "prediction": prediction,
                        "gatekeeper": gatekeeper_result,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                    await broadcast_signal(signal_data)
                idx += 1
        except Exception as e:
            logger.error(f"Signal streaming error: {e}")

        await asyncio.sleep(15)  # Every 15 seconds

# Helper functions for token system
async def _ensure_token_balance(wallet_address):
    existing = await db.governance_tokens.find_one({"wallet_address": wallet_address})
    if not existing:
        await db.governance_tokens.insert_one({
            "wallet_address": wallet_address,
            "balance": 100,  # Welcome bonus
            "total_earned": 100,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.token_transactions.insert_one({
            "wallet_address": wallet_address,
            "amount": 100,
            "type": "welcome_bonus",
            "description": "Welcome bonus tokens",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })

async def _grant_tokens(wallet_address, amount, tx_type):
    await _ensure_token_balance(wallet_address)
    await db.governance_tokens.update_one(
        {"wallet_address": wallet_address},
        {"$inc": {"balance": amount, "total_earned": amount}}
    )
    await db.token_transactions.insert_one({
        "wallet_address": wallet_address,
        "amount": amount,
        "type": tx_type,
        "description": f"Earned {amount} tokens via {tx_type}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

# ─── Seed Data ───────────────────────────────────────────────

@app.on_event("startup")
async def seed_data():
    count = await db.models.count_documents({})
    if count == 0:
        logger.info("Seeding initial models...")
        seed_models = [
            {
                "id": "lstm-001",
                "name": "Alpha LSTM",
                "model_type": "LSTM",
                "strategy": "Momentum-based LSTM analyzing RSI + MACD crossover patterns with 14-day lookback",
                "description": "Long Short-Term Memory model optimized for crypto momentum trading. Uses gate mechanisms to capture long-range price dependencies.",
                "developer_wallet": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
                "model_hash": hashlib.sha256(b"alpha-lstm-v1").hexdigest(),
                "ipfs_cid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
                "status": "active",
                "trust_score": 78,
                "total_signals": 156,
                "accuracy": 67.3,
                "total_votes": 24,
                "approve_votes": 20,
                "reject_votes": 4,
                "created_at": "2024-12-01T00:00:00Z"
            },
            {
                "id": "gru-001",
                "name": "Beta GRU",
                "model_type": "GRU",
                "strategy": "Mean-reversion GRU using Bollinger Band squeeze detection with adaptive thresholds",
                "description": "Gated Recurrent Unit model focused on mean-reversion signals. Fewer parameters than LSTM, faster inference for real-time trading.",
                "developer_wallet": "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
                "model_hash": hashlib.sha256(b"beta-gru-v1").hexdigest(),
                "ipfs_cid": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
                "status": "active",
                "trust_score": 72,
                "total_signals": 89,
                "accuracy": 63.1,
                "total_votes": 18,
                "approve_votes": 15,
                "reject_votes": 3,
                "created_at": "2024-12-15T00:00:00Z"
            },
            {
                "id": "ens-001",
                "name": "Gamma Ensemble",
                "model_type": "Ensemble",
                "strategy": "Weighted ensemble combining LSTM (40%), GRU (30%), and Transformer (30%) predictions with volatility-adjusted confidence",
                "description": "Ensemble model that combines multiple AI architectures for more robust signal generation. Reduces single-model bias.",
                "developer_wallet": "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
                "model_hash": hashlib.sha256(b"gamma-ensemble-v1").hexdigest(),
                "ipfs_cid": "QmZ4tDuvesekSs4qM5DYaRKt23bodFhfiz3UThopegp9vB",
                "status": "pending_votes",
                "trust_score": 60,
                "total_signals": 34,
                "accuracy": 58.8,
                "total_votes": 7,
                "approve_votes": 5,
                "reject_votes": 2,
                "created_at": "2025-01-10T00:00:00Z"
            },
            {
                "id": "tf-001",
                "name": "Delta Transformer",
                "model_type": "Transformer",
                "strategy": "Multi-head attention Transformer analyzing cross-asset correlations with positional encoding over 30-day windows",
                "description": "Transformer architecture with self-attention for capturing complex inter-market relationships. Uses multi-head attention across temporal price features.",
                "developer_wallet": "0x1234567890AbcdEf1234567890aBcDeF12345678",
                "model_hash": hashlib.sha256(b"delta-transformer-v1").hexdigest(),
                "ipfs_cid": "QmT9qk3CRYbFDWpDFYeAv8T8H1gnongwKhh5J68NLkLnMx",
                "status": "active",
                "trust_score": 82,
                "total_signals": 67,
                "accuracy": 71.2,
                "total_votes": 31,
                "approve_votes": 26,
                "reject_votes": 5,
                "created_at": "2025-02-01T00:00:00Z"
            }
        ]
        for m in seed_models:
            await db.models.insert_one(m)
        logger.info("Seed data created successfully (4 models incl. Transformer)")

    # Start background signal streaming
    asyncio.create_task(signal_streaming_task())

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
