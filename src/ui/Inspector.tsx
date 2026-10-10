import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowUpRight, Layers, LocateFixed, X } from 'lucide-react';
import { BAY_BY_ID, CARRIERS, CHARGER_BY_ID, SITE_BY_CODE, SITE_ORDER } from '../data/sites';
import { SKUS } from '../data/seed';
import type { Selection, SiteCode } from '../data/types';
import { useApp, view3d, world } from '../store';
import { GEO_SITES, type Pt } from '../data/geo';
import { skuKeyFor } from '../sim/engine';
import { forkliftPose, truckPose } from '../sim/pose';
import {
  bayStatus, fmtWeight, forkliftActivity, forkliftWorking, minsText, networkMetrics, siteMetrics,
  truckBar, truckEta, truckEtaText, truckStatus, truckStatusLine,
} from '../sim/derived';
import { hash01 } from '../sim/rng';
import { ChargerArt, DockArt, ForkliftArt, LogoCube, SiteArt, SkuArt, TruckArt } from './art';
import { Bar, Field, Link, Pill, fmtInt } from './bits';

function Head({ art, eyebrow, title, sub, actions }: { art: ReactNode; eyebrow: string; title: string; sub: string; actions: ReactNode }) {
  return (
    <div className="insp-head">
      <span className="art-tile">{art}</span>
      <div className="insp-titles">
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      <div className="insp-actions">{actions}</div>
    </div>
  );
}

function Actions({ follow = false, close = true, extra }: { follow?: boolean; close?: boolean; extra?: ReactNode }) {
  const s = useApp();
  return (
    <>
      {extra}
      <button
        className="icon-btn"
        aria-label="Locate"
        title="Locate"
        onClick={() => (s.selection ? s.camera({ type: 'locate' }) : s.camera({ type: 'home' }))}
      >
        <LocateFixed size={17} />
      </button>
      {follow && (
        <button className={`icon-btn ${s.follow ? 'on' : ''}`} aria-label="Follow" aria-pressed={s.follow} title="Follow" onClick={s.toggleFollow}>
          <ArrowUpRight size={17} />
        </button>
      )}
      {close && (
        <button className="icon-btn" aria-label="Close" title="Close" onClick={s.clearSelection}>
          <X size={17} />
        </button>
      )}
    </>
  );
}

function Status({ label, text }: { label: string; text: string }) {
  return (
    <div className="status-row">
      <Pill label={label} />
      <span>{text}</span>
    </div>
  );
}

const go = (sel: Selection) => () => useApp.getState().select(sel, { locate: true });

// ---- A. site ----------------------------------------------------------------------------------
function SitePanel({ code }: { code: SiteCode }) {
  const site = SITE_BY_CODE[code];
  const st = world.sites[code];
  const m = siteMetrics(world, code);
  const fleet = [...world.forklifts.values()].filter((f) => f.site === code);
  const lead = fleet.find(forkliftWorking) ?? fleet[0];
  return (
    <div className="fade" key={code}>
      <Head
        art={<SiteArt />}
        eyebrow={`${site.type} · ${code}`}
        title={site.name}
        sub={site.address}
        actions={
          <Actions
            close={false}
            extra={
              code === 'WH-05' ? (
                <button className="icon-btn" aria-label="Layers" title="Layers">
                  <Layers size={17} />
                </button>
              ) : undefined
            }
          />
        }
      />
      <Status label="Operational" text={`${m.docked} docked · ${m.inbound} arriving · ${m.staged} staged`} />
      <GeoNote code={code} />
      <div className="tiles">
        <div className="tile">
          Stock on hand
          <div className="tv">
            <b>{fmtInt(m.stock)}</b> / {fmtInt(m.capacity)}
          </div>
          <Bar value={m.stock / m.capacity} color="blue" />
        </div>
        <div className="tile">
          Truck bays
          <div className="tv">
            <b>{m.baysBusy}</b> / {m.bays} busy
          </div>
          <Bar value={m.baysBusy / m.bays} />
        </div>
        <div className="tile">
          Outbound today
          <div className="tv">
            <b>{st.outboundToday}</b> trucks
          </div>
        </div>
        <div className="tile">
          Put-aways today
          <div className="tv">
            <b>{st.putawaysToday}</b> pallets
          </div>
        </div>
      </div>
      <div className="section-head">
        Inventory <span>units</span>
      </div>
      {st.inventory.map((i) => (
        <div className="inv-row" key={i.sku}>
          <SkuArt icon={i.icon} />
          <span className="name">{i.name}</span>
          <span className="qty">{fmtInt(i.units)}</span>
          <Pill label={i.units < i.reorderPoint ? 'Low Stock' : 'In Stock'} />
        </div>
      ))}
      <div className="section-head" style={{ marginTop: 6 }}>
        Forklift fleet
        <span>
          {m.forkliftsWorking}/{m.forkliftsTotal} working
        </span>
      </div>
      {lead && (
        <div className="fleet-row">
          <b>{lead.code}</b>
          <span className="act">{forkliftActivity(world, lead)}</span>
          <Bar value={lead.battery / 100} />
          <em>{Math.round(lead.battery)}%</em>
        </div>
      )}
    </div>
  );
}

