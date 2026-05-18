export type Tab = 'proyeccion' | 'real';

interface TabNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'proyeccion', label: 'Proyeccion de Riesgo' },
  { id: 'real', label: 'Escenario Real' },
];

export default function TabNav({ active, onChange }: TabNavProps) {
  return (
    <div className="border-b px-6 pt-5" style={{ backgroundColor: '#0d1b2a', borderColor: '#1a2f45' }}>
      <div className="max-w-6xl mx-auto flex gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-5 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              active === tab.id
                ? 'text-white border-white bg-white/10'
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
