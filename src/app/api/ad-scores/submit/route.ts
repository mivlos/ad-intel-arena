import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://data-science-api.zappi.io';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ads, mode = 'simulation' } = body;

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return NextResponse.json({ error: 'ads array is required' }, { status: 400 });
    }

    const apiKey =
      mode === 'live'
        ? process.env.ZAPPI_AD_SCORES_LIVE_KEY
        : process.env.ZAPPI_AD_SCORES_SIM_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: `API key not configured for mode: ${mode}` },
        { status: 500 }
      );
    }

    const response = await fetch(`${BASE_URL}/api/ad-scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ ads }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: `Upstream error: ${response.status} ${text}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('Ad scores submit error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
