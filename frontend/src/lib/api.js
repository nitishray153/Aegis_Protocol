import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = axios.create({ baseURL: `${BACKEND_URL}/api` });

// Market
export const fetchPrices = () => API.get('/market/prices');
export const fetchHistory = (symbol = 'bitcoin', days = 30) => API.get(`/market/history/${symbol}?days=${days}`);
export const fetchIndicators = (symbol = 'bitcoin') => API.get(`/market/indicators/${symbol}`);
export const fetchFearGreed = () => API.get('/market/fear-greed');

// Models
export const fetchModels = () => API.get('/models');
export const fetchModel = (id) => API.get(`/models/${id}`);
export const createModel = (data) => API.post('/models', data);
export const uploadModelFile = (modelId, formData) => API.post(`/models/${modelId}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

// Signals
export const generateSignal = (modelId, symbol = 'bitcoin') => API.get(`/signals/generate/${modelId}?symbol=${symbol}`);
export const fetchSignals = (limit = 50, modelId = null) => {
  let url = `/signals?limit=${limit}`;
  if (modelId) url += `&model_id=${modelId}`;
  return API.get(url);
};

// Gatekeeper
export const fetchGatekeeperLogs = (limit = 50) => API.get(`/gatekeeper/logs?limit=${limit}`);

// DAO
export const castVote = (data) => API.post('/dao/vote', data);
export const fetchVotes = (modelId = null) => {
  let url = '/dao/votes';
  if (modelId) url += `?model_id=${modelId}`;
  return API.get(url);
};
export const fetchProposals = () => API.get('/dao/proposals');

// Allocations
export const createAllocation = (data) => API.post('/allocations', data);
export const fetchAllocations = (wallet = null) => {
  let url = '/allocations';
  if (wallet) url += `?wallet=${wallet}`;
  return API.get(url);
};

// Executions
export const createExecution = (data) => API.post('/executions', data);
export const fetchExecutions = (wallet = null) => {
  let url = '/executions';
  if (wallet) url += `?wallet=${wallet}`;
  return API.get(url);
};

// Backtest
export const runBacktest = (modelId, symbol = 'bitcoin', days = 30) => API.get(`/backtest/${modelId}?symbol=${symbol}&days=${days}`);

// ZK
export const fetchZkProofs = () => API.get('/zk/proofs');

// History
export const fetchUserHistory = (wallet) => API.get(`/history/${wallet}`);

// Admin
export const fetchAdminStats = () => API.get('/admin/stats');
export const fetchGatekeeperStats = () => API.get('/admin/gatekeeper-stats');

// Binance
export const fetchBinanceTicker = (symbol = 'bitcoin') => API.get(`/binance/ticker/${symbol}`);
export const fetchBinanceKlines = (symbol = 'bitcoin', interval = '1h', limit = 100) => API.get(`/binance/klines/${symbol}?interval=${interval}&limit=${limit}`);
export const fetchBinanceDepth = (symbol = 'bitcoin') => API.get(`/binance/depth/${symbol}`);
export const fetchBinanceTrades = (symbol = 'bitcoin') => API.get(`/binance/trades/${symbol}`);

// Referral
export const registerReferral = (data) => API.post('/referral/register', data);
export const fetchReferral = (wallet) => API.get(`/referral/${wallet}`);

// Staking
export const createStake = (data) => API.post('/staking/stake', data);
export const unstake = (data) => API.post('/staking/unstake', data);
export const fetchStakes = (wallet) => API.get(`/staking/${wallet}`);

// Governance Tokens
export const fetchTokenBalance = (wallet) => API.get(`/tokens/${wallet}`);
export const fetchTokenHistory = (wallet) => API.get(`/tokens/${wallet}/history`);

// Contracts
export const trackContractDeployment = (data) => API.post('/contracts/deployed', data);
export const fetchDeployedContracts = () => API.get('/contracts');

// WebSocket
export const getWebSocketUrl = () => {
  const base = process.env.REACT_APP_BACKEND_URL;
  const wsBase = base.replace('https://', 'wss://').replace('http://', 'ws://');
  return `${wsBase}/api/ws/signals`;
};

export default API;
