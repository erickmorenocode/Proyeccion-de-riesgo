'use client';

import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const DOWNSIDE_CAPTURE = 0.5;
const UPSIDE_BETA = 2.0;

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

interface ScenarioPoint {
  sp500Drop: number;
  capitalAfterDrop: number;
  capitalAfterRecovery: number;
  portfolioDrop: number;
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

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm shadow-xl">
      <p className="text-gray-400 mb-2 font-medium">SP500: -{label}%</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }} className="mb-1">
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'red' | 'green' | 'blue' | 'neutral';
}) {
  const borderColor = {
    red: 'border-red-900/50',
    green: 'border-green-900/50',
    blue: 'border-blue-900/50',
    neutral: 'border-gray-800',
  }[accent ?? 'neutral'];

  const textColor = {
    red: 'text-red-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
    neutral: 'text-white',
  }[accent ?? 'neutral'];

  return (
    <div className={`bg-gray-900 border ${borderColor} rounded-xl p-4`}>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${textColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

export default function RiskDashboard() {
  const [capitalRaw, setCapitalRaw] = useState('100000');
  const [sp500Drop, setSp500Drop] = useState(20);

  const capital = parseFloat(capitalRaw.replace(/[^0-9.]/g, '')) || 0;

  const scenarios: ScenarioPoint[] = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => {
      const drop = (i + 1) * 5;
      const portfolioDrop = drop * DOWNSIDE_CAPTURE;
      const capitalAfterDrop = capital * (1 - portfolioDrop / 100);
      const sp500RecoveryNeeded = drop / (1 - drop / 100);
      const portfolioRecovery = sp500RecoveryNeeded * UPSIDE_BETA;
      const capitalAfterRecovery = capitalAfterDrop * (1 + portfolioRecovery / 100);
      return { sp500Drop: drop, capitalAfterDrop, capitalAfterRecovery, portfolioDrop };
    });
  }, [capital]);

  const selected = useMemo(() => {
    const portfolioDrop = sp500Drop * DOWNSIDE_CAPTURE;
    const capitalAfterDrop = capital * (1 - portfolioDrop / 100);
    const sp500RecoveryNeeded = sp500Drop / (1 - sp500Drop / 100);
    const portfolioRecovery = sp500RecoveryNeeded * UPSIDE_BETA;
    const capitalAfterRecovery = capitalAfterDrop * (1 + portfolioRecovery / 100);
    const netGain = capitalAfterRecovery - capital;
    const netGainPct = capital > 0 ? (netGain / capital) * 100 : 0;
    return {
      portfolioDrop,
      capitalAfterDrop,
      capitalLost: capital - capitalAfterDrop,
      sp500RecoveryNeeded,
      portfolioRecovery,
      capitalAfterRecovery,
      netGain,
      netGainPct,
    };
  }, [capital, sp500Drop]);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Proyeccion de Riesgo de Portafolio</h1>
          <p className="text-gray-500 text-sm mt-1">
            Downside 0.5x SP500 &nbsp;·&nbsp; Upside beta 2x &nbsp;·&nbsp; Recuperacion asimetrica
          </p>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Capital Invertido (USD)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-xl">$</span>
              <input
                type="text"
                value={capitalRaw}
                onChange={(e) => setCapitalRaw(e.target.value.replace(/[^0-9.]/g, ''))}
                className="bg-transparent text-3xl font-bold text-white w-full outline-none placeholder-gray-700 focus:text-blue-300 transition-colors"
                placeholder="100,000"
              />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Supuesto caida SP500:&nbsp;
              <span className="text-red-400 text-sm font-bold">-{sp500Drop}%</span>
              <span className="text-gray-600 ml-2 font-normal">
                &rarr; portafolio&nbsp;
                <span className="text-red-400">-{selected.portfolioDrop.toFixed(0)}%</span>
              </span>
            </label>
            <input
              type="range"
              min={5}
              max={55}
              step={5}
              value={sp500Drop}
              onChange={(e) => setSp500Drop(Number(e.target.value))}
              className="w-full accent-blue-500 mt-2"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>-5%</span>
              <span>-55%</span>
            </div>
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Capital inicial"
            value={formatCurrency(capital)}
            accent="neutral"
          />
          <MetricCard
            label="Capital tras caida"
            value={formatCurrency(selected.capitalAfterDrop)}
            sub={`-${selected.portfolioDrop.toFixed(1)}% portafolio`}
            accent="red"
          />
          <MetricCard
            label="Perdida nominal"
            value={`-${formatCurrency(selected.capitalLost)}`}
            sub={`SP500 -${sp500Drop}%`}
            accent="red"
          />
          <MetricCard
            label="Capital tras recuperacion"
            value={formatCurrency(selected.capitalAfterRecovery)}
            sub={`+${selected.netGainPct.toFixed(1)}% vs inicial`}
            accent="green"
          />
        </div>

        {/* Chart */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Proyeccion por escenario SP500
          </h2>
          <p className="text-xs text-gray-600 mb-6">
            Linea azul vertical = escenario seleccionado
          </p>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={scenarios} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="sp500Drop"
                tickFormatter={(v: number) => `-${v}%`}
                stroke="#374151"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                label={{ value: 'Caida SP500', position: 'insideBottom', offset: -2, fill: '#4b5563', fontSize: 11 }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                stroke="#374151"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                width={80}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ color: '#6b7280', fontSize: '12px', paddingTop: '20px' }}
              />

              {/* Initial capital reference */}
              <ReferenceLine
                y={capital}
                stroke="#374151"
                strokeDasharray="4 4"
              />

              {/* Selected scenario reference */}
              <ReferenceLine
                x={sp500Drop}
                stroke="#3b82f6"
                strokeDasharray="3 3"
                strokeWidth={1.5}
              />

              {/* Loss zone */}
              <Area
                type="monotone"
                dataKey="capitalAfterDrop"
                name="Capital tras caida"
                stroke="#ef4444"
                fill="#ef444415"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />

              {/* Recovery potential */}
              <Line
                type="monotone"
                dataKey="capitalAfterRecovery"
                name="Capital tras recuperacion"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Recovery detail */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">SP500 debe recuperar</p>
            <p className="text-3xl font-bold text-blue-400">+{selected.sp500RecoveryNeeded.toFixed(1)}%</p>
            <p className="text-xs text-gray-600 mt-2">para volver al nivel pre-caida</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Portafolio sube (2x beta)</p>
            <p className="text-3xl font-bold text-green-400">+{selected.portfolioRecovery.toFixed(1)}%</p>
            <p className="text-xs text-gray-600 mt-2">desde el minimo de la caida</p>
          </div>
          <div className="bg-gray-900 border border-green-900/40 rounded-xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Ganancia neta vs inicial</p>
            <p className="text-3xl font-bold text-green-400">+{formatCurrency(selected.netGain)}</p>
            <p className="text-xs text-gray-600 mt-2">{selected.netGainPct.toFixed(1)}% retorno total al recuperar</p>
          </div>
        </div>

        <p className="text-xs text-gray-700 border-t border-gray-800 pt-4">
          Supuestos: downside capture 0.5x (portafolio cae 50% de lo que cae SP500) · upside beta 2x ·
          la recuperacion asume que el SP500 vuelve exactamente al nivel pre-caida
        </p>
      </div>
    </div>
  );
}
