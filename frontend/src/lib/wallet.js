import { ethers } from 'ethers';

let provider = null;
let signer = null;
let walletAddress = null;

export const isMetaMaskInstalled = () => typeof window.ethereum !== 'undefined';

export const connectWallet = async () => {
  if (!isMetaMaskInstalled()) {
    // Return a demo wallet for environments without MetaMask
    walletAddress = '0x' + Array.from({length: 40}, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return { address: walletAddress, chainId: 11155111, demo: true };
  }

  try {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    walletAddress = accounts[0];

    const network = await provider.getNetwork();

    // Request switch to Sepolia if not already on it
    if (network.chainId !== 11155111) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }],
        });
      } catch (err) {
        console.warn('Could not switch to Sepolia:', err);
      }
    }

    return { address: walletAddress, chainId: network.chainId, demo: false };
  } catch (err) {
    console.error('Wallet connect error:', err);
    throw err;
  }
};

export const getWalletAddress = () => walletAddress;

export const signTransaction = async (action, data = {}) => {
  const txData = {
    action,
    ...data,
    timestamp: new Date().toISOString(),
    nonce: Math.floor(Math.random() * 1000000)
  };

  if (signer) {
    try {
      const message = JSON.stringify(txData);
      const signature = await signer.signMessage(message);
      return {
        ...txData,
        signature,
        tx_hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message)),
        signed: true
      };
    } catch (err) {
      console.error('Sign error:', err);
      throw err;
    }
  }

  // Demo mode - simulate signing
  const message = JSON.stringify(txData);
  return {
    ...txData,
    tx_hash: '0x' + Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    signed: true,
    demo: true
  };
};

export const getBalance = async () => {
  if (provider && walletAddress) {
    try {
      const balance = await provider.getBalance(walletAddress);
      return parseFloat(ethers.utils.formatEther(balance));
    } catch {
      return 0;
    }
  }
  return 10.0; // Demo balance
};

export const shortenAddress = (addr) => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export const disconnectWallet = () => {
  provider = null;
  signer = null;
  walletAddress = null;
};
