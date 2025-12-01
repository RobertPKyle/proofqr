
// src/app/verify/page.tsx
'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import jsQR from 'jsqr';
import { ethers } from 'ethers';

function VerifyContent() {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'checking' | 'valid' | 'invalid'>('idle');
  const [txHash, setTxHash] = useState('');
  const [message, setMessage] = useState('');
  const [scanCount, setScanCount] = useState<number>(0);

  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_INFURA_URL);

  // Check for transaction hash in URL on load
  useEffect(() => {
    const txFromUrl = searchParams.get('tx');
    if (txFromUrl) {
      checkTx(txFromUrl);
    }
  }, [searchParams]);

  const startCamera = async () => {
    try {
      setStatus('scanning');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('autoplay', 'true');
        await videoRef.current.play();
        requestAnimationFrame(tick);
      }
    } catch (error) {
      console.error('Camera error:', error);
      alert('Failed to access camera. Please check permissions.');
      setStatus('idle');
    }
  };

  const tick = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && video.readyState === video.HAVE_ENOUGH_DATA && canvas) {
      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });
        if (code) {
          checkTx(code.data);
          return;
        }
      }
    }
    if (status === 'scanning') requestAnimationFrame(tick);
  };

  const checkTx = async (hash: string) => {
    setStatus('checking');
    setTxHash(hash);
    try {
      const tx = await provider.getTransaction(hash);
      if (tx && tx.data && tx.data !== '0x') {
        // Track the scan
        try {
          const scanRes = await fetch('/api/track-scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txHash: hash }),
          });
          const scanData = await scanRes.json();
          setScanCount(scanData.scanCount || 0);
        } catch (error) {
          console.error('Failed to track scan:', error);
          setScanCount(0);
        }

        // Transaction is valid - it exists on blockchain with data
        const dataHash = tx.data;
        setMessage(`Blockchain verified! Data hash: ${dataHash.slice(0, 20)}...`);
        setStatus('valid');
      } else {
        setMessage('No data found in transaction');
        setStatus('invalid');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setMessage('Invalid or unknown transaction');
      setStatus('invalid');
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 relative overflow-hidden">
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

        <div className="relative bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-2xl p-8 text-center border border-cyan-500/30"
             style={{ boxShadow: '0 0 30px rgba(0, 212, 255, 0.3), inset 0 0 30px rgba(0, 212, 255, 0.05)' }}>

          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent">
            QR Verification
          </h1>
          <p className="text-cyan-300/70 text-sm mb-8 font-mono">Scan & Validate</p>

          {status === 'idle' && (
            <div className="space-y-4">
              <p className="text-cyan-300 text-sm">Scan a ProofQR code with your phone's camera app, or use the button below:</p>
              <button
                onClick={startCamera}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-lg transition-all duration-300 shadow-lg shadow-cyan-500/50 hover:shadow-cyan-400/70 font-mono uppercase tracking-wider"
              >
                Manual Camera Scan
              </button>
            </div>
          )}

          <div className="relative mt-8">
            <video
              ref={videoRef}
              className="w-full rounded-lg hidden"
              playsInline
              autoPlay
              muted
            />
            <canvas
              ref={canvasRef}
              className="w-full rounded-lg border-2 border-cyan-500/50"
              style={{
                boxShadow: status === 'scanning' ? '0 0 20px rgba(0, 212, 255, 0.4)' : 'none',
                maxHeight: '500px',
                display: status === 'idle' ? 'none' : 'block'
              }}
            />

            {/* Scanning overlay */}
            {status === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-4 border-cyan-400/50 rounded-lg"></div>
                <div
                  className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                  style={{
                    animation: 'scan-line 2s linear infinite',
                    boxShadow: '0 0 10px #00d4ff'
                  }}
                ></div>
              </div>
            )}
          </div>

          {status === 'scanning' && (
            <p className="mt-6 text-lg text-cyan-300 font-mono animate-pulse">
              Scanning for QR Code...
            </p>
          )}

          {status === 'checking' && (
            <p className="mt-6 text-lg text-cyan-300 font-mono animate-pulse">
              Checking Blockchain...
            </p>
          )}

          {(status === 'valid' || status === 'invalid') && (
            <div
              className={`mt-8 p-6 rounded-lg border-2 ${
                status === 'valid'
                  ? 'bg-emerald-950/50 border-emerald-400'
                  : 'bg-red-950/50 border-red-400'
              }`}
              style={{
                boxShadow: status === 'valid'
                  ? '0 0 20px rgba(16, 185, 129, 0.4)'
                  : '0 0 20px rgba(239, 68, 68, 0.4)'
              }}
            >
              <p className={`text-3xl font-bold mb-3 font-mono ${
                status === 'valid' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {status === 'valid' ? 'VERIFIED' : 'INVALID'}
              </p>
              <p className="break-all text-sm text-cyan-100 bg-slate-950/50 p-3 rounded font-mono">
                {message}
              </p>
              {status === 'valid' && scanCount > 0 && (
                <div className="mt-3 p-2 bg-cyan-950/50 border border-cyan-500/30 rounded">
                  <p className="text-xs text-cyan-400 font-mono">SCAN COUNT</p>
                  <p className="text-2xl text-cyan-200 font-mono font-bold">{scanCount}</p>
                </div>
              )}
              {txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  className="inline-block mt-4 px-6 py-2 bg-blue-600/80 hover:bg-blue-500 text-cyan-50 rounded-lg border border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/50 font-mono text-sm"
                >
                  View Transaction →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Verify() {
  return (
    <Suspense fallback={
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="text-cyan-300 font-mono">Loading...</div>
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}