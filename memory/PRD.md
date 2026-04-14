# Aegis Protocol - PRD

## Problem Statement
Build a Decentralized, Verifiable AI Asset Management Protocol where AI models generate trading signals, Gatekeeper filters/blocks signals, users control execution via wallet, developers upload models with code (IPFS), DAO governs model approval, and all critical actions are verifiable on blockchain.

## Architecture
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React + Tailwind + Shadcn UI on port 3000
- **Database**: MongoDB (motor async driver)
- **IPFS**: Pinata for decentralized storage
- **Blockchain**: Sepolia via Alchemy (hybrid - real wallet + simulated backend)
- **AI Models**: Numpy-based LSTM + GRU (lightweight, real architecture)

## Core Requirements
1. AI signal generation (LSTM, GRU, Ensemble)
2. Multi-factor Gatekeeper (confidence, volatility, drawdown, consistency)
3. Non-custodial - wallet-based execution
4. DAO quadratic voting for model governance
5. IPFS storage for model code
6. ZK verification (simulated)
7. Anomaly detection (Z-score) + EVA ethics agent
8. Strategy backtesting engine
9. Admin monitoring (read-only)

## User Personas
- **Traders**: Use dashboard to view signals, allocate funds, execute via wallet
- **Developers**: Upload AI models to IPFS, await DAO approval
- **DAO Members**: Vote on model approval/rejection using quadratic voting
- **Admins**: Monitor system health (read-only, no model control)

## What's Been Implemented (Apr 14, 2026)
- Full backend with 20+ API endpoints
- Market data from CoinGecko + technical indicators (RSI, MACD, EMA, Bollinger)
- AI signal generation (LSTM, GRU, Ensemble models)
- Multi-factor Gatekeeper system
- IPFS upload via Pinata
- DAO quadratic voting
- Fund allocation + signal execution (wallet-based)
- Strategy backtester with equity curve
- Anomaly detection + EVA ethics agent
- ZK verification (simulated proofs)
- 6 frontend pages: Landing, Dashboard, Marketplace, Developer, DAO, Admin
- Real MetaMask wallet integration with demo fallback
- Seed data: 3 models (Alpha LSTM, Beta GRU, Gamma Ensemble)

## Prioritized Backlog
### P0 (Critical)
- [x] Core signal generation pipeline
- [x] Gatekeeper multi-factor filtering
- [x] Dashboard with model selector
- [x] Wallet connection (MetaMask + demo)
- [x] Fund allocation via wallet

### P1 (High)
- [ ] Real Sepolia smart contract deployment (ModelRegistry, VotingContract, VerificationStorage)
- [ ] Transformer model architecture
- [ ] Real-time WebSocket signal updates
- [ ] User authentication system

### P2 (Medium)
- [ ] Advanced backtest metrics (Monte Carlo simulation)
- [ ] Model performance tracking over time
- [ ] Portfolio analytics dashboard
- [ ] Mobile-responsive refinements

## Next Tasks
1. Deploy Solidity contracts to Sepolia
2. Add Transformer model to AI system
3. Implement WebSocket for real-time signal feed
4. Add user authentication/profiles
5. Integrate real Binance data feeds
