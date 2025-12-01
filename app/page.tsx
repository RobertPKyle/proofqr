// src/app/page.tsx
'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import QRCode from 'qrcode';

export default function Home() {
  const [data, setData] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [qrSvg, setQrSvg] = useState('');
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletConnected, setWalletConnected] = useState(false);

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        alert('Please install MetaMask to use this feature!');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setWalletAddress(accounts[0]);
      setWalletConnected(true);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet. Please try again.');
    }
  };

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletConnected) {
      alert('Please connect your wallet first!');
      return;
    }

    setLoading(true);
    try {
      // Use connected wallet to send transaction
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Hash the data
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(data));

      // Send transaction with hash in data field
      const tx = await signer.sendTransaction({
        to: walletAddress,
        value: 0,
        data: messageHash,
      });

      // Wait for confirmation
      const receipt = await tx.wait();
      const transactionHash = receipt!.hash;

      // Generate QR codes
      const pngDataUrl = await QRCode.toDataURL(transactionHash);
      const svg = await QRCode.toString(transactionHash, { type: 'svg' });

      setQrUrl(pngDataUrl);
      setQrSvg(svg);
      setTxHash(transactionHash);
    } catch (error: any) {
      console.error('Failed to generate QR:', error);
      alert(`Failed to generate QR code: ${error.message || 'Please try again.'}`);
    }
    setLoading(false);
  };

  const downloadPNG = () => {
    const link = document.createElement('a');
    link.download = `proofqr-${txHash.slice(0, 8)}.png`;
    link.href = qrUrl;
    link.click();
  };

  const downloadSVG = () => {
    const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `proofqr-${txHash.slice(0, 8)}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen py-12 px-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="max-w-lg mx-auto relative">
        {/* Glow effect behind card */}
        <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full"></div>

        <div className="relative bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-cyan-500/30"
             style={{ boxShadow: '0 0 30px rgba(0, 212, 255, 0.3), inset 0 0 30px rgba(0, 212, 255, 0.05)' }}>

          <h1 className="text-4xl font-bold mb-2 text-center bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
            ProofQR
          </h1>
          <p className="text-cyan-300/70 text-center text-sm mb-4 font-mono">Blockchain Verification System</p>

          {/* Navigation to Verify Page */}
          <div className="text-center mb-6">
            <a
              href="/verify"
              className="inline-block px-6 py-2 bg-emerald-600/80 hover:bg-emerald-500 text-white rounded-lg border border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/50 font-mono text-sm"
            >
              📷 Scan & Verify QR Code →
            </a>
          </div>

          {/* Wallet Connection */}
          <div className="mb-6">
            {!walletConnected ? (
              <button
                onClick={connectWallet}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg transition-all duration-300 shadow-lg shadow-purple-500/50 hover:shadow-purple-400/70 font-mono uppercase tracking-wider"
              >
                🦊 Connect Wallet
              </button>
            ) : (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-lg">
                <p className="text-xs text-emerald-400 font-mono mb-1">CONNECTED WALLET</p>
                <p className="text-sm text-emerald-200 font-mono break-all">{walletAddress}</p>
              </div>
            )}
          </div>

          <form onSubmit={generate} className="space-y-6">
            <div>
              <label className="block text-cyan-300 text-sm font-medium mb-2 font-mono">INPUT DATA</label>
              <input
                type="text"
                placeholder="Enter data to verify..."
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/50 border border-cyan-500/50 rounded-lg text-lg text-cyan-50 placeholder-cyan-700 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading || !walletConnected}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-cyan-500/50 hover:shadow-cyan-400/70 font-mono uppercase tracking-wider"
              style={{ textShadow: loading ? '0 0 10px rgba(0, 212, 255, 0.8)' : 'none' }}
            >
              {loading ? '⟳ Generating on Blockchain...' : '▶ Generate QR Code'}
            </button>
          </form>

          {qrUrl && (
            <div className="mt-10 text-center animate-in fade-in duration-500">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-cyan-500/30 blur-xl"></div>
                <img
                  src={qrUrl}
                  alt="QR Code"
                  className="relative mx-auto border-4 border-cyan-400 rounded-lg bg-white p-2"
                  style={{ boxShadow: '0 0 20px rgba(0, 212, 255, 0.6)' }}
                />
              </div>

              <div className="mt-6 p-4 bg-slate-950/50 rounded-lg border border-cyan-500/30">
                <p className="text-xs text-cyan-400 font-mono mb-1">TRANSACTION HASH</p>
                <p className="text-sm text-cyan-200 break-all font-mono">{txHash}</p>
              </div>

              {/* Download Buttons */}
              <div className="mt-4 flex gap-3 justify-center">
                <button
                  onClick={downloadPNG}
                  className="px-6 py-2 bg-cyan-600/80 hover:bg-cyan-500 text-white rounded-lg border border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/50 font-mono text-sm"
                >
                  ⬇ PNG
                </button>
                <button
                  onClick={downloadSVG}
                  className="px-6 py-2 bg-blue-600/80 hover:bg-blue-500 text-white rounded-lg border border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/50 font-mono text-sm"
                >
                  ⬇ SVG
                </button>
              </div>

              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                className="inline-block mt-4 px-6 py-2 bg-blue-600/80 hover:bg-blue-500 text-cyan-50 rounded-lg border border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/50 font-mono text-sm"
              >
                View on Etherscan →
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}