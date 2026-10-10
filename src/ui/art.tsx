import type { CarrierId, SkuIcon } from '../data/types';
import { CARRIERS } from '../data/sites';

export function LogoCube({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M16 2 29 9v14l-13 7-13-7V9z" fill="#2557E3" />
      <path d="M16 2 29 9l-13 7L3 9z" fill="#5C86F2" />
      <path d="M16 16v14l13-7V9z" fill="#1C45C2" />
    </svg>
  );
}

export function Avatar({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden>
      <circle cx="22" cy="22" r="22" fill="#DCE6FB" />
      <clipPath id="av">
        <circle cx="22" cy="22" r="22" />
      </clipPath>
      <g clipPath="url(#av)">
        <path d="M6 44c1-9 7-13 16-13s15 4 16 13z" fill="#24335E" />
        <path d="M18 29h8v4c0 2-8 2-8 0z" fill="#8A5A3C" />
        <ellipse cx="22" cy="20" rx="7.5" ry="8.5" fill="#9C6644" />
        <path d="M14.5 18c0-6 3.5-9 7.5-9s7.5 3 7.5 9c-1-3-3-4.5-7.5-4.5S15.5 15 14.5 18z" fill="#2B1D16" />
        <path d="M15.5 22c1 6 3.5 8 6.5 8s5.5-2 6.5-8c-1 3-3 4-6.5 4s-5.5-1-6.5-4z" fill="#2B1D16" />
      </g>
    </svg>
  );
}

export function SiteArt() {
  return (
    <svg width="54" height="40" viewBox="0 0 54 40" aria-hidden>
      <path d="M4 22 27 10l23 12v8L27 38 4 30z" fill="#2F5EEA" />
      <path d="M4 22 27 10l23 12-23 10z" fill="#5C86F2" />
      <path d="M27 32v6l23-8v-8z" fill="#1C45C2" />
      <path d="M10 26l6-2.6v6L10 32zM19 22.6l6-2.6v6l-6 2.6z" fill="#E8EEFC" />
      <path d="M33 26.5l5 2v5l-5-2zM40 29l5 2v-0.5" fill="#BFD0FA" />
    </svg>
  );
}

export function TruckArt({ carrier, w = 64 }: { carrier: CarrierId; w?: number }) {
  const c = CARRIERS[carrier];
  const cab = carrier === 'waretrack' ? '#2F5EEA' : '#FFFFFF';
  return (
    <svg width={w} height={(w * 40) / 64} viewBox="0 0 64 40" aria-hidden>
      <path d="M4 14 34 4l20 7v14L24 36 4 29z" fill="#FFFFFF" stroke="#D6DDEB" strokeWidth="0.8" />
      <path d="M4 14 34 4l20 7-30 10z" fill="#F4F7FC" />
      <path d="M24 21v15L54 25V11z" fill="#E9EEF7" />
      <path d="M4 25l20 7v4L4 29z" fill={c.color} />
      <path d="M44 22l14-5v10l-14 5z" fill={cab} stroke="#C9D2E3" strokeWidth="0.6" />
      <path d="M50 20l7-2.5v4.5l-7 2.5z" fill="#1E2A45" />
      <circle cx="12" cy="31" r="3" fill="#262B35" />
      <circle cx="20" cy="34" r="3" fill="#262B35" />
      <circle cx="49" cy="31" r="2.6" fill="#262B35" />
    </svg>
  );
}

export function ForkliftArt() {
  return (
    <svg width="46" height="44" viewBox="0 0 46 44" aria-hidden>
      <rect x="10" y="20" width="20" height="12" rx="2" fill="#F2B33D" />
      <rect x="6" y="18" width="7" height="14" rx="2" fill="#D9982A" />
      <path d="M12 8h14v2H14v10h-2z" fill="#2B303B" />
      <rect x="24" y="8" width="2" height="12" fill="#2B303B" />
      <rect x="31" y="6" width="3" height="28" fill="#2B303B" />
      <rect x="34" y="31" width="10" height="2.5" fill="#2B303B" />
      <rect x="16" y="15" width="5" height="6" rx="1" fill="#F07B2E" />
      <circle cx="18.5" cy="12.5" r="2.4" fill="#E3AE86" />
      <circle cx="14" cy="34" r="4" fill="#262B35" />
      <circle cx="27" cy="34" r="4" fill="#262B35" />
    </svg>
  );
}

