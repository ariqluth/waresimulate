// Building blocks for the hand-made low-poly models of WH-06 (scripts/build-*-glb.mjs). Coordinates
// are the WH-06 local frame in metres with the ground at y = 0, so each model is placed at the site
// origin; plan points are [x, z]. Geometry is flat-shaded and merged into one mesh per material, so a
// model adds few draw calls.
import fs from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Node has Blob but not FileReader, which GLTFExporter uses to pack the binary chunk.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend();
    });
  }
};

export const mat = (name, color, roughness = 0.85) => Object.assign(new THREE.MeshStandardMaterial({ color, roughness }), { name });

export const at = (x, y, z, ry = 0, rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1));

/** n points along a circle from angle t0 (excluded) to t1; angles turn from +x toward +z. */
export const arc = (cx, cz, r, t0, t1, n) =>
  Array.from({ length: n }, (_, i) => {
    const t = t0 + ((i + 1) / n) * (t1 - t0);
    return [cx + r * Math.cos(t), cz + r * Math.sin(t)];
  });

/** A model under construction: shape helpers that queue geometry per material, and `save`. */
export function lowPolyModel(name) {
  const parts = new Map();
  const anchors = [];
  /**
   * An empty node the app dresses at runtime (e.g. a sign texture, which GLTFExporter cannot pack
   * under Node): a w × h rectangle centred at (x, y, z), facing +z turned by ry.
   */
  function anchor(id, x, y, z, w, h, ry = 0) {
    const o = new THREE.Object3D();
    o.name = id;
    o.position.set(x, y, z);
    o.rotation.y = ry;
    o.scale.set(w, h, 1);
    anchors.push(o);
  }
  /** Queue a geometry for its material, flat-shaded (low-poly look). */
  function put(geo, material, matrix) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(matrix ?? new THREE.Matrix4());
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.deleteAttribute('normal');
    g.computeVertexNormals();
    if (!parts.has(material)) parts.set(material, []);
    parts.get(material).push(g);
  }
  /** Box from its x/z extent and height range. */
  const box = (x0, x1, y0, y1, z0, z1, material) =>
    put(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material, at((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  /** Flat horizontal polygon at height y. */
  function flat(points, y, material) {
    const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
    put(new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2), material, at(0, y, 0));
  }
  /** Horizontal slab from y0 to y1 over a polygon. */
  function slab(points, y0, y1, material) {
    const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
    put(new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false }).rotateX(-Math.PI / 2), material, at(0, y0, 0));
  }
  /** Flat band along a polyline, `width(i)` metres wide at point i. */
  function ribbon(pts, width, y, material) {
    const pos = [];
    const side = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const h = width(i) / 2;
      return [(-(b[1] - a[1]) / l) * h, ((b[0] - a[0]) / l) * h];
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i];
      const [bx, bz] = pts[i + 1];
      const [sa, ta] = side[i];
      const [sb, tb] = side[i + 1];
      const L = [ax - sa, y, az - ta];
      const R = [ax + sa, y, az + ta];
      const L2 = [bx - sb, y, bz - tb];
      const R2 = [bx + sb, y, bz + tb];
      pos.push(...L, ...L2, ...R, ...R, ...L2, ...R2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    // Wind every triangle to face up.
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i += 3) {
      const v = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(p, i + k));
      if (new THREE.Vector3().crossVectors(v[1].clone().sub(v[0]), v[2].clone().sub(v[0])).y < 0) {
        p.setXYZ(i + 1, v[2].x, v[2].y, v[2].z);
        p.setXYZ(i + 2, v[1].x, v[1].y, v[1].z);
      }
    }
    put(g, material);
  }
  /** Curb blocks along a closed or open outline, alternating between the two materials. */
  function curb(pts, closed, [first, second]) {
    const ring = closed ? [...pts, pts[0]] : pts;
    let k = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [ax, az] = ring[i];
      const [bx, bz] = ring[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / 1.5));
      const ang = Math.atan2(-(bz - az), bx - ax);
      for (let j = 0; j < n; j++) {
        const u = (j + 0.5) / n;
        put(new THREE.BoxGeometry(len / n, 0.32, 0.42), k++ % 2 ? second : first, at(ax + (bx - ax) * u, 0.16, az + (bz - az) * u, ang));
      }
    }
  }
  const shrub = (x, z, s, leaf) => put(new THREE.IcosahedronGeometry(s, 0), leaf, at(x, s * 0.75, z, x * 1.7));
  function palm(x, z, h, trunk, leaf) {
    put(new THREE.CylinderGeometry(0.16, 0.24, h, 6), trunk, at(x, h / 2, z));
    for (let i = 0; i < 6; i++) put(new THREE.BoxGeometry(2.8, 0.1, 0.7), leaf, at(x, h, z, (i * Math.PI) / 3 + x, 0, -0.35).multiply(at(1.3, 0, 0)));
  }
  /** Merge per material and write public/models/<name>.glb. */
  async function save() {
    const root = new THREE.Group();
    root.name = name;
    let tris = 0;
    for (const [material, geos] of parts) {
      const mesh = new THREE.Mesh(mergeGeometries(geos), material);
      mesh.name = material.name;
      tris += mesh.geometry.attributes.position.count / 3;
      root.add(mesh);
    }
    for (const o of anchors) root.add(o);
    const glb = await new GLTFExporter().parseAsync(root, { binary: true });
    const file = `public/models/${name}.glb`;
    fs.mkdirSync('public/models', { recursive: true });
    fs.writeFileSync(file, Buffer.from(glb));
    console.log(`${file}: ${glb.byteLength} bytes, ${parts.size} meshes, ${tris} triangles`);
  }
  return { put, box, flat, slab, ribbon, curb, shrub, palm, anchor, save };
}
