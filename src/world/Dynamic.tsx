import { memo, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { SITE_BY_CODE } from '../data/sites';
import { SKUS } from '../data/seed';
import { useApp, world } from '../store';
import { forkliftPose, truckPose } from '../sim/pose';
import { samplePath } from '../sim/path';
import { skuKeyFor } from '../sim/engine';
import { ForkliftModel, Pin, PalletModel, TruckModel, palletLook, type PalletLook } from './models';

const ROAD_Y = 0.18;

function handlers(kind: 'truck' | 'forklift' | 'pallet', id: string) {
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      if (e.delta > 5) return;
      e.stopPropagation();
      useApp.getState().select({ kind, id });
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      useApp.getState().setHover({ kind, id });
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      useApp.getState().setHover(null);
      document.body.style.cursor = '';
    },
  };
}

const SimTruck = memo(function SimTruck({ code }: { code: string }) {
  const ref = useRef<THREE.Group>(null);
  const truck = world.trucks.get(code);
  useFrame(() => {
    const t = world.trucks.get(code);
    const g = ref.current;
    if (!g) return;
    if (!t) {
      g.visible = false;
      return;
    }
    const p = truckPose(t, world.time);
    g.visible = true;
    g.position.set(p.x, ROAD_Y, p.z);
    g.rotation.y = p.angle;
  });
  if (!truck) return null;
  return (
    <group ref={ref} {...handlers('truck', code)}>
      <TruckModel carrier={truck.carrier} />
    </group>
  );
});

function lookOf(palletCode?: string): PalletLook {
  const p = palletCode ? world.pallets.get(palletCode) : undefined;
  return p ? palletLook(SKUS[skuKeyFor(p.sku)].icon) : 'cardboard';
}

const SimForklift = memo(function SimForklift({ code }: { code: string }) {
  const ref = useRef<THREE.Group>(null);
  const [carry, setCarry] = useState<{ on: boolean; look: PalletLook }>({ on: false, look: 'cardboard' });
  useFrame(() => {
    const f = world.forklifts.get(code);
    const g = ref.current;
    if (!f || !g) return;
    const p = forkliftPose(world, f, world.time);
    g.position.set(p.x, 0.3, p.z);
    g.rotation.y = p.angle;
    const look = lookOf(f.carrying);
    if (p.carrying !== carry.on || (p.carrying && look !== carry.look)) setCarry({ on: p.carrying, look });
  });
  return (
    <group ref={ref} {...handlers('forklift', code)}>
      <group scale={1.35}>
        <ForkliftModel carrying={carry.on} look={carry.look} />
      </group>
    </group>
  );
});

export function SimTrucks() {
  useApp((s) => s.roster);
  const codes = [...world.trucks.keys()];
  return (
    <group>
      {codes.map((c) => (
        <SimTruck key={c} code={c} />
      ))}
    </group>
  );
}

export function SimForklifts() {
  const codes = useMemo(() => [...world.forklifts.keys()], []);
  return (
    <group>
      {codes.map((c) => (
        <SimForklift key={c} code={c} />
      ))}
    </group>
  );
}

export function StagedPallets() {
  useApp((s) => s.roster);
  const staged = [...world.pallets.values()].filter((p) => p.status === 'Staged' && p.slot !== undefined);
  return (
    <group>
      {staged.map((p) => {
        const pos = SITE_BY_CODE[p.site].staging[p.slot!];
        const rot = (p.code.charCodeAt(p.code.length - 1) % 4) * 0.08 - 0.12;
        return (
          <group key={p.code} position={[pos.x, 0.3, pos.z]} rotation={[0, rot, 0]} {...handlers('pallet', p.code)}>
            <group scale={1.45}>
              <PalletModel look={palletLook(SKUS[skuKeyFor(p.sku)].icon)} />
            </group>
            {p.pinned && (
              <group position={[0, 0, 0]}>
                <Pin height={4.4} />
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

const AmbientTruck = memo(function AmbientTruck({ index }: { index: number }) {
  const ref = useRef<THREE.Group>(null);
  const [carrier, setCarrier] = useState(world.ambient[index].carrier);
  useFrame(() => {
    const a = world.ambient[index];
    const g = ref.current;
    if (!a || !g) return;
    if (a.carrier !== carrier) setCarrier(a.carrier);
    const p = samplePath(a.path, a.s);
    g.position.set(p.x, ROAD_Y, p.z);
    g.rotation.y = p.angle;
  });
  return (
    <group ref={ref}>
      <TruckModel carrier={carrier} />
    </group>
  );
});

export function AmbientTraffic() {
  return (
    <group>
      {world.ambient.map((a, i) => (
        <AmbientTruck key={a.id} index={i} />
      ))}
    </group>
  );
}
