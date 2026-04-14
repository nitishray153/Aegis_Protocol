# Aegis Protocol - PRD

## Problem Statement
Build a Decentralized, Verifiable AI Asset Management Protocol where AI models generate trading signals, Gatekeeper filters/blocks signals, users control execution via wallet, developers upload models with code (IPFS), DAO governs model approval, and all critical actions are verifiable on blockchain.

## Architecture
- **Backend**: FastAPI (Python) on port 8001
- **Frontend**: React + Tailwind + Shadcn UI on port 3000
- **Database**: MongoDB (motor async driver)
- **IPFS**: Pinata for decentralized storage
- **Blockchain**: Sepolia via Alchemy (real wallet + contracts written)
- **AI Models**: Numpy-based LSTM, GRU, Transformer, Ensemble
- **Data**: CoinGecko + Binance real-time APIs
- **WebSocket**: Real-time signal streaming

## What's Been Implemented

### Phase 1 (Apr 14, 2026)
- Full backend with 20+ API endpoints
- Market data from CoinGecko + technical indicators (RSI, MACD, EMA, Bollinger)
- AI signal generation (LSTM, GRU, Ensemble)
- Multi-factor Gatekeeper system
- IPFS upload via Pinata
- DAO quadratic voting
- Fund allocation + signal execution (wallet-based)
- Strategy backtester with equity curve
- Anomaly detection + EVA ethics agent
- ZK verification (simulated proofs)
- 6 frontend pages: Landing, Dashboard, Marketplace, Developer, DAO, Admin

### Phase 2 (Apr 14, 2026)
- Solidity smart contracts: ModelRegistry, VotingContract, VerificationStorage (source code ready)
- Transformer model architecture (multi-head self-attention)
- WebSocket signal streaming (15-second intervals)
- Real Binance API integration (ticker, klines, depth, trades)
- Referral system with unique codes + reward tracking
- Staking system with 12% APY + governance token rewards
- Governance token system with 5 tiers (Bronze→Diamond)
- Voting power multipliers based on tier
- Smart contract tracking UI
- 7 pages total (added Staking/Referrals page)
- 25+ backend API endpoints, all tested 100%

## Seed Models
1. Alpha LSTM (lstm-001) - active
2. Beta GRU (gru-001) - active
3. Gamma Ensemble (ens-001) - pending_votes
4. Delta Transformer (tf-001) - active

## Prioritized Backlog
### P0 (Done)
- [x] Core signal generation pipeline (4 model types)
- [x] Multi-factor gatekeeper
- [x] Dashboard with model selector
- [x] Wallet connection (MetaMask + demo)
- [x] Fund allocation via wallet
- [x] Transformer model
- [x] WebSocket streaming
- [x] Binance integration
- [x] Referral/Staking

### P1 (Next)
- [ ] Actually deploy contracts to Sepolia (needs funded wallet)
- [ ] Real-time WebSocket market data from Binance
- [ ] User authentication/profiles
- [ ] Portfolio analytics dashboard

### P2 (Later)
- [ ] Monte Carlo backtesting
- [ ] Model performance tracking over time
- [ ] Mobile-responsive refinements
- [ ] Advanced DAO proposals (parameter changes)
