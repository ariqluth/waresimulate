import { Check, ChevronRight, ClipboardList, FileText, Package, Truck as TruckIcon } from 'lucide-react';
import { CARRIERS } from '../data/sites';
import { useApp, world } from '../store';
import { hhmm } from '../sim/engine';
import { bayName, minsText, timeline, truckEta, truckStatus, workFinish } from '../sim/derived';
import { TruckArt } from './art';
import { Pill } from './bits';

const ICONS = [FileText, Package, ClipboardList, TruckIcon, Check];
const EMPTY_STEPS = ['Order Confirmed', 'Picked', 'Loaded', 'In Transit', 'Delivered'];

export function Tracking() {
  const activeTruck = useApp((s) => s.activeTruck);
  const connection = useApp((s) => s.connection);
  const select = useApp((s) => s.select);
  useApp((s) => s.tick);
  const t = activeTruck ? world.trucks.get(activeTruck) : undefined;
  const sh = t ? world.shipments.get(t.shipment) : undefined;
  const loading = connection === 'loading' || connection === 'error';

  const steps = t && sh ? timeline(world, t) : EMPTY_STEPS.map((label) => ({ label, state: 'todo' as const, time: undefined, eta: undefined }));

  let info = '';
  if (t) {
    if (t.phase === 'working') info = `${t.site} · ${bayName(t)} · ${minsText(workFinish(world, t), world.time).replace('now', '0 min')} left`;
    else if (t.phase === 'departing') info = `Departed ${t.site}`;
    else {
      const eta = truckEta(world, t) ?? world.time;
      info = `Arriving ${hhmm(eta)} · ${minsText(eta, world.time)}`;
    }
  }

  return (
    <section className="card tracking" aria-label="Shipment Tracking">
      <div className="track-main">
        <div className="track-head">
          <TruckIcon size={20} color="#2557E3" />
          Shipment Tracking
          {t && !loading && (
            <small>
              {t.code} · {CARRIERS[t.carrier].label}
            </small>
          )}
        </div>
        {loading ? (
          <div className="skeleton" style={{ height: 52, marginTop: 18 }} />
        ) : (
          <div className="steps fade" key={t?.code ?? 'none'}>
            {steps.map((s, i) => {
              const Icon = ICONS[i];
              // Done → finish time; active In Transit → start time; work steps and future steps → ETA.
              const sub =
                s.state !== 'done' && s.eta !== undefined ? `ETA ${hhmm(s.eta)}` : s.time !== undefined ? hhmm(s.time) : '';
              return (
                <div key={i} className={`step ${s.state}`}>
                  <span className="circle">
                    <Icon size={16} />
                  </span>
                  <b>{s.label}</b>
                  <span>{sub || (t ? '' : '—')}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {t && sh && !loading ? (
        <button className="mini fade" key={sh.code} onClick={() => select({ kind: 'truck', id: t.code }, { locate: true })}>
          <TruckArt carrier={t.carrier} w={72} />
          <span className="mini-body">
            <b>#{sh.code}</b>
            <span className="to">To: {sh.destination}</span>
            <Pill label={truckStatus(t)} />
            <span className="info">{info}</span>
          </span>
          <ChevronRight size={18} color="#3A4256" />
        </button>
      ) : (
        <div className="mini" style={{ justifyContent: 'center', color: 'var(--muted)', fontSize: 13.5 }}>
          {loading ? <span className="skeleton" style={{ height: 70, width: '100%' }} /> : 'No shipment selected'}
        </div>
      )}
    </section>
  );
}
