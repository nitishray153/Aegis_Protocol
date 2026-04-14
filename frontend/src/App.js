import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import DeveloperPanel from './pages/DeveloperPanel';
import DAOPanel from './pages/DAOPanel';
import AdminPanel from './pages/AdminPanel';
import './App.css';

function App() {
  const [wallet, setWallet] = useState(null);

  return (
    <div className="min-h-screen bg-[#050505]">
      <BrowserRouter>
        <Navbar
          wallet={wallet}
          onWalletConnect={setWallet}
          onWalletDisconnect={() => setWallet(null)}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard wallet={wallet} />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/developer" element={<DeveloperPanel wallet={wallet} />} />
          <Route path="/dao" element={<DAOPanel wallet={wallet} />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0F0F0F',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            fontSize: '12px',
            fontFamily: 'IBM Plex Mono, monospace',
          },
        }}
      />
    </div>
  );
}

export default App;
