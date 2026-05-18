'use client';

import { useState } from 'react';
import TabNav, { type Tab } from './components/TabNav';
import RiskDashboard from './components/RiskDashboard';
import ScenarioReal from './components/ScenarioReal';

export default function Home() {
  const [tab, setTab] = useState<Tab>('proyeccion');

  return (
    <>
      <TabNav active={tab} onChange={setTab} />
      {tab === 'proyeccion' ? <RiskDashboard /> : <ScenarioReal />}
    </>
  );
}
