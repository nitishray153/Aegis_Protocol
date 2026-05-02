# Aegis Protocol MVP

Decentralized, verifiable AI asset-management MVP with:
- FastAPI backend
- PyTorch + numpy model inference
- IPFS upload flow
- DAO quadratic voting
- Solidity contracts for registry/voting/verification storage
- React frontend dashboard, marketplace, developer and DAO panels

## Monorepo Structure

- `backend/` FastAPI APIs, services, model logic, IPFS hooks, backtester.
- `backend/scripts/` dataset fetch + model training.
- `backend/data/` local datasets and trained model weights.
- `contracts/` Solidity contracts (`ModelRegistry`, `VotingContract`, `VerificationStorage`).
- `frontend/` web app UI.

## Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `.env` in `backend/`:

```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=aegis_protocol
IPFS_API_URL=http://127.0.0.1:5001
```

Run API:

```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

## Real Dataset + Model Training

Fetch BTC historical dataset from CoinGecko and train PyTorch LSTM/GRU/Transformer weights:

```bash
cd backend
python scripts/fetch_dataset.py
python scripts/train_models.py
```

Weights are stored in `backend/data/weights/*.pt` and automatically used by `get_model_prediction` when present.

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Smart Contracts (Sepolia)

Contracts are in `contracts/`:
- `ModelRegistry.sol`
- `VotingContract.sol`
- `VerificationStorage.sol`

Deploy with your preferred stack (Hardhat/Foundry). Store only hashes/CIDs on-chain per protocol rules.

## Key API Routes

- Market data: `/api/market/*`, `/api/binance/*`
- Models: `/api/models`, `/api/models/{id}/upload`
- Signal pipeline: `/api/signals/generate/{model_id}`
- Gatekeeper logs: `/api/gatekeeper/logs`
- DAO voting: `/api/dao/vote`, `/api/dao/proposals`
- Allocation/execution intent: `/api/allocations`, `/api/executions`
- Backtest: `/api/backtest/{model_id}`
- ZK simulated proof: `/api/zk/proofs`, `/api/zk/verify`

## Production Notes

- No fund custody, no auto-trade execution.
- Wallet tx hash required for allocations, votes, executions.
- Admin endpoints are monitoring/read-only.
- Critical records include hashes for chain anchoring and verification.


## One-Command Local Preview (Docker)

1. Copy backend env:

```bash
cp backend/.env.example backend/.env
```

2. Start full stack:

```bash
docker compose up --build
```

3. Open locally:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000/api/health`
- Swagger docs: `http://localhost:8000/docs`

Stop:

```bash
docker compose down
```
