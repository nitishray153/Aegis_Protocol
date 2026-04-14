import { useState, useEffect } from 'react';
import { fetchProposals, castVote, fetchVotes } from '../lib/api';
import { signTransaction } from '../lib/wallet';
import { Scales, Wallet, CheckCircle, XCircle, Minus, ArrowRight } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Slider } from '../components/ui/slider';

export default function DAOPanel({ wallet }) {
  const [proposals, setProposals] = useState([]);
  const [votes, setVotes] = useState([]);
  const [voteAmounts, setVoteAmounts] = useState({});
  const [loading, setLoading] = useState({});

  useEffect(() => {
    fetchProposals().then(r => setProposals(r.data.proposals || [])).catch(() => {});
    fetchVotes().then(r => setVotes(r.data.votes || [])).catch(() => {});
  }, []);

  const handleVote = async (modelId, voteType) => {
    if (!wallet) return toast.error('Connect wallet to vote');
    const count = voteAmounts[modelId] || 1;
    const cost = count * count;

    setLoading(l => ({ ...l, [modelId]: true }));
    try {
      // Sign vote with wallet
      const txResult = await signTransaction('DAO_VOTE', {
        model_id: modelId,
        vote_type: voteType,
        vote_count: count,
        cost: cost
      });

      await castVote({
        model_id: modelId,
        voter_wallet: wallet.address,
        vote_count: count,
        vote_type: voteType,
        tx_hash: txResult.tx_hash
      });

      toast.success(`Vote ${voteType}d! Cost: ${cost} tokens`);
      
      // Refresh
      fetchProposals().then(r => setProposals(r.data.proposals || [])).catch(() => {});
      fetchVotes().then(r => setVotes(r.data.votes || [])).catch(() => {});
    } catch (e) {
      toast.error('Vote failed or rejected');
    }
    setLoading(l => ({ ...l, [modelId]: false }));
  };

  return (
    <div className="min-h-screen bg-[#050505] p-4 sm:p-6" data-testid="dao-page">
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">DAO Governance</span>
          <h1 className="font-heading text-2xl sm:text-3xl text-white mt-1">Model Governance</h1>
          <p className="text-sm text-neutral-400 mt-2">Quadratic voting: cost = votes squared. All votes require wallet signature. No admin override.</p>
        </div>

        {/* Info banner */}
        <div className="p-4 bg-[#0F0F0F] border border-[#00D4FF]/20 mb-6 flex items-start gap-3" data-testid="dao-info-banner">
          <Scales size={20} className="text-[#00D4FF] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-neutral-300">
            <strong className="text-white">Quadratic Voting:</strong> 1 vote = 1 token, 2 votes = 4 tokens, 3 votes = 9 tokens.
            Models need 10+ net approve votes to become active. All votes are signed via your wallet.
          </div>
        </div>

        {/* Proposals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proposals.map((p) => {
            const netVotes = (p.approve_votes || 0) - (p.reject_votes || 0);
            const progress = Math.min(Math.max(netVotes / 10, -1), 1);
            const voteCount = voteAmounts[p.model_id] || 1;
            const cost = voteCount * voteCount;

            return (
              <div key={p.model_id} className="bg-[#0F0F0F] border border-white/10 p-5" data-testid={`proposal-${p.model_id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-heading text-base text-white">{p.name}</h3>
                    <span className="font-mono text-[10px] text-neutral-500">{p.model_id}</span>
                  </div>
                  <span className={`text-xs font-mono px-2 py-0.5 ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                    {p.status === 'pending_votes' ? 'Voting' : p.status}
                  </span>
                </div>

                {/* Vote progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-emerald-400 font-mono">+{p.approve_votes || 0}</span>
                    <span className="text-neutral-500">Net: {netVotes}</span>
                    <span className="text-red-400 font-mono">-{p.reject_votes || 0}</span>
                  </div>
                  <div className="h-2 bg-white/5 flex overflow-hidden">
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{ width: `${Math.max(((p.approve_votes || 0) / Math.max(p.total_votes || 1, 1)) * 100, 0)}%` }}
                    />
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${Math.max(((p.reject_votes || 0) / Math.max(p.total_votes || 1, 1)) * 100, 0)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1 font-mono">
                    {netVotes >= 10 ? 'THRESHOLD MET' : `${10 - netVotes} more votes needed`}
                  </div>
                </div>

                {/* Vote slider */}
                <div className="space-y-3 border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-500">Votes: <span className="text-white font-mono">{voteCount}</span></span>
                    <span className="text-xs text-neutral-500">Cost: <span className="text-[#FACC15] font-mono">{cost} tokens</span></span>
                  </div>
                  <Slider
                    value={[voteCount]}
                    onValueChange={([v]) => setVoteAmounts(a => ({ ...a, [p.model_id]: v }))}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                    data-testid={`vote-slider-${p.model_id}`}
                  />
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVote(p.model_id, 'approve')}
                      disabled={loading[p.model_id] || !wallet}
                      data-testid={`approve-btn-${p.model_id}`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-30"
                    >
                      <CheckCircle size={14} weight="bold" />
                      {loading[p.model_id] ? 'Signing...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleVote(p.model_id, 'reject')}
                      disabled={loading[p.model_id] || !wallet}
                      data-testid={`reject-btn-${p.model_id}`}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-30"
                    >
                      <XCircle size={14} weight="bold" />
                      Reject
                    </button>
                  </div>

                  {!wallet && (
                    <div className="flex items-center gap-1 text-[10px] text-yellow-400">
                      <Wallet size={12} /> Connect wallet to vote
                    </div>
                  )}
                </div>

                {/* Wallet */}
                <div className="mt-3 border-t border-white/5 pt-2">
                  <span className="text-[10px] text-neutral-600 font-mono">Developer: {p.developer_wallet?.slice(0, 10)}...</span>
                </div>
              </div>
            );
          })}
        </div>

        {!proposals.length && (
          <div className="text-center py-16 text-neutral-500">
            <Scales size={40} className="mx-auto mb-3 text-neutral-600" />
            <p className="text-sm">No proposals at the moment</p>
          </div>
        )}

        {/* Recent Votes */}
        <div className="mt-8">
          <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Recent Votes</span>
          <div className="mt-3 bg-[#0F0F0F] border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full text-xs" data-testid="votes-table">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="p-3 text-neutral-500 font-mono">Voter</th>
                    <th className="p-3 text-neutral-500 font-mono">Model</th>
                    <th className="p-3 text-neutral-500 font-mono">Type</th>
                    <th className="p-3 text-neutral-500 font-mono text-right">Votes</th>
                    <th className="p-3 text-neutral-500 font-mono text-right">Cost</th>
                    <th className="p-3 text-neutral-500 font-mono">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {votes.slice(0, 15).map((v, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 font-mono text-neutral-400">{v.voter_wallet?.slice(0, 10)}...</td>
                      <td className="p-3 font-mono text-neutral-300">{v.model_id}</td>
                      <td className="p-3">
                        <span className={`font-mono ${v.vote_type === 'approve' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {v.vote_type?.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-right text-white">{v.vote_count}</td>
                      <td className="p-3 font-mono text-right text-[#FACC15]">{v.cost}</td>
                      <td className="p-3 font-mono text-neutral-500">{v.timestamp ? new Date(v.timestamp).toLocaleString() : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!votes.length && <div className="p-6 text-center text-neutral-500 text-sm">No votes cast yet</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
