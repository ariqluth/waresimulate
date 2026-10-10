import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import type { CarrierId, SkuIcon } from '../data/types';
import { CARRIERS } from '../data/sites';
import { cardboard, livery } from './textures';

// ---- shared materials -------------------------------------------------------------------------
const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...extra });

export const MAT = {
  white: std('#F7F9FD'),
  offWhite: std('#E4E9F2'),
  chassis: std('#3B4252'),
  tire: std('#262B35', { roughness: 0.9 }),
  glass: std('#1E2A45', { roughness: 0.25, metalness: 0.1 }),
  light: std('#FFF6D8', { emissive: '#FFE9A8', emissiveIntensity: 0.4 }),
  yellow: std('#F2B33D'),
  yellowDark: std('#D9982A'),
  blue: std('#2F5EEA'),
  dark: std('#2B303B'),
  skin: std('#E3AE86'),
  orange: std('#F07B2E'),
  wood: std('#C99B63'),
  pin: std('#2B60E8', { roughness: 0.35 }),
  pinDot: std('#FFFFFF', { roughness: 0.4 }),
  wrapWhite: std('#F2F5FA', { roughness: 0.35 }),
  crate: std('#2F5EEA', { roughness: 0.55 }),
};

const carrierMats = new Map<CarrierId, { stripe: THREE.Material; cab: THREE.Material; livery: THREE.Material }>();
function carrierMaterials(id: CarrierId) {
  let m = carrierMats.get(id);
  if (!m) {
    const c = CARRIERS[id];
    m = {
      stripe: std(id === 'waretrack' ? '#2348C8' : c.color),
      cab: std(c.cabColor),
      livery: new THREE.MeshStandardMaterial({ map: livery(id), transparent: true, roughness: 0.7, depthWrite: false }),
    };
    carrierMats.set(id, m);
  }
  return m;
}

const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  wheel: new THREE.CylinderGeometry(0.52, 0.52, 0.42, 16).rotateX(Math.PI / 2),
  smallWheel: new THREE.CylinderGeometry(0.28, 0.28, 0.24, 12).rotateX(Math.PI / 2),
  plane: new THREE.PlaneGeometry(1, 1),
  sphere: new THREE.SphereGeometry(1, 20, 14),
  cone: new THREE.ConeGeometry(1, 1, 20),
};

function Box({ s, p, m, cast = true }: { s: [number, number, number]; p: [number, number, number]; m: THREE.Material; cast?: boolean }) {
  return <mesh geometry={GEO.box} material={m} scale={s} position={p} castShadow={cast} receiveShadow />;
}

// ---- truck ----------------------------------------------------------------------------------
/** Tractor + box trailer, forward = +x, origin at the truck centre on the ground. Length ≈ 16.6 m. */
export function TruckModel({ carrier }: { carrier: CarrierId }) {
  const cm = carrierMaterials(carrier);
  const wheels: [number, number][] = [];
  for (const x of [7.0, 5.0, -5.5, -6.8]) for (const z of [1.12, -1.12]) wheels.push([x, z]);
  return (
    <group>
      <Box s={[15.4, 0.45, 2.1]} p={[-0.2, 0.78, 0]} m={MAT.chassis} />
      <RoundedBox args={[12.2, 3.0, 2.6]} radius={0.12} smoothness={2} position={[-2.15, 2.62, 0]} material={MAT.white} castShadow receiveShadow />
      <Box s={[12.24, 0.42, 2.64]} p={[-2.15, 1.38, 0]} m={cm.stripe} cast={false} />
      <mesh geometry={GEO.plane} material={cm.livery} scale={[6.6, 2.06, 1]} position={[-2.2, 2.85, 1.312]} />
      <mesh geometry={GEO.plane} material={cm.livery} scale={[6.6, 2.06, 1]} position={[-2.2, 2.85, -1.312]} rotation={[0, Math.PI, 0]} />
      <Box s={[0.06, 2.75, 2.42]} p={[-8.27, 2.62, 0]} m={MAT.offWhite} cast={false} />
      <RoundedBox args={[3.4, 2.75, 2.6]} radius={0.22} smoothness={2} position={[6.25, 2.17, 0]} material={cm.cab} castShadow receiveShadow />
      <Box s={[3.44, 0.34, 2.64]} p={[6.25, 1.22, 0]} m={cm.stripe} cast={false} />
      <Box s={[0.1, 1.05, 2.3]} p={[7.96, 2.78, 0]} m={MAT.glass} cast={false} />
      <Box s={[1.05, 0.85, 2.64]} p={[7.15, 2.85, 0]} m={MAT.glass} cast={false} />
      <Box s={[0.3, 0.45, 2.5]} p={[8.02, 0.95, 0]} m={MAT.dark} cast={false} />
      <Box s={[0.08, 0.22, 0.42]} p={[8.0, 1.5, 0.85]} m={MAT.light} cast={false} />
      <Box s={[0.08, 0.22, 0.42]} p={[8.0, 1.5, -0.85]} m={MAT.light} cast={false} />
      {wheels.map(([x, z], i) => (
        <mesh key={i} geometry={GEO.wheel} material={MAT.tire} position={[x, 0.52, z]} castShadow />
      ))}
    </group>
  );
}

