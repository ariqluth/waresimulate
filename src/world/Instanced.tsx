import { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';

export interface InstanceItem {
  p: [number, number, number];
  s?: [number, number, number];
  r?: number; // rotation about y
  color?: string;
}

/** Static instanced mesh from a list of transforms. */
export function Instanced({
  geometry, material, items, cast = false, receive = true,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  items: InstanceItem[];
  cast?: boolean;
  receive?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const c = new THREE.Color();
    items.forEach((it, i) => {
      e.set(0, it.r ?? 0, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(...it.p), q, new THREE.Vector3(...(it.s ?? [1, 1, 1])));
      mesh.setMatrixAt(i, m);
      if (it.color) mesh.setColorAt(i, c.set(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, items.length]}
      castShadow={cast}
      receiveShadow={receive}
      frustumCulled={false}
    />
  );
}
