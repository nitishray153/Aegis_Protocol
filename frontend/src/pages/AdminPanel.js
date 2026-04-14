import { useState, useEffect } from 'react';
import { fetchAdminStats, fetchGatekeeperStats } from '../lib/api';
import { GearSix, ChartLine, ShieldCheck, Lightning, Scales, Database, Eye } from '@phosphor-icons/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [gkStats, setGkStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const [s, g] = await Promise.all([fetchAdminStats(), fetchGatekeeperStats()]);
      setStats(s.data);
      setGkStats(g.data);
    } catch (e) {
      console.error(e);
    }
    setRefreshing(false);
  };

  useEffect(() => { loadData(); }, []);

  const gkPieData = gkStats ? [
    { name: 'Passed', value: gkStats.passed, color: '#10B981' },
    { name: 'Flagged', value: gkStats.flagged, color: '#FACC15' },
    { name: 'Blocked', value: gkStats.blocked, color: '#EF4444' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-[#050505] p-4 sm:p-6" data-testid="admin-page">
      <div className="max-w-[1440px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Admin Panel</span>
            <h1 className="font-heading text-2xl sm:text-3xl text-white mt-1">System Monitor</h1>
            <p className="text-sm text-neutral-400 mt-1">Read-only monitoring. No model control.</p>
          </div>
          <button
            onClick={loadData}
            disabled={refreshing}
            data-testid="refresh-stats-button"
            className="flex items-center gap-1.5 px-4 py-2 bg-white/5 border border-white/10 text-white text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <GearSix size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {/* Read-only notice */}
        <div className="p-3 bg-[#0F0F0F] border border-white/10 mb-6 flex items-center gap-2" data-testid="admin-readonly-notice">
          <Eye size={16} className="text-neutral-400" />
          <span className="text-xs text-neutral-400">This panel is read-only. Admin has NO control over model approval or system operations.</span>
        </div>

        {stats && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              {[
                { label: 'Total Models', value: stats.total_models, icon: Database, color: '#00D4FF' },
                { label: 'Active Models', value: stats.active_models, icon: Lightning, color: '#10B981' },
                { label: 'Total Signals', value: stats.total_signals, icon: ChartLine, color: '#FACC15' },
                { label: 'Total Votes', value: stats.total_votes, icon: Scales, color: '#A78BFA' },
                { label: 'Allocations', value: stats.total_allocations, icon: ShieldCheck, color: '#F472B6' },
                { label: 'Executions', value: stats.total_executions, icon: Lightning, color: '#FB923C' },
              ].map((s, i) => (
                <div key={i} className="bg-[#0F0F0F] border border-white/10 p-4" data-testid={`admin-stat-${i}`}>
                  <s.icon size={18} style={{ color: s.color }} className="mb-2" />
                  <div className="font-mono text-2xl text-white">{s.value}</div>
                  <div className="text-[10px] font-mono tracking-[0.15em] text-neutral-500 uppercase mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Gatekeeper Stats + Recent Signals */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Gatekeeper Pie */}
              <div className="md:col-span-4 bg-[#0F0F0F] border border-white/10 p-4" data-testid="gatekeeper-stats-panel">
                <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Gatekeeper Decisions</span>
                {gkPieData.length > 0 ? (
                  <div className="mt-4">
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={gkPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                            {gkPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#0F0F0F', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-4 text-xs">
                      {gkPieData.map((d, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <div className="w-2 h-2" style={{ backgroundColor: d.color }} />
                          <span className="text-neutral-400">{d.name}: <span className="text-white font-mono">{d.value}</span></span>
                        </div>
                      ))}
                    </div>
                    <div className="text-center mt-3 text-xs text-neutral-500 font-mono">
                      Pass Rate: {gkStats?.pass_rate || 0}%
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-neutral-500 text-sm">No gatekeeper data yet</div>
                )}
              </div>

              {/* Recent Signals */}
              <div className="md:col-span-8 bg-[#0F0F0F] border border-white/10 p-4" data-testid="recent-signals-panel">
                <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Recent Signals</span>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-left">
                        <th className="py-2 text-neutral-500 font-mono">ID</th>
                        <th className="py-2 text-neutral-500 font-mono">Model</th>
                        <th className="py-2 text-neutral-500 font-mono">Signal</th>
                        <th className="py-2 text-neutral-500 font-mono">Gatekeeper</th>
                        <th className="py-2 text-neutral-500 font-mono">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.recent_signals || []).map((s, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="py-2 font-mono text-neutral-400">{s.id?.slice(0, 8)}</td>
                          <td className="py-2 text-neutral-300">{s.model_name || s.model_id}</td>
                          <td className="py-2">
                            <span className={`font-mono ${s.prediction?.signal === 'BUY' ? 'text-emerald-400' : s.prediction?.signal === 'SELL' ? 'text-red-400' : 'text-yellow-400'}`}>
                              {s.prediction?.signal || '-'}
                            </span>
                          </td>
                          <td className="py-2">
                            <span className={`font-mono ${s.gatekeeper?.decision === 'PASS' ? 'text-emerald-400' : s.gatekeeper?.decision === 'BLOCK' ? 'text-red-400' : 'text-yellow-400'}`}>
                              {s.gatekeeper?.decision || '-'}
                            </span>
                          </td>
                          <td className="py-2 font-mono text-neutral-500">{s.timestamp ? new Date(s.timestamp).toLocaleTimeString() : ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!stats.recent_signals?.length && <div className="p-6 text-center text-neutral-500 text-sm">No recent signals</div>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
