import type { KeyboardEvent, ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { CARRIERS, SITES, SITE_BY_CODE } from '../data/sites';
import type { Selection, SiteCode } from '../data/types';
import { useApp, world, type QueueTab } from '../store';
import { siteTrucks } from '../sim/engine';
import { bayName, bayStatus, forkliftActivity, minsText, networkMetrics, siteMetrics, sortedTrucks, truckEta, truckStatus } from '../sim/derived';
import { QueueIcon } from './art';
import { Bar, Pill } from './bits';

interface Row {
  key: string;
  sel: Selection;
  idTop: string;
  idSub: string;
  where: ReactNode;
  pill: string;
  info: ReactNode;
}

const Progress = ({ done, total }: { done: number; total: number }) => (
  <>
    <Bar value={done / total} />
    <span>
      {done}/{total}
    </span>
  </>
);

const dot = (color: string) => <i className="cdot" style={{ background: color }} />;

function dockRows(codes: SiteCode[]): Row[] {
  const rows: Row[] = [];
  for (const code of codes) {
    for (const bay of SITE_BY_CODE[code].bays) {
      const { status, truck } = bayStatus(world, bay.id);
      let info: ReactNode = null;
      if (truck && truck.phase === 'working') info = <Progress done={truck.work.done} total={truck.work.total} />;
      else if (truck) info = <span>{minsText(truckEta(world, truck) ?? world.time, world.time)}</span>;
      rows.push({
        key: bay.id,
        sel: { kind: 'bay', id: bay.id },
        idTop: bay.name,
        idSub: code,
        where: truck ? (
          <>
            {dot(CARRIERS[truck.carrier].color)}
            {truck.code} · {CARRIERS[truck.carrier].label}
          </>
        ) : (
          'No truck assigned'
        ),
        pill: status,
        info,
      });
    }
    for (const t of siteTrucks(world, code)) {
      if (t.bay || (t.phase !== 'enroute' && t.phase !== 'atgate')) continue;
      rows.push({
        key: `in:${t.code}`,
        sel: { kind: 'truck', id: t.code },
        idTop: 'Inbound',
        idSub: code,
        where: (
          <>
            {dot(CARRIERS[t.carrier].color)}
            {t.code} · {CARRIERS[t.carrier].label}
          </>
        ),
        pill: truckStatus(t),
        info: <span>{minsText(truckEta(world, t) ?? world.time, world.time)}</span>,
      });
    }
  }
  return rows;
}

const FL_PILL: Record<string, string> = { 'Unloading truck': 'Unloading', 'Loading truck': 'Loading', Charging: 'Charging', Idle: 'Idle' };

function forkliftRows(codes: SiteCode[]): Row[] {
  return [...world.forklifts.values()]
    .filter((f) => codes.includes(f.site))
    .map((f) => ({
      key: f.code,
      sel: { kind: 'forklift', id: f.code } as Selection,
      idTop: f.code,
      idSub: f.site,
      where: forkliftActivity(world, f),
      pill: FL_PILL[f.status],
      info: (
        <>
          <Bar value={f.battery / 100} />
          <span>{Math.round(f.battery)}%</span>
        </>
      ),
    }));
}

function truckRows(view: SiteCode | 'ALL'): Row[] {
  return sortedTrucks(world, view).map((t) => ({
    key: t.code,
    sel: { kind: 'truck', id: t.code } as Selection,
    idTop: t.code,
    idSub: CARRIERS[t.carrier].label,
    where: (
      <>
        {dot(CARRIERS[t.carrier].color)}
        {t.phase === 'working' ? `${t.site} · ${bayName(t)}` : `To ${t.site}`}
      </>
    ),
    pill: truckStatus(t),
    info:
      t.phase === 'working' ? (
        <Progress done={t.work.done} total={t.work.total} />
      ) : t.phase === 'docking' ? (
        <span>docking</span>
      ) : (
        <span>{minsText(truckEta(world, t) ?? world.time, world.time)}</span>
      ),
  }));
}

function onRowsKey(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const rows = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('.qrow')];
  const i = rows.indexOf(document.activeElement as HTMLButtonElement);
  const next = rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
  if (next) {
    e.preventDefault();
    next.focus();
  }
}

export function Queue() {
  const view = useApp((s) => s.view);
  const tab = useApp((s) => s.queueTab);
  const setTab = useApp((s) => s.setQueueTab);
  const selection = useApp((s) => s.selection);
  const select = useApp((s) => s.select);
  const connection = useApp((s) => s.connection);
  useApp((s) => s.tick);
  const codes: SiteCode[] = view === 'ALL' ? SITES.map((s) => s.code) : [view];
  const m = view === 'ALL' ? networkMetrics(world) : siteMetrics(world, view);
  const tabs: { id: QueueTab; count: string }[] = [
    { id: 'Docks', count: `${m.baysBusy}/${m.bays}` },
    { id: 'Forklifts', count: `${m.forkliftsWorking}/${m.forkliftsTotal}` },
    { id: 'Trucks', count: String(m.trucks) },
  ];
  const rows = tab === 'Docks' ? dockRows(codes) : tab === 'Forklifts' ? forkliftRows(codes) : truckRows(view);
  const loading = connection === 'loading' || connection === 'error';
  return (
    <section className="card queue" aria-label="Queue">
      <div className="queue-head">
        <QueueIcon />
        <div className="seg" role="tablist">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
              {t.id}
              <em>{loading ? '–' : t.count}</em>
            </button>
          ))}
        </div>
        <span className="site-name">{view === 'ALL' ? 'All sites' : SITE_BY_CODE[view].name}</span>
      </div>
      <div className="rows" onKeyDown={onRowsKey}>
        {loading &&
          [0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 30, margin: '8px 4px' }} />)}
        {!loading && rows.length === 0 && <div className="empty">{tab === 'Trucks' ? 'No trucks' : tab === 'Docks' ? 'No docks' : 'No forklifts'}</div>}
        {!loading &&
          rows.map((r) => {
            const on = !!selection && !!r.sel && selection.kind === r.sel.kind && selection.id === r.sel.id;
            return (
              <button key={r.key} className={`qrow ${on ? 'on' : ''}`} onClick={() => select(r.sel)}>
                <span className="id">
                  <b>{r.idTop}</b>
                  <small>{r.idSub}</small>
                </span>
                <span className={`where ${r.where === 'No truck assigned' ? 'muted' : ''}`}>{r.where}</span>
                <Pill label={r.pill} />
                <span className="info">{r.info}</span>
                <ChevronRight className="chev" size={16} />
              </button>
            );
          })}
      </div>
    </section>
  );
}
