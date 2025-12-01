// app/api/track-scan/route.ts
import { NextRequest, NextResponse } from 'next/server';

// In-memory store for scan counts (in production, use a database)
const scanCounts = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const { txHash } = await request.json();

    if (!txHash) {
      return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
    }

    // Increment scan count
    const currentCount = scanCounts.get(txHash) || 0;
    const newCount = currentCount + 1;
    scanCounts.set(txHash, newCount);

    return NextResponse.json({ scanCount: newCount });
  } catch (error) {
    console.error('Error tracking scan:', error);
    return NextResponse.json({ error: 'Failed to track scan' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get('txHash');

    if (!txHash) {
      return NextResponse.json({ error: 'Transaction hash required' }, { status: 400 });
    }

    const scanCount = scanCounts.get(txHash) || 0;
    return NextResponse.json({ scanCount });
  } catch (error) {
    console.error('Error getting scan count:', error);
    return NextResponse.json({ error: 'Failed to get scan count' }, { status: 500 });
  }
}
