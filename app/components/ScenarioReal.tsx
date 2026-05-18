'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const UPSIDE_BETA = 2.0;
const DOWNSIDE_CAPTURE = 0.5;
const CURRENT_YEAR = new Date().getFullYear();

interface RawPoint {
  date: string;
  timestamp: number;
  close: number;
}

interface ChartPoint {
  date: string;
  timestamp: number;
  sp500: number;
  portfolio: number;
}

interface AnnualReturn {
  year: number;
  sp500Return: number;
  portfolioReturn: number;
}

interface TooltipEntry {
  dataKey: string;
  value: number;
  color: string;
  name: string;
}

interface LineTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number;
}

interface BarTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number;
}

// Daily compounding: each day portfolio moves UPSIDE_BETA * sp500_daily (up) or
// DOWNSIDE_CAPTURE * sp500_daily (down). This ensures max drawdown from peak ≈ 0.5x SP500.
function simulatePortfolio(raw: RawPoint[]): ChartPoint[] {
  let portfolioValue = 100;
  const sp500Start = raw[0].close;

  return raw.map((point, i) => {
    const sp500Normalized = (point.close / sp500Start) * 100;

    if (i === 0) {
      return { date: point.date, timestamp: point.timestamp, sp500: 100, portfolio: 100 };
    }

    const dailyReturn = (point.close - raw[i - 1].close) / raw[i - 1].close;
    const portfolioReturn =
      dailyReturn >= 0 ? dailyReturn * UPSIDE_BETA : dailyReturn * DOWNSIDE_CAPTURE;
    portfolioValue *= 1 + portfolioReturn;

    return {
      date: point.date,
      timestamp: point.timestamp,
      sp500: parseFloat(sp500Normalized.toFixed(2)),
      portfolio: parseFloat(portfolioValue.toFixed(2)),
    };
  });
}

// Annual return: simple beta applied to each year's total return.
function computeAnnualReturns(raw: RawPoint[]): AnnualReturn[] {
  const byYear = new Map<number, RawPoint[]>();

  for (const point of raw) {
    const year = new Date(point.timestamp).getUTCFullYear();
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(point);
  }

  return Array.from(byYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, points]) => {
      const first = points[0].close;
      const last = points[points.length - 1].close;
      const sp500Return = ((last - first) / first) * 100;
      const portfolioReturn =
        sp500Return >= 0
          ? sp500Return * UPSIDE_BETA
          : sp500Return * DOWNSIDE_CAPTURE;
      return {
        year,
        sp500Return: parseFloat(sp500Return.toFixed(2)),
        portfolioReturn: parseFloat(portfolioReturn.toFixed(2)),
      };
    });
}

function calcMaxDrawdown(values: number[]): number {
  let peak = values[0];
  let maxDD = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD * 100;
}

function LineTooltip({ active, payload, label }: LineTooltipProps) {
  if (!active || !payload?.length || label == null) return null;
  const date = new Date(label).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-gray-400 mb-2 font-medium">{date}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="mb-1">
          <span style={{ color: entry.color }}>{entry.name}: </span>
          <span className="text-white font-medium">{entry.value.toFixed(1)}</span>
          <span className="text-gray-500 text-xs ml-1">
            ({entry.value >= 100 ? '+' : ''}{(entry.value - 100).toFixed(1)}%)
          </span>
        </div>
      ))}
    </div>
  );
}