/**
 * A site at a real place (WH-06): say that its docks and traffic are simulated, and show true north,
 * since its map is turned to line the dock side up with the yard (PRD addendum §6.2, §8).
 */
function GeoNote({ code }: { code: SiteCode }) {
  const geo = GEO_SITES[code];
  if (!geo) return null;
  return (
    <div className="geo-note">
      <Pill label="Simulated" />
      <span>Dock and vehicle activity at this site is simulated.</span>
      <NorthArrow north={geo.north} />
    </div>
  );
}

/** Compass needle pointing to true north as seen from the current camera heading. */
function NorthArrow({ north }: { north: Pt }) {
  const needle = useRef<SVGGElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const a = view3d.azimuth;
      const [nx, nz] = north;
      // Screen up is the camera's ground-projected forward (-sin a, -cos a); right is (cos a, -sin a).
      const up = -nx * Math.sin(a) - nz * Math.cos(a);
      const right = nx * Math.cos(a) - nz * Math.sin(a);
      needle.current?.setAttribute('transform', `rotate(${((Math.atan2(right, up) * 180) / Math.PI).toFixed(1)} 16 16)`);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [north]);
  return (
    <span className="north" role="img" aria-label="North arrow" title="True north">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="15" fill="#fff" stroke="#E1E7F2" />
        <g ref={needle}>
          <text x="16" y="9.6" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#1D2B4F">
            N
          </text>
          <path d="M16 11 L19 18.5 L13 18.5 Z" fill="#E5484D" />
          <path d="M16 26 L19 18.5 L13 18.5 Z" fill="#C3CCDC" />
        </g>
      </svg>
    </span>
  );
}