export function DockArt() {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
      <rect x="6" y="6" width="32" height="32" rx="3" fill="#2F5EEA" />
      <rect x="10" y="11" width="24" height="27" fill="#2E3646" />
      <rect x="10" y="11" width="24" height="9" fill="#DCE2EC" />
      <path d="M10 14h24M10 17h24" stroke="#C3CCDB" strokeWidth="1" />
      <rect x="15" y="27" width="14" height="11" fill="#D9AE7A" />
    </svg>
  );
}

export function ChargerArt() {
  return (
    <svg width="40" height="44" viewBox="0 0 40 44" aria-hidden>
      <rect x="10" y="4" width="20" height="36" rx="3" fill="#FFFFFF" stroke="#C9D2E3" />
      <rect x="14" y="9" width="12" height="8" rx="1.5" fill="#1F2A44" />
      <path d="M21 20l-5 8h4l-1 7 6-9h-4z" fill="#2557E3" />
      <rect x="6" y="38" width="28" height="3" rx="1.5" fill="#BDEFD1" />
    </svg>
  );
}

export function SkuArt({ icon, size = 26 }: { icon: SkuIcon; size?: number }) {
  const s = size;
  switch (icon) {
    case 'helmet':
      return (
        <svg width={s} height={s} viewBox="0 0 26 26" aria-hidden>
          <path d="M4 17c0-6 4-10 9-10s9 4 9 10z" fill="#F5B53A" />
          <path d="M2 17h22v3H2z" fill="#E09A1E" />
          <path d="M12 7h2v10h-2z" fill="#FFD27A" />
        </svg>
      );
    case 'container':
    case 'gloves':
      return (
        <svg width={s} height={s} viewBox="0 0 26 26" aria-hidden>
          <path d="M3 9l10-5 10 5v10l-10 5-10-5z" fill="#2F5EEA" />
          <path d="M3 9l10-5 10 5-10 5z" fill="#5C86F2" />
          <path d="M13 14v10l10-5V9z" fill="#1C45C2" />
        </svg>
      );
    case 'tape':
      return (
        <svg width={s} height={s} viewBox="0 0 26 26" aria-hidden>
          <ellipse cx="13" cy="13" rx="9" ry="10" fill="#D9AE7A" />
          <ellipse cx="13" cy="13" rx="4.5" ry="5" fill="#F3E6D3" />
          <path d="M20 17l4 6h-5z" fill="#C9965C" />
        </svg>
      );
    case 'water':
    case 'peas':
      return (
        <svg width={s} height={s} viewBox="0 0 26 26" aria-hidden>
          <path d="M3 10l10-5 10 5v8l-10 5-10-5z" fill="#F4F6FA" stroke="#C9D2E3" />
          <path d="M3 10l10 5 10-5" fill="none" stroke="#C9D2E3" />
          <path d="M7 15l5 2.5" stroke={icon === 'water' ? '#5C86F2' : '#3BB273'} strokeWidth="2" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 26 26" aria-hidden>
          <path d="M3 9l10-5 10 5v10l-10 5-10-5z" fill="#D9AE7A" />
          <path d="M3 9l10-5 10 5-10 5z" fill="#E8C597" />
          <path d="M13 14v10l10-5V9z" fill="#C9965C" />
          <path d="M8 6.5l10 5" stroke="#F3E6D3" strokeWidth="1.6" />
        </svg>
      );
  }
}

export function QueueIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden>
      <rect x="2" y="4" width="24" height="20" rx="4" fill="#2557E3" />
      <rect x="2" y="4" width="24" height="6" rx="3" fill="#5C86F2" />
      <path d="M7 15h14M7 19h10" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
