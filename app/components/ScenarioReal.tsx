'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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

interface TooltipEntry {
  dataKey: string;
  value: number;
  color: string;
  name: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: number;
}

function simulatePortfolio(raw: RawPoint[]): ChartPoint[] {
  let portfolioValue = 100;
  const sp500Start = raw[0].close;

  return raw.map((point, i) => {
    const sp500Normalized = (point.close / sp500Start) * 100;
    const sp500TotalReturn = sp500Normalized - 100;

    if (i === 0) {
      return { date: point.date, timestamp: point.timestamp, sp500: 100, portfolio: 100 };
    }

    const dailyReturn = (point.close - raw[i - 1].close) / raw[i - 1].close;

    if (dailyReturn >= 0) {
      // Upside unchanged: portfolio = 100 + totalReturn * 2x
      portfolioValue = 100 + sp500TotalReturn * UPSIDE_BETA;
    } else {
      // Downside: 0.5x applied to daily move from current portfolio value
      // Guarantees drawdown from peak ≈ 0.5x SP500 drawdown from peak
      portfolioValue *= 1 + dailyReturn * DOWNSIDE_CAPTURE;
    }

    return {
      date: point.date,
      timestamp: point.timestamp,
      sp500: parseFloat(sp500Normalized.toFixed(2)),
      portfolio: parseFloat(portfolioValue.toFixed(2)),
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

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
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
  const [year, setYear] = useState(CURRENT_YEAR - 1);
  const [rawData, setRawData] = useState<RawPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const from = `${year}-01-01`;
        const to = `${year}-12-31`;
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
  }, [year]);

  const chartData = useMemo(() => {
    if (!rawData.length) return [];
    return simulatePortfolio(rawData);
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

  const monthlyTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let m = 0; m < 12; m++) {
      ticks.push(new Date(year, m, 1).getTime());
    }
    return ticks;
  }, [year]);

  const yearOptions = Array.from({ length: CURRENT_YEAR - 1990 }, (_, i) => 1990 + i);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Escenario Real</h1>
          <p className="text-gray-500 text-sm mt-1">
            SP500 historico vs portafolio simulado &nbsp;·&nbsp; downside 0.5x &nbsp;·&nbsp; upside 2x
          </p>
        </div>

        {/* Year selector */}
        <div className="flex flex-wrap items-end gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Año
            </label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-gray-800 text-white text-lg font-bold rounded-lg px-3 py-1 outline-none border border-gray-700 focus:border-blue-500 transition-colors"
            >
              {yearOptions.map((y) => (
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

        {/* Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Rendimiento acumulado (base 100)
            </h2>
            {!loading && chartData.length > 0 && (
              <span className="text-xs text-gray-600">
                {chartData.length} dias de mercado
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 mb-6">{year}</p>

          {loading ? (
            <div className="flex items-center justify-center h-80 text-gray-600 text-sm">
              Obteniendo datos historicos del SP500...
            </div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  ticks={monthlyTicks}
                  tickFormatter={(ts: number) => new Date(ts).toLocaleDateString('es-MX', { month: 'short' })}
                  stroke="#374151"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(v: number) => v.toFixed(0)}
                  stroke="#374151"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  width={55}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: '#6b7280', fontSize: '12px', paddingTop: '16px' }}
                />
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
              Sin datos disponibles para el rango seleccionado.
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && !loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Retorno SP500"
              value={`${stats.sp500Return >= 0 ? '+' : ''}${stats.sp500Return.toFixed(1)}%`}
              sub={`${year}`}
              accent={stats.sp500Return >= 0 ? 'green' : 'red'}
            />
            <StatCard
              label="Retorno portafolio"
              value={`${stats.portfolioReturn >= 0 ? '+' : ''}${stats.portfolioReturn.toFixed(1)}%`}
              sub="Modelo asimetrico aplicado"
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
              sub="0.5x captura en caidas"
              accent="red"
            />
          </div>
        )}

        <p className="text-xs text-gray-700 border-t border-gray-800 pt-4 mt-6">
          Fuente: Yahoo Finance (^GSPC) &nbsp;·&nbsp;
          Retornos diarios: upside 2x, downside 0.5x &nbsp;·&nbsp;
          No incluye dividendos ni costos de transaccion
        </p>
      </div>
    </div>
  );
}
