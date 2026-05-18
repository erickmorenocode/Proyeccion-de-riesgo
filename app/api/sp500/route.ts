import { NextRequest, NextResponse } from 'next/server';

interface RawPoint {
  date: string;
  timestamp: number;
  close: number;
}

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json({ error: 'Params from/to requeridos' }, { status: 400 });
  }

  const period1 = Math.floor(new Date(from).getTime() / 1000);
  const period2 = Math.floor(new Date(to).getTime() / 1000);

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC` +
    `?interval=1d&period1=${period1}&period2=${period2}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
          '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'No se pudo conectar con Yahoo Finance' },
      { status: 502 },
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Yahoo Finance retorno ${res.status}` },
      { status: 502 },
    );
  }

  const json = await res.json();
  const result = json?.chart?.result?.[0];

  if (!result) {
    return NextResponse.json({ error: 'Sin datos del SP500' }, { status: 502 });
  }

  const timestamps: number[] = result.timestamp ?? [];
  const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];

  const data: RawPoint[] = timestamps
    .map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      timestamp: ts * 1000,
      close: closes[i],
    }))
    .filter((d): d is RawPoint => d.close != null && !isNaN(d.close));

  return NextResponse.json(data);
}
