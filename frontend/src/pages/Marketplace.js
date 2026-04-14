import { useState, useEffect } from 'react';
import { fetchModels } from '../lib/api';
import { Badge } from '../components/ui/badge';
import { MagnifyingGlass, SortAscending, Star, Lightning, Brain, CheckCircle, Clock, ArrowRight } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function Marketplace() {
  const [models, setModels] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('trust');

  useEffect(() => {
    fetchModels().then(r => setModels(r.data.models || [])).catch(() => {});
  }, []);

  const filtered = models
    .filter(m => {
      if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.model_type.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === 'active' && m.status !== 'active') return false;
      if (filter === 'pending' && m.status !== 'pending_votes') return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === 'trust') return (b.trust_score || 0) - (a.trust_score || 0);
      if (sort === 'signals') return (b.total_signals || 0) - (a.total_signals || 0);
      if (sort === 'votes') return (b.total_votes || 0) - (a.total_votes || 0);
      return 0;
    });

  const statusColors = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending_votes: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    rejected: 'bg-red-500/10 text-red-400 border-red-500/20'
  };

  const typeIcons = { LSTM: Brain, GRU: Lightning, Ensemble: Star };

  return (
    <div className="min-h-screen bg-[#050505] p-4 sm:p-6" data-testid="marketplace-page">
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Model Marketplace</span>
          <h1 className="font-heading text-2xl sm:text-3xl text-white mt-1">Browse AI Models</h1>
          <p className="text-sm text-neutral-400 mt-2 max-w-lg">Explore community-developed trading models. All models are approved through DAO governance.</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlass size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search models..."
              data-testid="marketplace-search"
              className="w-full pl-8 pr-3 py-2 bg-[#0F0F0F] border border-white/10 text-white text-xs placeholder-neutral-500 focus:border-[#00D4FF] focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'pending'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                data-testid={`filter-${f}`}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? 'bg-white/10 text-white border border-white/20' : 'text-neutral-500 border border-white/5 hover:text-white'}`}
              >
                {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Pending'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[{ k: 'trust', l: 'Trust' }, { k: 'signals', l: 'Signals' }, { k: 'votes', l: 'Votes' }].map(s => (
              <button
                key={s.k}
                onClick={() => setSort(s.k)}
                data-testid={`sort-${s.k}`}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${sort === s.k ? 'text-[#00D4FF]' : 'text-neutral-500 hover:text-white'}`}
              >
                <SortAscending size={12} />
                {s.l}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((model, i) => {
            const TypeIcon = typeIcons[model.model_type] || Brain;
            return (
              <motion.div
                key={model.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-[#0F0F0F] border border-white/10 hover:border-white/20 p-5 transition-all duration-150 hover:-translate-y-[2px]"
                data-testid={`model-card-${model.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TypeIcon size={20} weight="duotone" className="text-[#00D4FF]" />
                    <div>
                      <h3 className="font-heading text-base text-white">{model.name}</h3>
                      <span className="text-[10px] font-mono text-neutral-500 uppercase">{model.model_type}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] ${statusColors[model.status] || ''}`}>
                    {model.status === 'pending_votes' ? 'Pending' : model.status}
                  </Badge>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed mb-4 line-clamp-2">{model.strategy}</p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 border-t border-white/5 pt-3 mb-3">
                  <div>
                    <span className="text-[10px] text-neutral-500">Trust</span>
                    <div className="font-mono text-sm text-white">{model.trust_score || 0}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500">Accuracy</span>
                    <div className="font-mono text-sm text-emerald-400">{model.accuracy || 0}%</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500">Signals</span>
                    <div className="font-mono text-sm text-neutral-300">{model.total_signals || 0}</div>
                  </div>
                </div>

                {/* Votes */}
                <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <CheckCircle size={12} /> {model.approve_votes || 0}
                    </span>
                    <span className="flex items-center gap-1 text-red-400">
                      <Clock size={12} /> {model.reject_votes || 0}
                    </span>
                  </div>
                  <Link
                    to={`/dashboard`}
                    className="flex items-center gap-1 text-[#00D4FF] text-xs hover:underline"
                    data-testid={`select-model-${model.id}`}
                  >
                    Select <ArrowRight size={12} />
                  </Link>
                </div>

                {/* IPFS */}
                {model.ipfs_cid && (
                  <div className="mt-3 border-t border-white/5 pt-2">
                    <span className="text-[10px] text-neutral-500">IPFS CID</span>
                    <div className="font-mono text-[10px] text-neutral-400 truncate">{model.ipfs_cid}</div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {!filtered.length && (
          <div className="text-center py-16 text-neutral-500">
            <Brain size={40} className="mx-auto mb-3 text-neutral-600" />
            <p className="text-sm">No models found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}
