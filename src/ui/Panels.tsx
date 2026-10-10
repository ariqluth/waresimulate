import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Box as BoxIcon, Clock, House, Minus, Plus, RotateCcw, RotateCw, Truck as TruckIcon } from 'lucide-react';
import { useApp, world } from '../store';
import { networkMetrics, siteMetrics } from '../sim/derived';
import { fmtInt } from './bits';

function Delta({ value, suffix = '' }: { value: number; suffix?: string }) {
  const cls = value > 0 ? '' : value < 0 ? 'down' : 'flat';
  const text = `${value > 0 ? '+' : value < 0 ? '−' : '+'}${Math.abs(value)}${suffix}`;
  return (
    <span className={`delta ${cls}`}>
      <i>{value < 0 ? <ArrowDown size={11} strokeWidth={3} /> : <ArrowUp size={11} strokeWidth={3} />}</i>
      {text}
    </span>
  );
}

function KpiCard({ icon, label, value, delta, sub }: { icon: ReactNode; label: string; value: string; delta: ReactNode; sub: string }) {
  return (
    <div className="card kpi">
      <span className="icon-tile">{icon}</span>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">
          <b>{value}</b>
          {delta}
        </div>
        <div className="kpi-sub">{sub}</div>
      </div>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <div className="card kpi">
      <span className="icon-tile skeleton" />
      <div style={{ flex: 1 }}>
        <div className="skeleton" style={{ height: 12, width: '60%' }} />
        <div className="skeleton" style={{ height: 22, width: '45%', margin: '6px 0' }} />
        <div className="skeleton" style={{ height: 10, width: '70%' }} />
      </div>
    </div>
  );
}

export function Kpis() {
  const view = useApp((s) => s.view);
  const connection = useApp((s) => s.connection);
  useApp((s) => s.tick);
  if (connection === 'loading' || connection === 'error')
    return (
      <div className="kpis">
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton />
      </div>
    );
  if (view === 'ALL') {
    const n = networkMetrics(world);
    const sites = Object.values(world.sites);
    const sum = (k: 'stockDelta' | 'trucksDelta') => sites.reduce((a, s) => a + s[k], 0);
    return (
      <div className="kpis">
        <KpiCard icon={<BoxIcon size={24} />} label="Stock on hand" value={fmtInt(n.stock)} delta={<Delta value={sum('stockDelta')} />} sub="pallets · All sites" />
        <KpiCard icon={<TruckIcon size={24} />} label="Trucks on site" value={String(n.onSite)} delta={<Delta value={sum('trucksDelta')} />} sub={`${n.inbound} inbound · All sites`} />
        <KpiCard icon={<Clock size={24} />} label="On-time delivery" value={`${n.onTimePct.toFixed(1)}%`} delta={<Delta value={0.4} suffix="%" />} sub="last 30 days · All sites" />
      </div>
    );
  }
  const m = siteMetrics(world, view);
  const st = world.sites[view];
  return (
    <div className="kpis">
      <KpiCard icon={<BoxIcon size={24} />} label="Stock on hand" value={fmtInt(m.stock)} delta={<Delta value={st.stockDelta} />} sub={`pallets · ${view}`} />
      <KpiCard icon={<TruckIcon size={24} />} label="Trucks on site" value={String(m.onSite)} delta={<Delta value={st.trucksDelta} />} sub={`${m.inbound} inbound · ${view}`} />
      <KpiCard
        icon={<Clock size={24} />}
        label="On-time delivery"
        value={st.deliveries30d ? `${st.onTimePct.toFixed(1)}%` : '—'}
        delta={<Delta value={st.onTimeDelta} suffix="%" />}
        sub={`last 30 days · ${view}`}
      />
    </div>
  );
}

export function Toolbar() {
  const camera = useApp((s) => s.camera);
  return (
    <div className="card toolbar" role="toolbar" aria-label="Camera">
      <button aria-label="Zoom in" title="Zoom in" onClick={() => camera({ type: 'zoom', dir: 1 })}>
        <Plus size={18} />
      </button>
      <button aria-label="Zoom out" title="Zoom out" onClick={() => camera({ type: 'zoom', dir: -1 })}>
        <Minus size={18} />
      </button>
      <hr />
      <button aria-label="Rotate left" title="Rotate left" onClick={() => camera({ type: 'rotate', dir: 1 })}>
        <RotateCcw size={17} />
      </button>
      <button aria-label="Rotate right" title="Rotate right" onClick={() => camera({ type: 'rotate', dir: -1 })}>
        <RotateCw size={17} />
      </button>
      <hr />
      <button aria-label="Reset view" title="Reset view" onClick={() => camera({ type: 'home' })}>
        <House size={17} />
      </button>
    </div>
  );
}
