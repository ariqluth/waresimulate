import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls, CameraControlsImpl } from '@react-three/drei';
import { OVERVIEW_CAMERA, SITE_BY_CODE } from '../data/sites';
import { useApp, view3d, world } from '../store';
import { selectionPosition } from '../sim/pose';

type CamSpec = { azimuth: number; polar: number; distance: number; target: { x: number; z: number } };

function lookAt(c: CameraControlsImpl, spec: CamSpec, animate: boolean) {
  const { azimuth, polar, distance, target } = spec;
  const x = target.x + distance * Math.sin(polar) * Math.sin(azimuth);
  const y = distance * Math.cos(polar);
  const z = target.z + distance * Math.sin(polar) * Math.cos(azimuth);
  return c.setLookAt(x, y, z, target.x, 0, target.z, animate);
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function CameraRig() {
  const ref = useRef<CameraControlsImpl>(null);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const tmp = useRef(new THREE.Vector3());

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const A = CameraControlsImpl.ACTION;
    c.mouseButtons.left = A.TRUCK;
    c.mouseButtons.right = A.ROTATE;
    c.mouseButtons.middle = A.DOLLY;
    c.mouseButtons.wheel = A.DOLLY;
    c.touches.one = A.TOUCH_TRUCK;
    c.touches.two = A.TOUCH_DOLLY_ROTATE;
    c.verticalDragToForward = true;
    c.minPolarAngle = 0.3;
    c.maxPolarAngle = 1.22;
    c.minDistance = 16;
    c.maxDistance = 1700;
    c.smoothTime = 0.38;
    c.draggingSmoothTime = 0.1;
    c.dollySpeed = 0.7;
    camera.near = 1;
    camera.far = 4000;
    camera.updateProjectionMatrix();
    const v = useApp.getState().view;
    lookAt(c, v === 'ALL' ? OVERVIEW_CAMERA : SITE_BY_CODE[v].camera, false);
    const stop = () => useApp.getState().stopFollow();
    c.addEventListener('controlstart', stop);
    return () => c.removeEventListener('controlstart', stop);
  }, [camera]);

  useEffect(
    () =>
      useApp.subscribe((s, prev) => {
        const cmd = s.camCmd;
        const c = ref.current;
        if (!cmd || cmd === prev.camCmd || !c) return;
        const animate = !reducedMotion();
        switch (cmd.type) {
          case 'site':
            lookAt(c, SITE_BY_CODE[cmd.code].camera, animate && !cmd.instant);
            break;
          case 'overview':
            lookAt(c, OVERVIEW_CAMERA, animate);
            break;
          case 'home': {
            const v = s.view;
            lookAt(c, v === 'ALL' ? OVERVIEW_CAMERA : SITE_BY_CODE[v].camera, animate);
            break;
          }
          case 'zoom':
            c.dolly(c.distance * 0.2 * cmd.dir, animate);
            break;
          case 'rotate':
            c.rotate((cmd.dir * Math.PI) / 4, 0, animate);
            break;
          case 'locate': {
            const p = selectionPosition(world, s.selection, world.time);
            if (!p) {
              const v = s.view;
              lookAt(c, v === 'ALL' ? OVERVIEW_CAMERA : SITE_BY_CODE[v].camera, animate);
              break;
            }
            c.moveTo(p.x, 0, p.z, animate);
            if (c.distance > 110) c.dollyTo(85, animate);
            break;
          }
        }
      }),
    [],
  );

  useFrame(() => {
    const s = useApp.getState();
    const c = ref.current;
    if (c) view3d.azimuth = c.azimuthAngle;
    if (!c || !s.follow || !s.selection) return;
    const p = selectionPosition(world, s.selection, world.time);
    if (!p) return;
    c.getTarget(tmp.current);
    if (Math.hypot(tmp.current.x - p.x, tmp.current.z - p.z) > 0.05) c.moveTo(p.x, 0, p.z, true);
  });

  return <CameraControls ref={ref} makeDefault />;
}
