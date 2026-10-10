import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, ChevronDown, ChevronRight, ChevronUp, Search as SearchIcon } from 'lucide-react';
import { CARRIERS, SITES, SITE_BY_CODE, SITE_ORDER } from '../data/sites';
import { SKUS } from '../data/seed';
import type { Selection, SiteCode } from '../data/types';
import { useApp, world } from '../store';
import { hhmm, skuKeyFor } from '../sim/engine';
import { networkMetrics, siteMetrics } from '../sim/derived';
import { Avatar, LogoCube } from './art';
import { Bar } from './bits';

function SiteSwitcher() {
  const view = useApp((s) => s.view);
  useApp((s) => s.tick);
  const setView = useApp((s) => s.setView);
  const nextSite = useApp((s) => s.nextSite);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const net = view === 'ALL' ? networkMetrics(world) : null;
  const m = view === 'ALL' ? null : siteMetrics(world, view);
  const site = view === 'ALL' ? null : SITE_BY_CODE[view];

  return (
    <div className={`site-switch ${open ? 'open' : ''}`} ref={ref}>
      <button className="site-main" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <span className={`badge ${site ? '' : 'all'}`} style={site ? { background: site.badgeColor } : undefined}>
          {site ? site.code : 'ALL'}
        </span>
        <span className="site-text">
          <b>{site ? site.name : 'Network overview'}</b>
          <span>
            {m ? `${m.pctFull}% full · ${m.docked}/${m.bays} docked` : `${SITE_ORDER.length} sites · ${net!.docked}/${net!.bays} docked`}
          </span>
        </span>
      </button>
      <button className="site-next" onClick={nextSite} aria-label="Next site" title="Next site">
        <ChevronRight size={18} />
      </button>
      <button className="site-drop" onClick={() => setOpen((o) => !o)} aria-label="Choose site">
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && (
        <div className="site-menu" role="listbox">
          <button
            className={`site-row ${view === 'ALL' ? 'current' : ''}`}
            onClick={() => {
              setView('ALL');
              setOpen(false);
            }}
          >
            <span className="badge all">ALL</span>
            <span className="site-row-body">
              <span className="site-row-top">Network overview</span>
              <span className="site-row-bottom">Zoom out to all {SITE_ORDER.length} sites</span>
            </span>
          </button>
          {SITE_ORDER.map((code) => {
            const s = SITE_BY_CODE[code];
            const sm = siteMetrics(world, code);
            return (
              <button
                key={code}
                className={`site-row ${view === code ? 'current' : ''}`}
                onClick={() => {
                  setView(code);
                  setOpen(false);
                }}
              >
                <span className="badge" style={{ background: s.badgeColor }}>
                  {code}
                </span>
                <span className="site-row-body">
                  <span className="site-row-top">
                    {s.name}
                    <em>{sm.pctFull}%</em>
                  </span>
                  <span className="site-row-bottom">
                    <Bar value={sm.pctFull / 100} color="blue" />
                    <span>
                      {sm.docked}/{sm.bays} docked · {sm.inbound} inbound
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface Result {
  group: string;
  label: string;
  hint: string;
  site?: SiteCode;
  sel?: Selection;
}

function buildIndex(): Result[] {
  const out: Result[] = [];
  for (const s of SITES) out.push({ group: 'Sites', label: `${s.code} ${s.name}`, hint: s.type, site: s.code });
  for (const t of world.trucks.values()) {
    if (t.phase === 'departing') continue;
    const sh = world.shipments.get(t.shipment);
    out.push({ group: 'Trucks', label: t.code, hint: `${CARRIERS[t.carrier].label} · ${t.site} · ${sh?.customer ?? ''}`, sel: { kind: 'truck', id: t.code } });
    if (sh) out.push({ group: 'Shipments', label: `#${sh.code}`, hint: `${sh.customer} · ${t.code}`, sel: { kind: 'truck', id: t.code } });
  }
  for (const f of world.forklifts.values())
    out.push({ group: 'Forklifts', label: f.code, hint: `${f.operator} · ${f.site}`, sel: { kind: 'forklift', id: f.code } });
  for (const p of world.pallets.values()) {
    const sku = SKUS[skuKeyFor(p.sku)];
    out.push({ group: 'Pallets', label: p.code, hint: `${sku.name} · ${p.sku} · ${p.site}`, sel: { kind: 'pallet', id: p.code } });
  }
  return out;
}

function Search() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const setView = useApp((s) => s.setView);
  const select = useApp((s) => s.select);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea');
      if (e.key === '/' && !typing) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return buildIndex()
      .filter((r) => `${r.label} ${r.hint}`.toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q]);

  const choose = (r: Result) => {
    if (r.site) setView(r.site);
    else if (r.sel) select(r.sel, { locate: true });
    setQ('');
    setOpen(false);
    input.current?.blur();
  };

  let lastGroup = '';
  return (
    <div className="search">
      <label className="search-box">
        <SearchIcon size={18} />
        <span className="sr-only">Search</span>
        <input
          ref={input}
          value={q}
          placeholder="Search sites, trucks, forklifts, pallets, shipments..."
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setQ('');
              setOpen(false);
              input.current?.blur();
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(results.length - 1, a + 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === 'Enter' && results[active]) {
              choose(results[active]);
            }
          }}
        />
        <span className="kbd">/</span>
      </label>
      {open && q.trim() && (
        <div className="dropdown" role="listbox">
          {results.length === 0 && <div className="dd-empty">No matches</div>}
          {results.map((r, i) => {
            const head = r.group !== lastGroup ? (lastGroup = r.group) : null;
            return (
              <div key={`${r.group}${r.label}`}>
                {head && <div className="dd-group">{head}</div>}
                <button className={`dd-item ${i === active ? 'active' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => choose(r)} onMouseEnter={() => setActive(i)}>
                  <b>{r.label}</b>
                  <small>{r.hint}</small>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LivePill() {
  const connection = useApp((s) => s.connection);
  const retry = useApp((s) => s.retry);
  useApp((s) => s.tick);
  if (connection === 'offline')
    return (
      <div className="paused" role="status">
        Live updates paused
        <button onClick={retry}>Retry</button>
      </div>
    );
  if (connection !== 'live') return null;
  return (
    <div className="live" role="status" aria-label={`Live, ${hhmm(Math.floor(world.time))}`}>
      <span className="dot" />
      <span className="lbl">Live</span>
      <span>{hhmm(Math.floor(world.time))}</span>
    </div>
  );
}

export function Header() {
  return (
    <header className="header">
      <div className="brand">
        <LogoCube />
        WareTrack
      </div>
      <Search />
      <div className="spacer" />
      <SiteSwitcher />
      <LivePill />
      <button className="bell" aria-label="Notifications">
        <Bell size={21} />
        <i />
      </button>
      <span className="vsep" />
      <button className="user" aria-label="Alex Chen, Operations Manager">
        <Avatar />
        <span>
          <b>Alex Chen</b>
          <span>Operations Manager</span>
        </span>
        <ChevronDown size={18} color="#3A4256" />
      </button>
    </header>
  );
}
