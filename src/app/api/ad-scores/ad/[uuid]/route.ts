import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://data-science-api.zappi.io';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;

    const keys = [
      process.env.ZAPPI_AD_SCORES_SIM_KEY,
      process.env.ZAPPI_AD_SCORES_LIVE_KEY,
    ].filter(Boolean);

    if (keys.length === 0) {
      return NextResponse.json({ error: 'No API keys configured' }, { status: 500 });
    }

    let lastResponse: Response | null = null;

    for (const apiKey of keys) {
      const response = await fetch(`${BASE_URL}/api/ad-scores/ad/${uuid}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }

      lastResponse = response;
    }

    const text = lastResponse ? await lastResponse.text() : 'No response';
    return NextResponse.json(
      { error: `Upstream error: ${lastResponse?.status} ${text}` },
      { status: lastResponse?.status ?? 500 }
    );
  } catch (err) {
    console.error('Ad scores ad result error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