// ---- pallet ---------------------------------------------------------------------------------
export type PalletLook = 'cardboard' | 'white' | 'blue';

export function palletLook(icon: SkuIcon): PalletLook {
  if (icon === 'container' || icon === 'gloves') return 'blue';
  if (icon === 'water' || icon === 'peas') return 'white';
  return 'cardboard';
}

let cardboardMat: THREE.Material | null = null;
const cardboardMaterial = () => (cardboardMat ??= new THREE.MeshStandardMaterial({ map: cardboard(), roughness: 0.85 }));

/** Wooden pallet with a load, footprint ≈ 1.2 × 1.0 m, origin at ground centre. */
export function PalletModel({ look }: { look: PalletLook }) {
  const load = look === 'cardboard' ? cardboardMaterial() : look === 'blue' ? MAT.crate : MAT.wrapWhite;
  return (
    <group>
      <Box s={[1.2, 0.14, 1.0]} p={[0, 0.07, 0]} m={MAT.wood} />
      <Box s={[1.12, 0.98, 0.94]} p={[0, 0.63, 0]} m={load} />
      {look === 'blue' && <Box s={[1.14, 0.05, 0.96]} p={[0, 0.62, 0]} m={MAT.dark} cast={false} />}
    </group>
  );
}

// ---- forklift -------------------------------------------------------------------------------
/** Forklift, forks toward +x, origin at ground centre. */
export function ForkliftModel({ carrying, look }: { carrying: boolean; look?: PalletLook }) {
  const forkY = carrying ? 0.5 : 0.16;
  return (
    <group>
      <Box s={[1.9, 0.9, 1.2]} p={[0, 0.78, 0]} m={MAT.yellow} />
      <Box s={[0.6, 1.0, 1.24]} p={[-0.86, 0.86, 0]} m={MAT.yellowDark} />
      <Box s={[0.5, 0.24, 0.6]} p={[-0.25, 1.35, 0]} m={MAT.blue} />
      <Box s={[0.12, 0.55, 0.6]} p={[-0.52, 1.6, 0]} m={MAT.blue} />
      <Box s={[0.36, 0.56, 0.46]} p={[-0.2, 1.76, 0]} m={MAT.orange} />
      <mesh geometry={GEO.sphere} material={MAT.skin} scale={0.19} position={[-0.17, 2.2, 0]} castShadow />
      {[0.45, -0.75].map((x) =>
        [0.52, -0.52].map((z) => <Box key={`${x}${z}`} s={[0.07, 1.3, 0.07]} p={[x, 1.88, z]} m={MAT.dark} />),
      )}
      <Box s={[1.32, 0.06, 1.16]} p={[-0.15, 2.54, 0]} m={MAT.dark} />
      <Box s={[0.1, 2.4, 0.1]} p={[1.05, 1.32, 0.33]} m={MAT.dark} />
      <Box s={[0.1, 2.4, 0.1]} p={[1.05, 1.32, -0.33]} m={MAT.dark} />
      <Box s={[0.06, 0.6, 0.8]} p={[1.13, forkY + 0.3, 0]} m={MAT.dark} />
      <Box s={[1.15, 0.06, 0.13]} p={[1.7, forkY, 0.3]} m={MAT.dark} />
      <Box s={[1.15, 0.06, 0.13]} p={[1.7, forkY, -0.3]} m={MAT.dark} />
      {[0.6, -0.6].map((x) =>
        [0.62, -0.62].map((z) => <mesh key={`${x}${z}`} geometry={GEO.smallWheel} material={MAT.tire} position={[x, 0.28, z]} />),
      )}
      {carrying && (
        <group position={[1.72, forkY + 0.03, 0]} scale={0.92}>
          <PalletModel look={look ?? 'cardboard'} />
        </group>
      )}
    </group>
  );
}

// ---- location pin ---------------------------------------------------------------------------
export function Pin({ height = 4.2, scale = 1 }: { height?: number; scale?: number }) {
  const ref = useRef<THREE.Group>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.position.y = height + Math.sin(clock.elapsedTime * 2 + phase) * 0.18;
  });
  return (
    <group ref={ref} scale={scale}>
      <mesh geometry={GEO.sphere} material={MAT.pin} scale={0.85} castShadow />
      <mesh geometry={GEO.cone} material={MAT.pin} scale={[0.62, 1.3, 0.62]} position={[0, -0.95, 0]} rotation={[Math.PI, 0, 0]} castShadow />
      <mesh geometry={GEO.sphere} material={MAT.pinDot} scale={[0.34, 0.34, 0.9]} />
    </group>
  );
}

export { GEO, Box };
