// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// Every vehicle of the fleet in one 3D view, with its trail. Positions are
// the vehicles' global positions in the fleet's common ENU frame (px4Fleet),
// since each PX4's local frame starts where that vehicle booted.

import { Button, useTheme } from "@mui/material";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import Panel from "@lichtblick/suite-base/components/Panel";
import PanelToolbar from "@lichtblick/suite-base/components/PanelToolbar";
import Stack from "@lichtblick/suite-base/components/Stack";
import { Fleet, Reference, hasFix, toEnu } from "@lichtblick/suite-base/panels/shared/px4Fleet";
import { useFleet } from "@lichtblick/suite-base/panels/shared/useFleet";
import { SaveConfig } from "@lichtblick/suite-base/types/panels";

const TRAIL_POINTS = 3000;
// a trail point every this many meters of movement
const TRAIL_STEP_M = 0.2;

type Drawn = {
  group: THREE.Group;
  trail: THREE.Line;
  trailPositions: Float32Array;
  trailCount: number;
  last?: THREE.Vector3;
};

function colorOf(sysid: number): THREE.Color {
  return new THREE.Color().setHSL(((sysid * 137.508) % 360) / 360, 0.75, 0.55);
}

function makeLabel(text: string, color: THREE.Color): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 48;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "bold 32px sans-serif";
  ctx.fillStyle = `#${color.getHexString()}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 64, 24);
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }),
  );
  sprite.scale.set(2.4, 0.9, 1);
  sprite.position.set(0, 0, 1.4);
  return sprite;
}

function makeVehicle(sysid: number, scene: THREE.Scene): Drawn {
  const color = colorOf(sysid);
  const group = new THREE.Group();
  // a cone pointing along +x: the heading
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.4, 16),
    new THREE.MeshStandardMaterial({ color }),
  );
  cone.rotation.z = -Math.PI / 2;
  group.add(cone, makeLabel(String(sysid), color));
  const trailPositions = new Float32Array(TRAIL_POINTS * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
  geometry.setDrawRange(0, 0);
  const trail = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color }));
  trail.frustumCulled = false;
  scene.add(group, trail);
  return { group, trail, trailPositions, trailCount: 0 };
}

function pushTrail(d: Drawn, p: THREE.Vector3): void {
  if (d.last && d.last.distanceTo(p) < TRAIL_STEP_M) {
    return;
  }
  if (d.trailCount === TRAIL_POINTS) {
    // drop the oldest half: keeps the cost of a full trail rare
    d.trailPositions.copyWithin(0, (TRAIL_POINTS / 2) * 3);
    d.trailCount = TRAIL_POINTS / 2;
  }
  d.trailPositions.set([p.x, p.y, p.z], d.trailCount * 3);
  d.trailCount += 1;
  d.last = p.clone();
  const attr = d.trail.geometry.getAttribute("position") as THREE.BufferAttribute;
  attr.needsUpdate = true;
  d.trail.geometry.setDrawRange(0, d.trailCount);
}

type View = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  drawn: Map<number, Drawn>;
};

function update(view: View, fleet: Fleet, ref: Reference | undefined): void {
  if (!ref) {
    return;
  }
  for (const v of fleet.values()) {
    if (!hasFix(v)) {
      continue;
    }
    let d = view.drawn.get(v.sysid);
    if (!d) {
      d = makeVehicle(v.sysid, view.scene);
      view.drawn.set(v.sysid, d);
    }
    const p = new THREE.Vector3(...toEnu(v.lat, v.lon, v.alt, ref));
    d.group.position.copy(p);
    if (v.yaw != undefined) {
      d.group.rotation.z = v.yaw;
    }
    pushTrail(d, p);
  }
}

function fit(view: View): void {
  const box = new THREE.Box3();
  for (const d of view.drawn.values()) {
    box.expandByPoint(d.group.position);
  }
  if (box.isEmpty()) {
    return;
  }
  const center = box.getCenter(new THREE.Vector3());
  const size = Math.max(10, box.getSize(new THREE.Vector3()).length());
  view.controls.target.copy(center);
  view.camera.position.set(center.x - size, center.y - size, center.z + size);
  view.controls.update();
}

type Config = Record<string, never>;
type Props = { config: Config; saveConfig: SaveConfig<Config> };

function Fleet3DPanel(_props: Props): React.JSX.Element {
  const theme = useTheme();
  const { fleet, version, ref } = useFleet();
  const host = useRef<HTMLDivElement>(ReactNull);
  const view = useRef<View | undefined>();
  const fitted = useRef(false);

  useEffect(() => {
    const el = host.current;
    if (!el) {
      return;
    }
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
    camera.up.set(0, 0, 1);
    camera.position.set(-30, -30, 25);
    const controls = new OrbitControls(camera, renderer.domElement);
    const grid = new THREE.GridHelper(400, 80, 0x888888, 0x444444);
    grid.rotation.x = Math.PI / 2;
    scene.add(grid, new THREE.AxesHelper(3), new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(30, -20, 50);
    scene.add(sun);
    view.current = { renderer, scene, camera, controls, drawn: new Map() };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let frame = requestAnimationFrame(function loop() {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(loop);
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      el.removeChild(renderer.domElement);
      view.current = undefined;
    };
  }, []);

  useEffect(() => {
    if (view.current) {
      view.current.scene.background = new THREE.Color(theme.palette.background.default);
    }
  }, [theme.palette.background.default]);

  useEffect(() => {
    if (!view.current) {
      return;
    }
    update(view.current, fleet, ref);
    if (!fitted.current && view.current.drawn.size > 0) {
      fitted.current = true;
      fit(view.current);
    }
  }, [fleet, ref, version]);

  return (
    <Stack fullHeight>
      <PanelToolbar />
      <Stack flex="auto" position="relative">
      <div ref={host} style={{ position: "absolute", inset: 0 }} />
      <Stack direction="row" gap={1} padding={1} position="absolute" style={{ top: 0, right: 0 }}>
        <Button size="small" variant="contained" onClick={() => {
            if (view.current) {
              fit(view.current);
            }
          }}>
          Fit all
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            for (const d of view.current?.drawn.values() ?? []) {
              d.trailCount = 0;
              d.last = undefined;
              d.trail.geometry.setDrawRange(0, 0);
            }
          }}
        >
          Clear trails
        </Button>
      </Stack>
      </Stack>
    </Stack>
  );
}

Fleet3DPanel.panelType = "Fleet3D";
Fleet3DPanel.defaultConfig = {};

export default Panel(Fleet3DPanel);
