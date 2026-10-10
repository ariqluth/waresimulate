import { useEffect } from 'react';
import { FORCED_STATE, useApp } from './store';
import { Scene } from './world/Scene';
import { Header } from './ui/Header';
import { Kpis, Toolbar } from './ui/Panels';
import { Inspector } from './ui/Inspector';
import { Tracking } from './ui/Tracking';
import { Queue } from './ui/Queue';
import { GEO_ATTRIBUTION } from './data/geo';

const LOAD_MS = 700;
const OFFLINE_AFTER_MS = 10_000;

function ErrorCard() {
  const retry = useApp((s) => s.retry);
  return (
    <div className="card error-card" role="alert">
      <h3>Could not load WareTrack</h3>
      <p>The data service did not respond.</p>
      <button className="btn primary" onClick={retry}>
        Retry
      </button>
    </div>
  );
}

export default function App() {
  const connection = useApp((s) => s.connection);
  const setConnection = useApp((s) => s.setConnection);

  // Simulated first load and forced states (PRD §16).
  useEffect(() => {
    if (FORCED_STATE === 'loading') return;
    const timers: number[] = [];
    timers.push(window.setTimeout(() => setConnection(FORCED_STATE === 'error' ? 'error' : 'live'), LOAD_MS));
    if (FORCED_STATE === 'offline') timers.push(window.setTimeout(() => setConnection('offline'), LOAD_MS + OFFLINE_AFTER_MS));
    return () => timers.forEach(clearTimeout);
  }, [setConnection]);

  // Esc clears the selection unless an input or menu handles it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if ((e.target as HTMLElement)?.closest('input, [role="listbox"]')) return;
      useApp.getState().clearSelection();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <Header />
      <main className="stage">
        <div className="canvas-wrap">
          <Scene />
          {connection === 'loading' && <div className="world-loading">Loading world…</div>}
          {/* WH-06 is drawn from OpenStreetMap data (ODbL): attribution stays visible. */}
          <a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            {GEO_ATTRIBUTION}
          </a>
        </div>
        {connection === 'error' && <ErrorCard />}
        <Kpis />
        <Toolbar />
        <Inspector />
        <Tracking />
        <Queue />
      </main>
    </div>
  );
}
