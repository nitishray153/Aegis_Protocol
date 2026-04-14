import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { connectWallet, disconnectWallet, shortenAddress, getBalance } from '../lib/wallet';
import { ShieldCheck, ChartLine, Storefront, Code, Scales, GearSix, Wallet, SignOut, List, X } from '@phosphor-icons/react';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: ShieldCheck },
  { path: '/dashboard', label: 'Dashboard', icon: ChartLine },
  { path: '/marketplace', label: 'Marketplace', icon: Storefront },
  { path: '/developer', label: 'Developer', icon: Code },
  { path: '/dao', label: 'DAO', icon: Scales },
  { path: '/admin', label: 'Monitor', icon: GearSix },
];

export default function Navbar({ wallet, onWalletConnect, onWalletDisconnect }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const result = await connectWallet();
      const balance = await getBalance();
      onWalletConnect({ ...result, balance });
    } catch (err) {
      console.error(err);
    }
    setConnecting(false);
  };

  const handleDisconnect = () => {
    disconnectWallet();
    onWalletDisconnect();
  };

  return (
    <nav className="sticky top-0 z-50 bg-[#050505] border-b border-white/10" data-testid="main-navbar">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" data-testid="nav-logo">
            <ShieldCheck size={24} weight="bold" className="text-[#00D4FF]" />
            <span className="font-heading text-lg text-white tracking-tight">AEGIS</span>
            <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-500 uppercase hidden sm:block">PROTOCOL</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  data-testid={`nav-${label.toLowerCase()}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium tracking-wide transition-all duration-150 ${
                    active
                      ? 'text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/20'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} weight={active ? 'bold' : 'regular'} />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Wallet + Mobile Toggle */}
          <div className="flex items-center gap-2">
            {wallet ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#0F0F0F] border border-white/10 text-xs">
                  <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse-glow" />
                  <span className="font-mono text-neutral-300">{shortenAddress(wallet.address)}</span>
                  {wallet.balance !== undefined && (
                    <span className="font-mono text-[#00D4FF]">{wallet.balance.toFixed(3)} ETH</span>
                  )}
                </div>
                <button
                  onClick={handleDisconnect}
                  data-testid="wallet-disconnect-button"
                  className="p-1.5 text-neutral-500 hover:text-red-400 transition-colors"
                >
                  <SignOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                data-testid="wallet-connect-button"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#00D4FF] text-black text-xs font-semibold tracking-wide hover:bg-[#00B4D8] transition-all duration-150 disabled:opacity-50"
              >
                <Wallet size={14} weight="bold" />
                {connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}

            <button
              className="md:hidden p-1.5 text-neutral-400 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="mobile-menu-toggle"
            >
              {mobileOpen ? <X size={20} /> : <List size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#050505] px-4 py-3 space-y-1">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 text-sm ${
                  active ? 'text-[#00D4FF] bg-[#00D4FF]/10' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
