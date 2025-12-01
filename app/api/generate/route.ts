// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import QRCode from 'qrcode';

// Load private key and RPC URL from environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_INFURA_URL);

export async function POST(request: NextRequest) {
  const { data } = await request.json();

  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const messageHash = ethers.keccak256(ethers.toUtf8Bytes(data));
  
  // Send a 0-ETH transaction with the hash in the data field
  const tx = await wallet.sendTransaction({
    to: wallet.address,
    value: 0,
    data: messageHash,
  });

  const receipt = await tx.wait();
  const txHash = receipt!.hash;

  const qrUrl = await QRCode.toDataURL(txHash);

  return NextResponse.json({ qr: qrUrl, txHash });
}
