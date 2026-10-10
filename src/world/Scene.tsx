import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { SITES } from '../data/sites';
import { SIM_MIN_PER_SEC, useApp, world } from '../store';
import { step } from '../sim/engine';
import { City } from './City';
import { SiteModel } from './SiteModel';
import { AmbientTraffic, SimForklifts, SimTrucks, StagedPallets } from './Dynamic';
import { Markers } from './Markers';
import { CameraRig } from './CameraRig';

const MAX_SUBSTEP = 0.05; // simulated minutes

/** Advances the simulation inside the render loop and throttles UI updates. */
function SimDriver() {
  const acc = useRef(0);
  useFrame((_, delta) => {
    const s = useApp.getState();
    if (s.connection === 'live') {
      let dt = Math.min(delta, 0.25) * SIM_MIN_PER_SEC;
      while (dt > 0) {
        const d = Math.min(MAX_SUBSTEP, dt);
        step(world, d);
        dt -= d;
      }
    }
    acc.current += delta;
    if (acc.current > 0.4 || world.roster !== s.roster) {
      acc.current = 0;
      s.setTick();
    }
  }, -1);
  return null;
}

function Sun() {
  const light = useRef<THREE.DirectionalLight>(null);
  const controls = useThree((s) => s.controls) as unknown as { getTarget?: (v: THREE.Vector3) => THREE.Vector3; distance?: number } | null;
  const scene = useThree((s) => s.scene);
  const target = useRef(new THREE.Vector3());
  useEffect(() => {
    if (light.current) scene.add(light.current.target);
  }, [scene]);
  useFrame(() => {
    const l = light.current;
    if (!l || !controls?.getTarget) return;
    controls.getTarget(target.current);
    const far = (controls.distance ?? 150) > 420;
    l.castShadow = !far;
    const t = target.current;
    l.position.set(t.x - 70, 150, t.z + 95);
    l.target.position.set(t.x, 0, t.z);
    l.target.updateMatrixWorld();
  });
  return (
    <directionalLight
      ref={light}
      intensity={2.1}
      color="#FFFFFF"
      castShadow
      shadow-mapSize={[2048, 2048]}
      shadow-camera-left={-130}
      shadow-camera-right={130}
      shadow-camera-top={130}
      shadow-camera-bottom={-130}
      shadow-camera-near={10}
      shadow-camera-far={420}
      shadow-bias={-0.0004}
      shadow-normalBias={0.04}
    />
  );
}

/** Fog starts beyond the area in view, so the wide network overview stays clear. */
function FogByDistance() {
  const controls = useThree((s) => s.controls) as unknown as { distance?: number } | null;
  const scene = useThree((s) => s.scene);
  useFrame(() => {
    const fog = scene.fog as THREE.Fog | null;
    if (!fog || controls?.distance === undefined) return;
    fog.near = Math.max(700, controls.distance * 0.95);
    fog.far = Math.max(1900, controls.distance * 2.4);
  });
  return null;
}

function PointerMissGuard() {
  // Clicking empty ground clears the selection (PRD §10.1), but not after a drag.
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    let down: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      (el as HTMLCanvasElement & { __wasDrag?: boolean }).__wasDrag = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5;
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
    };
  }, [gl]);
  return null;
}

/** Dev builds only: expose the renderer and scene for headless checks. */
function DevHandle() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const controls = useThree((s) => s.controls);
  useEffect(() => {
    if (import.meta.env.DEV) Object.assign(window, { __three: { gl, scene, controls } });
  }, [gl, scene, controls]);
  return null;
}

export function Scene() {
  return (
    <Canvas
      shadows="soft"
      dpr={[1, 1.75]}
      camera={{ fov: 34, near: 1, far: 4000, position: [100, 160, 120] }}
      gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.0 }}
      onPointerMissed={(e) => {
        const el = e.target as HTMLCanvasElement & { __wasDrag?: boolean };
        if (el?.__wasDrag) return;
        useApp.getState().clearSelection();
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <color attach="background" args={['#EDF1FA']} />
      <fog attach="fog" args={['#EDF1FA', 700, 1900]} />
      <hemisphereLight args={['#FFFFFF', '#C3D0EE', 1.45]} />
      <ambientLight intensity={0.25} />
      <Sun />
      <FogByDistance />
      <SimDriver />
      <PointerMissGuard />
      {import.meta.env.DEV && <DevHandle />}
      <CameraRig />
      <City />
      {SITES.map((s) => (
        <SiteModel key={s.code} site={s} />
      ))}
      <StagedPallets />
      <SimTrucks />
      <SimForklifts />
      <AmbientTraffic />
      <Markers />
    </Canvas>
  );
}
