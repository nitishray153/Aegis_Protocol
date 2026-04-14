import { useState, useEffect, useRef } from 'react';
import { registerReferral, fetchReferral, createStake, unstake, fetchStakes, fetchTokenBalance, fetchTokenHistory, fetchDeployedContracts, trackContractDeployment } from '../lib/api';
import { signTransaction, getWalletAddress } from '../lib/wallet';
import { CONTRACTS, saveContractAddress, getAllContractAddresses } from '../lib/contracts';
import { ethers } from 'ethers';
import { Coins, Users, Trophy, Wallet, Copy, CheckCircle, ArrowUp, ArrowDown, ShieldCheck, Cube } from '@phosphor-icons/react';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

const TIER_COLORS = {
  bronze: 'text-amber-600',
  silver: 'text-neutral-300',
  gold: 'text-yellow-400',
  platinum: 'text-blue-300',
  diamond: 'text-cyan-300',
};

export default function StakingReferral({ wallet }) {
  const [referral, setReferral] = useState(null);
  const [stakes, setStakes] = useState({ stakes: [], total_staked: 0, total_rewards: 0 });
  const [tokens, setTokens] = useState({ balance: 0, tier: 'bronze', voting_power: 0 });
  const [tokenHistory, setTokenHistory] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [stakeAmount, setStakeAmount] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [loading, setLoading] = useState({});
  const [copied, setCopied] = useState(false);

  const walletAddr = wallet?.address || getWalletAddress();

  useEffect(() => {
    if (walletAddr) {
      fetchReferral(walletAddr).then(r => setReferral(r.data)).catch(() => {});
      fetchStakes(walletAddr).then(r => setStakes(r.data)).catch(() => {});
      fetchTokenBalance(walletAddr).then(r => setTokens(r.data)).catch(() => {});
      fetchTokenHistory(walletAddr).then(r => setTokenHistory(r.data.transactions || [])).catch(() => {});
    }
    fetchDeployedContracts().then(r => setContracts(r.data.contracts || [])).catch(() => {});
  }, [walletAddr]);

  const handleRegister = async () => {
    if (!walletAddr) return toast.error('Connect wallet first');
    setLoading(l => ({ ...l, register: true }));
    try {
      const res = await registerReferral({ wallet_address: walletAddr, referral_code: referralInput });
      setReferral(res.data);
      toast.success('Registered! Your referral code is ready.');
      fetchTokenBalance(walletAddr).then(r => setTokens(r.data)).catch(() => {});
    } catch (e) {
      toast.error('Registration failed');
    }
    setLoading(l => ({ ...l, register: false }));
  };

  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) < 0.01) return toast.error('Min stake: 0.01 ETH');
    if (!walletAddr) return toast.error('Connect wallet');
    setLoading(l => ({ ...l, stake: true }));
    try {
      const txResult = await signTransaction('STAKE', { amount: parseFloat(stakeAmount) });
      await createStake({ wallet_address: walletAddr, amount: parseFloat(stakeAmount), tx_hash: txResult.tx_hash });
      toast.success('Staked successfully! Tokens earned.');
      setStakeAmount('');
      fetchStakes(walletAddr).then(r => setStakes(r.data)).catch(() => {});
      fetchTokenBalance(walletAddr).then(r => setTokens(r.data)).catch(() => {});
      fetchTokenHistory(walletAddr).then(r => setTokenHistory(r.data.transactions || [])).catch(() => {});
    } catch (e) {
      toast.error('Staking failed');
    }
    setLoading(l => ({ ...l, stake: false }));
  };

  const handleUnstake = async (stakeId) => {
    if (!walletAddr) return;
    setLoading(l => ({ ...l, [`unstake_${stakeId}`]: true }));
    try {
      const txResult = await signTransaction('UNSTAKE', { stake_id: stakeId });
      await unstake({ wallet_address: walletAddr, stake_id: stakeId, tx_hash: txResult.tx_hash });
      toast.success('Unstaked! Rewards claimed.');
      fetchStakes(walletAddr).then(r => setStakes(r.data)).catch(() => {});
      fetchTokenBalance(walletAddr).then(r => setTokens(r.data)).catch(() => {});
    } catch (e) {
      toast.error('Unstake failed');
    }
    setLoading(l => ({ ...l, [`unstake_${stakeId}`]: false }));
  };

  const copyCode = () => {
    if (referral?.referral_code) {
      navigator.clipboard.writeText(referral.referral_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const contractAddresses = getAllContractAddresses();

  return (
    <div className="min-h-screen bg-[#050505] p-4 sm:p-6" data-testid="staking-referral-page">
      <div className="max-w-[1440px] mx-auto">
        <div className="mb-6">
          <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Governance & Rewards</span>
          <h1 className="font-heading text-2xl sm:text-3xl text-white mt-1">Staking & Referrals</h1>
          <p className="text-sm text-neutral-400 mt-2">Stake ETH to earn governance tokens. Refer traders to grow the ecosystem.</p>
        </div>

        {/* Token Balance Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#0F0F0F] border border-white/10 p-4" data-testid="token-balance-card">
            <Coins size={20} className="text-[#FACC15] mb-2" />
            <div className="font-mono text-2xl text-white">{tokens.balance?.toFixed(0) || 0}</div>
            <div className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">AEGIS Tokens</div>
          </div>
          <div className="bg-[#0F0F0F] border border-white/10 p-4" data-testid="tier-card">
            <Trophy size={20} className={TIER_COLORS[tokens.tier] || 'text-neutral-400'} weight="duotone" />
            <div className={`font-mono text-2xl uppercase ${TIER_COLORS[tokens.tier]}`}>{tokens.tier}</div>
            <div className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Tier</div>
          </div>
          <div className="bg-[#0F0F0F] border border-white/10 p-4" data-testid="voting-power-card">
            <ShieldCheck size={20} className="text-[#00D4FF] mb-2" />
            <div className="font-mono text-2xl text-white">{tokens.voting_power?.toFixed(0) || 0}</div>
            <div className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Voting Power</div>
          </div>
          <div className="bg-[#0F0F0F] border border-white/10 p-4" data-testid="total-staked-card">
            <Wallet size={20} className="text-emerald-400 mb-2" />
            <div className="font-mono text-2xl text-white">{stakes.total_staked?.toFixed(3)} ETH</div>
            <div className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Total Staked</div>
          </div>
        </div>

        <Tabs defaultValue="staking" className="w-full">
          <TabsList className="bg-[#0F0F0F] border border-white/10 p-1 h-auto" data-testid="staking-tabs">
            <TabsTrigger value="staking" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-neutral-400">Staking</TabsTrigger>
            <TabsTrigger value="referrals" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-neutral-400">Referrals</TabsTrigger>
            <TabsTrigger value="contracts" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-neutral-400">Smart Contracts</TabsTrigger>
            <TabsTrigger value="history" className="text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white text-neutral-400">Token History</TabsTrigger>
          </TabsList>

          {/* Staking */}
          <TabsContent value="staking">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4" data-testid="staking-section">
              <div className="md:col-span-4 bg-[#0F0F0F] border border-white/10 p-4">
                <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Stake ETH</span>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs text-neutral-500">Amount (ETH)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={stakeAmount}
                      onChange={e => setStakeAmount(e.target.value)}
                      placeholder="0.00"
                      data-testid="stake-amount-input"
                      className="w-full mt-1 px-3 py-2 bg-[#050505] border border-white/10 text-white font-mono text-sm focus:border-[#00D4FF] focus:outline-none"
                    />
                  </div>
                  <div className="text-xs text-neutral-500">
                    APY: <span className="text-emerald-400 font-mono">12%</span> | Min: <span className="font-mono">0.01 ETH</span>
                  </div>
                  <div className="text-xs text-neutral-500">
                    Token reward: <span className="text-[#FACC15] font-mono">{stakeAmount ? (parseFloat(stakeAmount) * 100).toFixed(0) : '0'} AEGIS</span>
                  </div>
                  <button
                    onClick={handleStake}
                    disabled={loading.stake || !walletAddr}
                    data-testid="stake-button"
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#00D4FF] text-black text-xs font-semibold hover:bg-[#00B4D8] transition-colors disabled:opacity-50"
                  >
                    <Wallet size={14} weight="bold" />
                    {loading.stake ? 'Signing...' : 'Stake via Wallet'}
                  </button>
                </div>
              </div>
              <div className="md:col-span-8 bg-[#0F0F0F] border border-white/10 p-4">
                <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Your Stakes</span>
                <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
                  {stakes.stakes?.length ? stakes.stakes.map((s, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 border border-white/5 bg-[#050505] text-xs">
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-sm ${s.status === 'active' ? 'text-emerald-400' : 'text-neutral-500'}`}>
                          {s.amount} ETH
                        </span>
                        <Badge variant="outline" className={`text-[10px] ${s.status === 'active' ? 'border-emerald-500/20 text-emerald-400' : 'border-white/10 text-neutral-500'}`}>
                          {s.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-neutral-500">{s.staked_at ? new Date(s.staked_at).toLocaleDateString() : ''}</span>
                        {s.status === 'active' && (
                          <button
                            onClick={() => handleUnstake(s.id)}
                            disabled={loading[`unstake_${s.id}`]}
                            data-testid={`unstake-btn-${s.id}`}
                            className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] border border-red-500/20 hover:bg-red-500/20"
                          >
                            {loading[`unstake_${s.id}`] ? '...' : 'Unstake'}
                          </button>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-neutral-500 text-sm">No stakes yet</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Referrals */}
          <TabsContent value="referrals">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4" data-testid="referral-section">
              <div className="md:col-span-5 bg-[#0F0F0F] border border-white/10 p-4">
                <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Your Referral</span>
                {referral?.referral_code ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs text-neutral-500">Your Code</label>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 px-3 py-2 bg-[#050505] border border-white/10 font-mono text-lg text-[#00D4FF] tracking-widest">
                          {referral.referral_code}
                        </div>
                        <button onClick={copyCode} data-testid="copy-referral-code" className="p-2 bg-white/5 border border-white/10 hover:bg-white/10">
                          {copied ? <CheckCircle size={16} className="text-emerald-400" /> : <Copy size={16} className="text-neutral-400" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-neutral-500">Referrals</span>
                        <div className="font-mono text-xl text-white">{referral.referral_count || 0}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-500">Tokens Earned</span>
                        <div className="font-mono text-xl text-[#FACC15]">{referral.total_tokens_earned || 0}</div>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500">
                      Share your code to earn <span className="text-[#FACC15] font-mono">50 AEGIS</span> per referral
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-xs text-neutral-500">Referred by someone? Enter their code:</label>
                      <input
                        type="text"
                        value={referralInput}
                        onChange={e => setReferralInput(e.target.value.toUpperCase())}
                        placeholder="ABCD1234"
                        data-testid="referral-code-input"
                        className="w-full mt-1 px-3 py-2 bg-[#050505] border border-white/10 text-white font-mono text-sm focus:border-[#00D4FF] focus:outline-none uppercase"
                        maxLength={8}
                      />
                    </div>
                    <button
                      onClick={handleRegister}
                      disabled={loading.register || !walletAddr}
                      data-testid="register-referral-button"
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#00D4FF] text-black text-xs font-semibold hover:bg-[#00B4D8] transition-colors disabled:opacity-50"
                    >
                      <Users size={14} weight="bold" />
                      {loading.register ? 'Registering...' : 'Register & Get Referral Code'}
                    </button>
                  </div>
                )}
              </div>
              <div className="md:col-span-7 bg-[#0F0F0F] border border-white/10 p-4">
                <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Tier System</span>
                <div className="mt-4 space-y-2">
                  {[
                    { name: 'Bronze', tokens: 0, mult: '1x', color: 'text-amber-600' },
                    { name: 'Silver', tokens: 100, mult: '1.2x', color: 'text-neutral-300' },
                    { name: 'Gold', tokens: 500, mult: '1.5x', color: 'text-yellow-400' },
                    { name: 'Platinum', tokens: 2000, mult: '2x', color: 'text-blue-300' },
                    { name: 'Diamond', tokens: 10000, mult: '3x', color: 'text-cyan-300' },
                  ].map((tier, i) => (
                    <div key={i} className={`flex items-center justify-between py-2 px-3 border text-xs ${tokens.tier === tier.name.toLowerCase() ? 'border-[#00D4FF]/30 bg-[#00D4FF]/5' : 'border-white/5'}`}>
                      <div className="flex items-center gap-2">
                        <Trophy size={14} className={tier.color} weight="duotone" />
                        <span className={`font-medium ${tier.color}`}>{tier.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-neutral-400">{tier.tokens}+ tokens</span>
                        <span className="font-mono text-white">{tier.mult} voting</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Smart Contracts */}
          <TabsContent value="contracts">
            <div className="bg-[#0F0F0F] border border-white/10 p-4" data-testid="contracts-section">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Deployed Contracts (Sepolia)</span>
                <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer" className="text-xs text-[#00D4FF] hover:underline">Sepolia Explorer</a>
              </div>

              <div className="space-y-3">
                {['ModelRegistry', 'VotingContract', 'VerificationStorage'].map((name) => {
                  const addr = contractAddresses[name];
                  const deployed = contracts.find(c => c.contract_name === name);
                  return (
                    <div key={name} className="flex items-center justify-between py-3 px-4 border border-white/5 bg-[#050505]" data-testid={`contract-${name.toLowerCase()}`}>
                      <div className="flex items-center gap-3">
                        <Cube size={18} className={deployed || addr ? 'text-emerald-400' : 'text-neutral-500'} />
                        <div>
                          <div className="text-sm text-white font-medium">{name}</div>
                          {(deployed || addr) ? (
                            <div className="font-mono text-[10px] text-neutral-400">{(deployed?.address || addr)?.slice(0, 20)}...</div>
                          ) : (
                            <div className="text-[10px] text-neutral-500">Not deployed yet</div>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${deployed || addr ? 'border-emerald-500/20 text-emerald-400' : 'border-white/10 text-neutral-500'}`}>
                        {deployed || addr ? 'Deployed' : 'Pending'}
                      </Badge>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-3 bg-yellow-500/5 border border-yellow-500/20 text-xs text-yellow-300">
                <strong>Note:</strong> To deploy contracts, connect MetaMask with Sepolia ETH. Contract source code is in <code className="font-mono bg-white/5 px-1">/app/contracts/</code>.
                Use Hardhat or Remix to compile and deploy. Track deployments here after.
              </div>
            </div>
          </TabsContent>

          {/* Token History */}
          <TabsContent value="history">
            <div className="bg-[#0F0F0F] border border-white/10 p-4" data-testid="token-history-section">
              <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Token Transaction History</span>
              <div className="mt-3 space-y-2 max-h-[400px] overflow-y-auto">
                {tokenHistory.length ? tokenHistory.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 text-xs">
                    <div className="flex items-center gap-2">
                      {tx.amount > 0 ? <ArrowDown size={14} className="text-emerald-400" /> : <ArrowUp size={14} className="text-red-400" />}
                      <span className="text-neutral-300">{tx.description || tx.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#FACC15]">+{tx.amount?.toFixed(0)} AEGIS</span>
                      <span className="font-mono text-neutral-500">{tx.timestamp ? new Date(tx.timestamp).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-neutral-500 text-sm">
                    {walletAddr ? 'No token transactions yet' : 'Connect wallet to see history'}
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