function BarTooltip({ active, payload, label }: BarTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="mb-1">
          <span className="text-gray-400">{entry.name}: </span>
          <span className={`font-medium ${entry.value >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {entry.value >= 0 ? '+' : ''}{Number(entry.value).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: 'red' | 'green' | 'neutral';
}

function StatCard({ label, value, sub, accent = 'neutral' }: StatCardProps) {
  const border = { red: 'border-red-900/50', green: 'border-green-900/50', neutral: 'border-gray-800' }[accent];
  const color = { red: 'text-red-400', green: 'text-green-400', neutral: 'text-white' }[accent];
  return (
    <div className={`bg-gray-900 border ${border} rounded-xl p-4`}>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function ScenarioReal() {
  const [startYear, setStartYear] = useState(2015);
  const [endYear, setEndYear] = useState(CURRENT_YEAR);
  const [rawData, setRawData] = useState<RawPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const from = `${startYear}-01-01`;
        const to = `${endYear}-12-31`;
        const res = await fetch(`/api/sp500?from=${from}&to=${to}`);
        if (!res.ok) throw new Error('Error al obtener datos del SP500');
        const data: RawPoint[] = await res.json();
        if (!cancelled) setRawData(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error desconocido');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [startYear, endYear]);

  const chartData = useMemo(() => {
    if (!rawData.length) return [];
    return simulatePortfolio(rawData);
  }, [rawData]);

  const annualData = useMemo(() => {
    if (!rawData.length) return [];
    return computeAnnualReturns(rawData);
  }, [rawData]);

  const stats = useMemo(() => {
    if (!chartData.length) return null;
    const last = chartData[chartData.length - 1];
    return {
      sp500Return: last.sp500 - 100,
      portfolioReturn: last.portfolio - 100,
      sp500MaxDD: calcMaxDrawdown(chartData.map((d) => d.sp500)),
      portfolioMaxDD: calcMaxDrawdown(chartData.map((d) => d.portfolio)),
    };
  }, [chartData]);

  const annualTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let y = startYear; y <= endYear; y++) {
      ticks.push(new Date(`${y}-01-01`).getTime());
    }
    return ticks;
  }, [startYear, endYear]);

  const startYearOptions = Array.from({ length: CURRENT_YEAR - 1990 }, (_, i) => 1990 + i);
  const endYearOptions = Array.from({ length: CURRENT_YEAR - startYear + 1 }, (_, i) => startYear + 1 + i);

  const hasData = !loading && chartData.length > 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Escenario Real</h1>
          <p className="text-gray-500 text-sm mt-1">
            SP500 historico vs portafolio simulado &nbsp;·&nbsp; downside 0.5x &nbsp;·&nbsp; upside 2x
          </p>
        </div>

        {/* Year selectors */}
        <div className="flex flex-wrap items-end gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Año inicio
            </label>
            <select
              value={startYear}
              onChange={(e) => {
                const y = Number(e.target.value);
                setStartYear(y);
                if (endYear <= y) setEndYear(y + 1);
              }}
              className="bg-gray-800 text-white text-lg font-bold rounded-lg px-3 py-1 outline-none border border-gray-700 focus:border-blue-500 transition-colors"
            >
              {startYearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Año fin
            </label>
            <select
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="bg-gray-800 text-white text-lg font-bold rounded-lg px-3 py-1 outline-none border border-gray-700 focus:border-blue-500 transition-colors"
            >
              {endYearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="text-gray-500 text-sm pb-4 animate-pulse">Cargando datos...</div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-6 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Cumulative chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Rendimiento acumulado (base 100)
            </h2>
            {hasData && (
              <span className="text-xs text-gray-600">{chartData.length} dias de mercado</span>
            )}
          </div>
          <p className="text-xs text-gray-600 mb-6">{startYear} – {endYear}</p>

          {loading ? (
            <div className="flex items-center justify-center h-80 text-gray-600 text-sm">
              Obteniendo datos historicos del SP500...
            </div>
          ) : hasData ? (
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  ticks={annualTicks}
                  tickFormatter={(ts: number) => new Date(ts).getFullYear().toString()}
                  stroke="#374151"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(v: number) => v.toFixed(0)}
                  stroke="#374151"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  width={55}
                />
                <Tooltip content={<LineTooltip />} />
                <Legend wrapperStyle={{ color: '#6b7280', fontSize: '12px', paddingTop: '16px' }} />
                <Line
                  type="monotone"
                  dataKey="sp500"
                  name="SP500"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="portfolio"
                  name="Portafolio simulado"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-80 text-gray-600 text-sm">
              Sin datos disponibles.
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Retorno SP500"
              value={`${stats.sp500Return >= 0 ? '+' : ''}${stats.sp500Return.toFixed(1)}%`}
              sub={`${startYear} – ${endYear}`}
              accent={stats.sp500Return >= 0 ? 'green' : 'red'}
            />
            <StatCard
              label="Retorno portafolio"
              value={`${stats.portfolioReturn >= 0 ? '+' : ''}${stats.portfolioReturn.toFixed(1)}%`}
              sub="Compuesto diario asimetrico"
              accent={stats.portfolioReturn >= 0 ? 'green' : 'red'}
            />
            <StatCard
              label="Max drawdown SP500"
              value={`-${stats.sp500MaxDD.toFixed(1)}%`}
              sub="Peor caida pico-a-valle"
              accent="red"
            />
            <StatCard
              label="Max drawdown portafolio"
              value={`-${stats.portfolioMaxDD.toFixed(1)}%`}
              sub={`~${(stats.portfolioMaxDD / Math.max(stats.sp500MaxDD, 0.01) * 100).toFixed(0)}% del drawdown SP500`}
              accent="red"
            />
          </div>
        )}

        {/* Annual return chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Retorno anual por año
          </h2>
          <p className="text-xs text-gray-600 mb-6">
            Retorno de cada año independiente · SP500 vs portafolio (beta aplicado al retorno anual)
          </p>

          {loading ? (
            <div className="flex items-center justify-center h-60 text-gray-600 text-sm">
              Cargando...
            </div>
          ) : annualData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={annualData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="year"
                  stroke="#374151"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v: number) => `${v.toFixed(0)}%`}
                  stroke="#374151"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  width={50}
                />
                <Tooltip content={<BarTooltip />} />
                <Legend wrapperStyle={{ color: '#6b7280', fontSize: '12px', paddingTop: '12px' }} />
                <ReferenceLine y={0} stroke="#374151" strokeWidth={1} />
                <Bar dataKey="sp500Return" name="SP500" radius={[2, 2, 0, 0]}>
                  {annualData.map((entry, i) => (
                    <Cell key={i} fill={entry.sp500Return >= 0 ? '#3b82f6' : '#f87171'} />
                  ))}
                </Bar>
                <Bar dataKey="portfolioReturn" name="Portafolio" radius={[2, 2, 0, 0]}>
                  {annualData.map((entry, i) => (
                    <Cell key={i} fill={entry.portfolioReturn >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-gray-600 text-sm">
              Sin datos disponibles.
            </div>
          )}
        </div>

        <p className="text-xs text-gray-700 border-t border-gray-800 pt-4">
          Fuente: Yahoo Finance (^GSPC) &nbsp;·&nbsp;
          Compuesto diario: upside 2x, downside 0.5x &nbsp;·&nbsp;
          Retorno anual: beta simple por año &nbsp;·&nbsp;
          No incluye dividendos ni costos de transaccion
        </p>
      </div>
    </div>
  );
}