function NetworkPanel() {
  const n = networkMetrics(world);
  const setView = useApp((s) => s.setView);
  return (
    <div className="fade" key="ALL">
      <Head art={<LogoCube size={40} />} eyebrow="NETWORK · ALL" title="Network overview" sub={`${SITE_ORDER.length} sites · New Jersey · Sidoarjo`} actions={<Actions close={false} />} />
      <Status label="Operational" text={`${n.docked} docked · ${n.inbound} arriving · ${n.staged} staged`} />
      {SITE_ORDER.map((code) => {
        const s = SITE_BY_CODE[code];
        const m = siteMetrics(world, code);
        return (
          <button key={code} className="net-row" onClick={() => setView(code)}>
            <span className="badge" style={{ background: s.badgeColor }}>
              {code}
            </span>
            <span className="site-row-body">
              <span className="site-row-top">
                {s.name}
                <em>{m.pctFull}%</em>
              </span>
              <span className="site-row-bottom">
                <Bar value={m.pctFull / 100} color="blue" />
                <span>
                  {m.docked}/{m.bays} docked · {m.inbound} inbound
                </span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ---- B. truck ---------------------------------------------------------------------------------
function TruckPanel({ id }: { id: string }) {
  const t = world.trucks.get(id);
  if (!t) return null;
  const c = CARRIERS[t.carrier];
  const sh = world.shipments.get(t.shipment);
  const bar = truckBar(world, t);
  const pose = truckPose(t, world.time);
  const bay = t.bay ? BAY_BY_ID[t.bay] : undefined;
  const kg = t.cargo.onBoard * t.cargo.kgPerPallet;
  return (
    <div className="fade" key={id}>
      <Head art={<TruckArt carrier={t.carrier} w={58} />} eyebrow={c.displayName} title={t.code} sub={`${t.driver} · ${t.plate}`} actions={<Actions follow />} />
      <Status label={truckStatus(t)} text={truckStatusLine(world, t)} />
      <div className="bar-row">
        <Bar value={bar.value} color={bar.color} />
        <span>{bar.text}</span>
      </div>
      <dl className="fields">
        <Field label="Shipment">{sh ? <Link onClick={() => useApp.setState({ activeTruck: t.code })}>#{sh.code}</Link> : '—'}</Field>
        <Field label="Customer">{sh?.customer ?? '—'}</Field>
        <Field label="Destination">{sh?.destination ?? '—'}</Field>
        <Field label="ETA">{truckEtaText(world, t)}</Field>
        <Field label="Speed">{Math.round(pose.speedKmh)} km/h</Field>
        <Field label="Bay">
          {bay ? (
            <>
              <Link onClick={go({ kind: 'bay', id: bay.id })}>{bay.name}</Link> · {t.site}
            </>
          ) : (
            '—'
          )}
        </Field>
        <Field label="Cargo">
          {t.cargo.onBoard}/{t.cargo.capacity} pallets · {fmtWeight(kg)}
        </Field>
      </dl>
    </div>
  );
}

// ---- C. forklift ------------------------------------------------------------------------------
function ForkliftPanel({ id }: { id: string }) {
  const f = world.forklifts.get(id);
  if (!f) return null;
  const pose = forkliftPose(world, f, world.time);
  const charger = CHARGER_BY_ID[f.charger];
  const carrying = pose.carrying && f.carrying ? world.pallets.get(f.carrying) : undefined;
  const speed = pose.moving ? 4 + hash01(f.code) * 4.5 : 0;
  return (
    <div className="fade" key={id}>
      <Head art={<ForkliftArt />} eyebrow={`FORKLIFT · ${f.site}`} title={f.code} sub={`${f.operator} · ${f.model}`} actions={<Actions follow />} />
      <Status label={f.status} text={forkliftActivity(world, f)} />
      <div className="bar-row">
        <Bar value={f.battery / 100} />
        <span>Battery {Math.round(f.battery)}%</span>
      </div>
      <dl className="fields">
        <Field label="Carrying">
          {carrying ? (
            <Link onClick={go({ kind: 'pallet', id: carrying.code })}>
              {carrying.code} · {SKUS[skuKeyFor(carrying.sku)].name}
            </Link>
          ) : (
            'Empty'
          )}
        </Field>
        <Field label="Moves today">{f.movesToday}</Field>
        <Field label="Speed">{speed.toFixed(1)} km/h</Field>
        <Field label="Charger">
          <Link onClick={go({ kind: 'charger', id: charger.id })}>{charger.code}</Link>
        </Field>
        <Field label="Site">{SITE_BY_CODE[f.site].name}</Field>
      </dl>
    </div>
  );
}

// ---- D. pallet --------------------------------------------------------------------------------
function PalletPanel({ id }: { id: string }) {
  const p = world.pallets.get(id);
  if (!p) return null;
  const sku = SKUS[skuKeyFor(p.sku)];
  const slot = p.slot !== undefined ? `S${String(p.slot + 1).padStart(2, '0')}` : undefined;
  const loc = slot ? `${p.site} · Yard slot ${slot}` : p.forklift ? `Forklift ${p.forklift}` : p.site;
  return (
    <div className="fade" key={id}>
      <Head art={<SkuArt icon={sku.icon} size={40} />} eyebrow={`PALLET · ${sku.category}`} title={sku.name} sub={`${p.code} · ${p.sku}`} actions={<Actions />} />
      <Status label={p.status} text={p.status === 'Moving' && p.forklift ? `On forks of ${p.forklift}` : loc} />
      <dl className="fields">
        <Field label="Quantity">{p.quantity} units</Field>
        <Field label="Gross weight">{p.grossKg} kg</Field>
        <Field label="Location">
          {p.forklift && !slot ? <Link onClick={go({ kind: 'forklift', id: p.forklift })}>{loc}</Link> : loc}
        </Field>
        <Field label="Lot">{p.lot}</Field>
        <Field label="Received">{p.received}</Field>
        <Field label="Site">{SITE_BY_CODE[p.site].name}</Field>
      </dl>
    </div>
  );
}

// ---- E. dock bay ------------------------------------------------------------------------------
function BayPanel({ id }: { id: string }) {
  const bay = BAY_BY_ID[id];
  const { status, truck } = bayStatus(world, id);
  let line = 'No truck assigned';
  if (truck) {
    if (status === 'Booked') line = `${truck.code} due in ${minsText(truckEta(world, truck) ?? world.time, world.time)}`;
    else if (status === 'Arriving') line = `${truck.code} reversing in · ${Math.round(truckPose(truck, world.time).distLeft)} m left`;
    else line = `${truck.code} · ${truck.work.done}/${truck.work.total} pallets`;
  }
  return (
    <div className="fade" key={id}>
      <Head art={<DockArt />} eyebrow={`DOCK BAY · ${bay.site}`} title={bay.name} sub="Dock door with leveller" actions={<Actions />} />
      <Status label={status} text={line} />
      <dl className="fields">
        <Field label="Truck">
          {truck ? (
            <Link onClick={go({ kind: 'truck', id: truck.code })}>
              {truck.code} · {CARRIERS[truck.carrier].label}
            </Link>
          ) : (
            '—'
          )}
        </Field>
        <Field label="Rear doors">{status === 'Loading' || status === 'Unloading' ? 'Open' : '—'}</Field>
        <Field label="Trucks today">{world.bays.get(id)?.trucksToday ?? 0}</Field>
        <Field label="Site">{SITE_BY_CODE[bay.site].name}</Field>
      </dl>
    </div>
  );
}

// ---- F. charger -------------------------------------------------------------------------------
function ChargerPanel({ id }: { id: string }) {
  const c = CHARGER_BY_ID[id];
  const cs = world.chargers.get(id);
  const chargingFl = cs?.charging ? world.forklifts.get(cs.charging) : undefined;
  const home = [...world.forklifts.values()].filter((f) => f.charger === id);
  const fl = chargingFl ?? home.find(forkliftWorking) ?? home[0];
  let line = 'Ready';
  if (chargingFl) line = `Charging ${chargingFl.code}`;
  else if (fl && forkliftWorking(fl)) line = `${fl.code} is out · ${forkliftActivity(world, fl)}`;
  else if (fl) line = `${fl.code} is parked · Idle`;
  return (
    <div className="fade" key={id}>
      <Head art={<ChargerArt />} eyebrow={`CHARGER · ${c.site}`} title={c.code} sub={c.model} actions={<Actions />} />
      <Status label={chargingFl ? 'Charging' : 'Free'} text={line} />
      <dl className="fields">
        <Field label="Forklift">
          {fl ? (
            <Link onClick={go({ kind: 'forklift', id: fl.code })}>
              {fl.code} · battery {Math.round(fl.battery)}%
            </Link>
          ) : (
            '—'
          )}
        </Field>
        <Field label="Sessions today">{cs?.sessionsToday ?? 0}</Field>
        <Field label="Energy today">{(cs?.energyKwh ?? 0).toFixed(1)} kWh</Field>
        <Field label="Charge rate">{c.ratePctPerMin}% a minute</Field>
        <Field label="Site">{SITE_BY_CODE[c.site].name}</Field>
      </dl>
    </div>
  );
}

function InspectorSkeleton() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 14 }}>
        <span className="art-tile skeleton" />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 10, width: '40%' }} />
          <div className="skeleton" style={{ height: 18, width: '70%', margin: '8px 0' }} />
          <div className="skeleton" style={{ height: 10, width: '55%' }} />
        </div>
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="skeleton" style={{ height: 14, margin: '16px 0' }} />
      ))}
    </div>
  );
}

export function Inspector() {
  const selection = useApp((s) => s.selection);
  const view = useApp((s) => s.view);
  const connection = useApp((s) => s.connection);
  useApp((s) => s.tick);
  let body: ReactNode;
  if (connection === 'loading' || connection === 'error') body = <InspectorSkeleton />;
  else if (!selection) body = view === 'ALL' ? <NetworkPanel /> : <SitePanel code={view} />;
  else if (selection.kind === 'truck') body = <TruckPanel id={selection.id} />;
  else if (selection.kind === 'forklift') body = <ForkliftPanel id={selection.id} />;
  else if (selection.kind === 'pallet') body = <PalletPanel id={selection.id} />;
  else if (selection.kind === 'bay') body = <BayPanel id={selection.id} />;
  else body = <ChargerPanel id={selection.id} />;
  return (
    <aside className="card inspector" aria-label="Inspector">
      {body}
    </aside>
  );
}
