import type { ReactNode } from 'react';

const GREEN = ['Operational', 'In Stock', 'Loading', 'Unloading', 'Staged', 'Loading truck', 'Unloading truck'];
const BLUE = ['Docking', 'En route', 'Moving', 'Arriving', 'Simulated'];
const ORANGE = ['At gate', 'Booked', 'Charging', 'Low Stock'];

export function tone(label: string): 'green' | 'blue' | 'orange' | 'grey' {
  if (GREEN.includes(label)) return 'green';
  if (BLUE.includes(label)) return 'blue';
  if (ORANGE.includes(label)) return 'orange';
  return 'grey';
}

export function Pill({ label }: { label: string }) {
  return <span className={`pill ${tone(label)}`}>{label}</span>;
}

export function Bar({ value, color = 'green' }: { value: number; color?: 'green' | 'blue' }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <span className={`bar ${color === 'blue' ? 'blue' : ''}`}>
      <i style={{ width: `${pct}%` }} />
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function Link({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="link" onClick={onClick}>
      {children}
    </button>
  );
}

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
