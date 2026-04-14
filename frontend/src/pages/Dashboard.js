import { useState, useEffect, useCallback } from 'react';
import { fetchModels, fetchIndicators, generateSignal, fetchAllocations, createAllocation, createExecution, fetchSignals, runBacktest, fetchUserHistory } from '../lib/api';
import { signTransaction, getWalletAddress } from '../lib/wallet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { ChartLine, Lightning, ShieldCheck, Wallet, Clock, TrendUp, TrendDown, Minus, Warning, CheckCircle, XCircle, ArrowRight } from '@phosphor-icons/react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';
import { toast } from 'sonner';

function SignalBadge({ signal }) {
  const colors = { BUY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', SELL: 'bg-red-500/10 text-red-400 border-red-500/20', HOLD: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
  const icons = { BUY: TrendUp, SELL: TrendDown, HOLD: Minus };
  const Icon = icons[signal] || Minus;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono border ${colors[signal] || colors.HOLD}`}>
      <Icon size={12} weight="bold" />
      {signal}
    </span>
  );
}

function DecisionBadge({ decision }) {
  const colors = { PASS: 'bg-emerald-500/10 text-emerald-400', FLAG: 'bg-yellow-500/10 text-yellow-400', BLOCK: 'bg-red-500/10 text-red-400' };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono ${colors[decision] || ''}`}>{decision}</span>;
}

