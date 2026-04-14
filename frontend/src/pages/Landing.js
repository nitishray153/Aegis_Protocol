import { Link } from 'react-router-dom';
import { ShieldCheck, ChartLine, Storefront, Code, Scales, ArrowRight, Lightning, Lock, Eye } from '@phosphor-icons/react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' } })
};

const FEATURES = [
  { icon: ChartLine, title: 'AI Signal Generation', desc: 'LSTM & GRU models generate real-time trading signals with confidence scoring', color: '#00D4FF' },
  { icon: ShieldCheck, title: 'Multi-Factor Gatekeeper', desc: 'Filters signals by confidence, volatility, drawdown & consistency', color: '#10B981' },
  { icon: Lock, title: 'Non-Custodial', desc: 'Your wallet, your keys. System never holds or moves your funds', color: '#FACC15' },
  { icon: Scales, title: 'DAO Governance', desc: 'Quadratic voting for model approval. No admin control', color: '#A78BFA' },
  { icon: Eye, title: 'On-Chain Verification', desc: 'All critical actions hashed and stored on Sepolia blockchain', color: '#F472B6' },
  { icon: Lightning, title: 'IPFS Storage', desc: 'Model code and weights stored on decentralized IPFS via Pinata', color: '#FB923C' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050505]" data-testid="landing-page">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://static.prod-images.emergentagent.com/jobs/a5c76faa-e703-4f18-9aaa-d69cb55b7575/images/f6c01deb47795a52ef372abe24aab46051679f6c68b7cf5d49f36904ec0d797d.png"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        </div>
        
        <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 py-24 sm:py-32 lg:py-40">
          <motion.div initial="hidden" animate="visible" className="max-w-2xl">
            <motion.div custom={0} variants={fadeUp} className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-[#00D4FF] animate-pulse-glow" />
              <span className="text-xs font-mono tracking-[0.2em] text-[#00D4FF] uppercase">Live on Sepolia Testnet</span>
            </motion.div>
            
            <motion.h1 custom={1} variants={fadeUp} className="font-heading text-4xl sm:text-5xl lg:text-6xl text-white leading-[1.1] mb-6">
              Decentralized AI<br />
              <span className="text-[#00D4FF]">Asset Management</span>
            </motion.h1>
            
            <motion.p custom={2} variants={fadeUp} className="text-base sm:text-lg text-neutral-400 leading-relaxed mb-8 max-w-lg">
              AI models generate signals. Gatekeeper filters risk. You control execution. 
              Every action is verifiable on-chain. No custody. No admin control.
            </motion.p>
            
            <motion.div custom={3} variants={fadeUp} className="flex flex-wrap gap-3">
              <Link
                to="/dashboard"
                data-testid="hero-dashboard-link"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#00D4FF] text-black text-sm font-semibold tracking-wide hover:bg-[#00B4D8] transition-all duration-150"
              >
                Launch Dashboard
                <ArrowRight size={16} weight="bold" />
              </Link>
              <Link
                to="/marketplace"
                data-testid="hero-marketplace-link"
                className="inline-flex items-center gap-2 px-6 py-3 bg-transparent border border-white/20 text-white text-sm font-medium hover:bg-white/5 hover:border-white/40 transition-all duration-150"
              >
                Browse Models
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-white/10 bg-[#0A0A0A]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'ACTIVE MODELS', value: '3' },
              { label: 'SIGNALS GENERATED', value: '279+' },
              { label: 'DAO VOTES', value: '49' },
              { label: 'VERIFICATION', value: 'ZK-SIM' },
            ].map((stat, i) => (
              <div key={i} className="text-center" data-testid={`stat-${i}`}>
                <div className="font-mono text-2xl sm:text-3xl font-semibold text-white">{stat.value}</div>
                <div className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 sm:py-28">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
          <div className="mb-12">
            <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Core Modules</span>
            <h2 className="font-heading text-2xl sm:text-3xl text-white mt-2">How Aegis Works</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group p-6 bg-[#0F0F0F] border border-white/10 hover:border-white/20 transition-all duration-150 hover:-translate-y-[2px]"
                data-testid={`feature-card-${i}`}
              >
                <feat.icon size={28} weight="duotone" style={{ color: feat.color }} className="mb-4" />
                <h3 className="font-heading text-lg text-white mb-2">{feat.title}</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow Diagram */}
      <section className="py-16 border-t border-white/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
          <div className="mb-10">
            <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase">Protocol Flow</span>
            <h2 className="font-heading text-2xl sm:text-3xl text-white mt-2">End-to-End Pipeline</h2>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {[
              'Developer Upload', 'IPFS Storage', 'DAO Votes', 'Model Active',
              'Signal Generated', 'Gatekeeper Filter', 'User Sees Signal',
              'Wallet Execute', 'On-Chain Hash'
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3">
                <div className="px-3 py-2 bg-[#0F0F0F] border border-white/10 text-xs font-mono text-neutral-300 whitespace-nowrap">
                  {step}
                </div>
                {i < 8 && <ArrowRight size={14} className="text-[#00D4FF] flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-white/10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-2xl sm:text-3xl text-white mb-4">Ready to explore decentralized AI trading?</h2>
          <p className="text-neutral-400 text-sm mb-8 max-w-md mx-auto">Connect your wallet, browse AI models, and take control of your trading signals.</p>
          <div className="flex justify-center gap-3">
            <Link
              to="/dashboard"
              data-testid="cta-dashboard-link"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black text-sm font-semibold hover:bg-neutral-200 transition-colors"
            >
              Open Dashboard
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/developer"
              data-testid="cta-developer-link"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white text-sm font-medium hover:bg-white/5 transition-colors"
            >
              Upload Model
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#00D4FF]" />
            <span className="text-xs font-mono text-neutral-500">AEGIS PROTOCOL v1.0</span>
          </div>
          <span className="text-xs text-neutral-600">Decentralized AI Asset Management. All actions verifiable on-chain.</span>
        </div>
      </footer>
    </div>
  );
}