export default function Dashboard({ wallet }) {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [indicators, setIndicators] = useState(null);
  const [currentSignal, setCurrentSignal] = useState(null);
  const [signals, setSignals] = useState([]);
  const [allocations, setAllocations] = useState({ allocations: [], total_allocated: 0 });
  const [backtestResult, setBtResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState({});
  const [allocAmount, setAllocAmount] = useState('');
  const [btDays, setBtDays] = useState(30);
  const [symbol] = useState('bitcoin');

  const walletAddr = wallet?.address || getWalletAddress();

  useEffect(() => {
    fetchModels().then(r => {
      setModels(r.data.models || []);
      if (r.data.models?.length) setSelectedModel(r.data.models[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchIndicators(symbol).then(r => setIndicators(r.data.indicators)).catch(() => {});
  }, [symbol]);

  useEffect(() => {
    if (walletAddr) {
      fetchAllocations(walletAddr).then(r => setAllocations(r.data)).catch(() => {});
      fetchUserHistory(walletAddr).then(r => setHistory(r.data.history || [])).catch(() => {});
    }
  }, [walletAddr]);

  useEffect(() => {
    if (selectedModel) {
      fetchSignals(20, selectedModel).then(r => setSignals(r.data.signals || [])).catch(() => {});
    }
  }, [selectedModel]);

  const handleGenerateSignal = useCallback(async () => {
    if (!selectedModel) return;
    setLoading(l => ({ ...l, signal: true }));
    try {
      const r = await generateSignal(selectedModel, symbol);
      setCurrentSignal(r.data);
      setSignals(prev => [r.data, ...prev].slice(0, 50));
      toast.success('Signal generated');
    } catch (e) {
      toast.error('Failed to generate signal');
    }
    setLoading(l => ({ ...l, signal: false }));
  }, [selectedModel, symbol]);

  const handleAllocate = async () => {
    if (!allocAmount || !walletAddr || !selectedModel) return toast.error('Enter amount and connect wallet');
    setLoading(l => ({ ...l, alloc: true }));
    try {
      const txResult = await signTransaction('ALLOCATE_FUNDS', { model_id: selectedModel, amount: parseFloat(allocAmount) });
      await createAllocation({ model_id: selectedModel, wallet_address: walletAddr, amount: parseFloat(allocAmount), tx_hash: txResult.tx_hash });
      toast.success('Funds allocated successfully');
      setAllocAmount('');
      fetchAllocations(walletAddr).then(r => setAllocations(r.data)).catch(() => {});
    } catch (e) {
      toast.error('Allocation failed or rejected');
    }
    setLoading(l => ({ ...l, alloc: false }));
  };

  const handleExecute = async () => {
    if (!currentSignal || !walletAddr) return toast.error('Generate a signal first and connect wallet');
    setLoading(l => ({ ...l, exec: true }));
    try {
      const pred = currentSignal.prediction || currentSignal;
      const txResult = await signTransaction('EXECUTE_SIGNAL', { signal_id: currentSignal.id, action: pred.signal });
      await createExecution({ signal_id: currentSignal.id, model_id: selectedModel, wallet_address: walletAddr, action: pred.signal, tx_hash: txResult.tx_hash });
      toast.success('Execution logged via wallet');
    } catch (e) {
      toast.error('Execution failed or rejected');
    }
    setLoading(l => ({ ...l, exec: false }));
  };

  const handleBacktest = async () => {
    if (!selectedModel) return;
    setLoading(l => ({ ...l, bt: true }));
    try {
      const r = await runBacktest(selectedModel, symbol, btDays);
      setBtResult(r.data);
    } catch (e) {
      toast.error('Backtest failed');
    }
    setLoading(l => ({ ...l, bt: false }));
  };

  const selectedModelData = models.find(m => m.id === selectedModel);
  const pred = currentSignal?.prediction || {};
  const gk = currentSignal?.gatekeeper || {};
  const eva = currentSignal?.eva || {};
  const anomaly = currentSignal?.anomaly || {};

  return (
    <div className="min-h-screen bg-[#050505] p-4 sm:p-6" data-testid="dashboard-page">
      <div className="max-w-[1440px] mx-auto space-y-4">
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Trading Dashboard</span>
            <h1 className="font-heading text-2xl sm:text-3xl text-white">Signal Command Center</h1>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[200px] bg-[#0F0F0F] border-white/10 text-white text-xs" data-testid="model-selector">
                <SelectValue placeholder="Select Model" />
              </SelectTrigger>
              <SelectContent className="bg-[#0F0F0F] border-white/10">
                {models.map(m => (
                  <SelectItem key={m.id} value={m.id} className="text-white text-xs hover:bg-white/5">
                    {m.name} ({m.model_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={handleGenerateSignal}
              disabled={loading.signal || !selectedModel}
              data-testid="generate-signal-button"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00D4FF] text-black text-xs font-semibold hover:bg-[#00B4D8] transition-colors disabled:opacity-50"
            >
              <Lightning size={14} weight="bold" />
              {loading.signal ? 'Generating...' : 'Generate Signal'}
            </button>
          </div>
        </div>

        {/* Top Grid: Signal + Gatekeeper + Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Current Signal */}
          <div className="md:col-span-4 bg-[#0F0F0F] border border-white/10 p-4" data-testid="signal-panel">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Current Signal</span>
              {pred.signal && <SignalBadge signal={pred.signal} />}
            </div>
            {currentSignal ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase">Confidence</span>
                    <div className="font-mono text-xl text-white">{(pred.confidence * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 uppercase">Expected Return</span>
                    <div className={`font-mono text-xl ${pred.expected_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pred.expected_return >= 0 ? '+' : ''}{pred.expected_return?.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Gatekeeper</span>
                    <DecisionBadge decision={gk.decision} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Risk Level</span>
                    <span className="font-mono text-neutral-300">{gk.risk_level || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">EVA</span>
                    <span className={`font-mono ${eva.approved ? 'text-emerald-400' : 'text-red-400'}`}>
                      {eva.recommendation || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">Anomaly</span>
                    <span className={`font-mono ${anomaly.is_anomaly ? 'text-red-400' : 'text-emerald-400'}`}>
                      {anomaly.severity || 'N/A'}
                    </span>
                  </div>
                </div>
                {/* ZK Proof */}
                {currentSignal.zk_proof && (
                  <div className="border-t border-white/5 pt-3">
                    <div className="flex items-center gap-1 text-[10px] text-neutral-500 mb-1">
                      <ShieldCheck size={12} className="text-[#00D4FF]" />
                      ZK PROOF
                    </div>
                    <div className="font-mono text-[10px] text-neutral-400 break-all">
                      {currentSignal.zk_proof.proof_hash?.slice(0, 32)}...
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono">VERIFIED</span>
                  </div>
                )}
                <button
                  onClick={handleExecute}
                  disabled={loading.exec || gk.decision === 'BLOCK'}
                  data-testid="execute-signal-button"
                  className="w-full mt-2 flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-30"
                >
                  <Wallet size={14} weight="bold" />
                  {loading.exec ? 'Signing...' : 'Execute via Wallet'}
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 text-sm">Select a model and generate a signal</div>
            )}
          </div>

          {/* Gatekeeper Factors */}
          <div className="md:col-span-4 bg-[#0F0F0F] border border-white/10 p-4" data-testid="gatekeeper-panel">
            <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Gatekeeper Analysis</span>
            {gk.factors ? (
              <div className="mt-4 space-y-3">
                {Object.entries(gk.factors).map(([key, val]) => (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-neutral-400 capitalize">{key}</span>
                      <span className="font-mono text-white">{(val * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 overflow-hidden">
                      <div className="h-full transition-all duration-500" style={{ width: `${val * 100}%`, backgroundColor: val > 0.6 ? '#10B981' : val > 0.3 ? '#FACC15' : '#EF4444' }} />
                    </div>
                  </div>
                ))}
                <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                  <span className="text-xs text-neutral-400">Composite Score</span>
                  <span className="font-mono text-lg text-white">{(gk.composite_score * 100).toFixed(1)}%</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 text-sm">Generate a signal to see gatekeeper analysis</div>
            )}

            {/* EVA Rules */}
            {eva.rules_passed && (
              <div className="mt-4 border-t border-white/5 pt-3">
                <span className="text-[10px] text-neutral-500 uppercase">EVA Rules</span>
                <div className="mt-2 space-y-1">
                  {eva.rules_passed?.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <CheckCircle size={12} /> {r}
                    </div>
                  ))}
                  {eva.rules_failed?.map((r, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-red-400">
                      <XCircle size={12} /> {r}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Indicators */}
          <div className="md:col-span-4 bg-[#0F0F0F] border border-white/10 p-4" data-testid="indicators-panel">
            <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Technical Indicators</span>
            {indicators ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-neutral-500">PRICE</span>
                    <div className="font-mono text-lg text-white">${indicators.current_price?.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500">RSI (14)</span>
                    <div className={`font-mono text-lg ${indicators.rsi > 70 ? 'text-red-400' : indicators.rsi < 30 ? 'text-emerald-400' : 'text-white'}`}>
                      {indicators.rsi?.toFixed(1)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-neutral-500">MACD</span>
                    <div className={`font-mono text-sm ${indicators.macd?.histogram >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {indicators.macd?.macd?.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500">MACD HIST</span>
                    <div className={`font-mono text-sm ${indicators.macd?.histogram >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {indicators.macd?.histogram?.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-neutral-500">EMA 20</span>
                    <div className="font-mono text-sm text-neutral-300">${indicators.ema_20?.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500">EMA 50</span>
                    <div className="font-mono text-sm text-neutral-300">${indicators.ema_50?.toLocaleString()}</div>
                  </div>
                </div>
                <div className="border-t border-white/5 pt-3">
                  <span className="text-[10px] text-neutral-500">BOLLINGER BANDS</span>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div>
                      <span className="text-[10px] text-neutral-600">Upper</span>
                      <div className="font-mono text-xs text-red-400">${indicators.bollinger?.upper?.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-600">Middle</span>
                      <div className="font-mono text-xs text-neutral-300">${indicators.bollinger?.middle?.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-600">Lower</span>
                      <div className="font-mono text-xs text-emerald-400">${indicators.bollinger?.lower?.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-500 text-sm">Loading indicators...</div>
            )}
          </div>
        </div>

        {/* Tabs: Allocation, Signals, Backtest, History */}
        <Tabs defaultValue="allocation" className="w-full">
          <TabsList className="bg-[#0F0F0F] border border-white/10 p-1 h-auto" data-testid="dashboard-tabs">
            <TabsTrigger value="allocation" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-neutral-400">Fund Allocation</TabsTrigger>
            <TabsTrigger value="signals" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-neutral-400">Signal Feed</TabsTrigger>
            <TabsTrigger value="backtest" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-neutral-400">Backtester</TabsTrigger>
            <TabsTrigger value="history" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-neutral-400">History</TabsTrigger>
          </TabsList>

          {/* Fund Allocation */}
          <TabsContent value="allocation">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4" data-testid="allocation-panel">
              <div className="md:col-span-4 bg-[#0F0F0F] border border-white/10 p-4">
                <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Fund Summary</span>
                <div className="mt-4 space-y-4">
                  <div>
                    <span className="text-xs text-neutral-500">Total Funds (Demo)</span>
                    <div className="font-mono text-2xl text-white">{wallet?.balance?.toFixed(3) || '10.000'} ETH</div>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500">Allocated</span>
                    <div className="font-mono text-xl text-[#00D4FF]">{allocations.total_allocated?.toFixed(3)} ETH</div>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500">Available</span>
                    <div className="font-mono text-xl text-emerald-400">{((wallet?.balance || 10) - (allocations.total_allocated || 0)).toFixed(3)} ETH</div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-4 bg-[#0F0F0F] border border-white/10 p-4">
                <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Allocate Funds</span>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs text-neutral-500">Model</label>
                    <div className="font-mono text-sm text-white mt-1">{selectedModelData?.name || 'Select a model'}</div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500">Amount (ETH)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={allocAmount}
                      onChange={e => setAllocAmount(e.target.value)}
                      placeholder="0.00"
                      data-testid="allocation-amount-input"
                      className="w-full mt-1 px-3 py-2 bg-[#050505] border border-white/10 text-white font-mono text-sm focus:border-[#00D4FF] focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleAllocate}
                    disabled={loading.alloc || !allocAmount}
                    data-testid="allocate-button"
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#00D4FF] text-black text-xs font-semibold hover:bg-[#00B4D8] transition-colors disabled:opacity-50"
                  >
                    <Wallet size={14} weight="bold" />
                    {loading.alloc ? 'Confirming...' : 'Allocate via Wallet'}
                  </button>
                </div>
              </div>
              <div className="md:col-span-4 bg-[#0F0F0F] border border-white/10 p-4">
                <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Recent Allocations</span>
                <div className="mt-3 space-y-2 max-h-[200px] overflow-y-auto">
                  {allocations.allocations?.length ? allocations.allocations.map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 text-xs">
                      <span className="text-neutral-400">{a.model_name || a.model_id}</span>
                      <span className="font-mono text-white">{a.amount} ETH</span>
                    </div>
                  )) : (
                    <div className="text-neutral-500 text-sm py-4 text-center">No allocations yet</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Signal Feed */}
          <TabsContent value="signals">
            <div className="bg-[#0F0F0F] border border-white/10 p-4" data-testid="signal-feed">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Signal Feed (Gatekeeper Filtered)</span>
                <span className="text-xs text-neutral-500">{signals.length} signals</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-left">
                      <th className="py-2 text-neutral-500 font-mono">Model</th>
                      <th className="py-2 text-neutral-500 font-mono">Signal</th>
                      <th className="py-2 text-neutral-500 font-mono text-right">Confidence</th>
                      <th className="py-2 text-neutral-500 font-mono text-right">Return</th>
                      <th className="py-2 text-neutral-500 font-mono">Gatekeeper</th>
                      <th className="py-2 text-neutral-500 font-mono text-right">Risk</th>
                      <th className="py-2 text-neutral-500 font-mono">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.map((s, i) => {
                      const p = s.prediction || {};
                      const g = s.gatekeeper || {};
                      return (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-2 font-mono text-neutral-300">{s.model_name || p.model_name || '-'}</td>
                          <td className="py-2"><SignalBadge signal={p.signal} /></td>
                          <td className="py-2 font-mono text-right text-white">{(p.confidence * 100).toFixed(1)}%</td>
                          <td className={`py-2 font-mono text-right ${p.expected_return >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {p.expected_return >= 0 ? '+' : ''}{p.expected_return?.toFixed(2)}%
                          </td>
                          <td className="py-2"><DecisionBadge decision={g.decision} /></td>
                          <td className="py-2 font-mono text-right text-neutral-400">{g.risk_level || '-'}</td>
                          <td className="py-2 font-mono text-neutral-500">{s.timestamp ? new Date(s.timestamp).toLocaleTimeString() : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!signals.length && <div className="text-center py-8 text-neutral-500 text-sm">No signals yet. Generate one above.</div>}
              </div>
            </div>
          </TabsContent>

          {/* Backtester */}
          <TabsContent value="backtest">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4" data-testid="backtest-panel">
              <div className="md:col-span-3 bg-[#0F0F0F] border border-white/10 p-4">
                <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Configure Backtest</span>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs text-neutral-500">Model</label>
                    <div className="font-mono text-sm text-white mt-1">{selectedModelData?.name || '-'}</div>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500">Timeframe (days)</label>
                    <Select value={String(btDays)} onValueChange={v => setBtDays(Number(v))}>
                      <SelectTrigger className="w-full bg-[#050505] border-white/10 text-white text-xs mt-1" data-testid="backtest-days-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0F0F0F] border-white/10">
                        {[7, 14, 30, 60, 90].map(d => (
                          <SelectItem key={d} value={String(d)} className="text-white text-xs">{d} days</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <button
                    onClick={handleBacktest}
                    disabled={loading.bt || !selectedModel}
                    data-testid="run-backtest-button"
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors disabled:opacity-50"
                  >
                    <ChartLine size={14} weight="bold" />
                    {loading.bt ? 'Running...' : 'Run Backtest'}
                  </button>
                </div>
              </div>
              <div className="md:col-span-9 bg-[#0F0F0F] border border-white/10 p-4">
                {backtestResult ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase">Total Return</span>
                        <div className={`font-mono text-xl ${backtestResult.total_return_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {backtestResult.total_return_pct >= 0 ? '+' : ''}{backtestResult.total_return_pct}%
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase">Sharpe Ratio</span>
                        <div className="font-mono text-xl text-white">{backtestResult.sharpe_ratio}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase">Max Drawdown</span>
                        <div className="font-mono text-xl text-red-400">-{backtestResult.max_drawdown_pct}%</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500 uppercase">Win Rate</span>
                        <div className="font-mono text-xl text-white">{backtestResult.win_rate_pct}%</div>
                      </div>
                    </div>
                    {backtestResult.equity_curve?.length > 0 && (
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={backtestResult.equity_curve.map((v, i) => ({ idx: i, value: v }))}>
                            <defs>
                              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="idx" hide />
                            <YAxis hide domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ backgroundColor: '#0F0F0F', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                            <Area type="monotone" dataKey="value" stroke="#00D4FF" fill="url(#eqGrad)" strokeWidth={1.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-neutral-500 font-mono">
                      <span>Trades: {backtestResult.total_trades}</span>
                      <span>Won: {backtestResult.winning_trades}</span>
                      <span>Lost: {backtestResult.losing_trades}</span>
                      <span>Final: ${backtestResult.final_capital?.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-neutral-500 text-sm">Configure and run a backtest to see results</div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            <div className="bg-[#0F0F0F] border border-white/10 p-4" data-testid="history-panel">
              <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Your History</span>
              <div className="mt-3 space-y-2 max-h-[400px] overflow-y-auto">
                {history.length ? history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase border-white/10 text-neutral-400">{h.type}</Badge>
                      <span className="text-neutral-300 font-mono">{h.model_name || h.model_id || h.action || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {h.amount && <span className="font-mono text-white">{h.amount} ETH</span>}
                      <span className="font-mono text-neutral-500">{h.timestamp ? new Date(h.timestamp).toLocaleString() : ''}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-neutral-500 text-sm">
                    {walletAddr ? 'No history yet' : 'Connect wallet to see history'}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
