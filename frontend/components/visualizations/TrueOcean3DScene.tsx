"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  ObservationPoint3D,
  FloatSummaryItem,
} from "@/lib/types";
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Navigation,
  Globe,
  Waves,
} from "lucide-react";

export type ActiveVariable =
  | "Temperature (°C)"
  | "Salinity (PSU)"
  | "Temperature Anomaly"
  | "Salinity Anomaly";

export interface TrueOcean3DSceneProps {
  observations: ObservationPoint3D[];
  floats: FloatSummaryItem[];
  selectedFloatId?: string | null;
  selectedCycleNumber?: number | null;
  onSelectFloat: (floatId: string, cycleNumber?: number, point?: ObservationPoint3D) => void;
  activeVariable: ActiveVariable;
  showTrajectories: boolean;
  showPositions: boolean;
  showAnomalies: boolean;
  depthRange: [number, number]; // [minDepth, maxDepth] e.g. [0, 2000]
  selectedRegion: string;
  onResetView?: () => void;
  isLoading?: boolean;
}

// Convert geographic lat/lon and depth into 3D Spherical coordinates
const GLOBE_RADIUS = 26.0;
const MAX_DEPTH_OFFSET = 2.4; // Max radial displacement for 2000m depth
const MAX_OBS_INSTANCES = 15000;
const MAX_FLOAT_INSTANCES = 100;

export function latLonDepthToVector3(
  lat: number,
  lon: number,
  depthM: number = 0,
  radius: number = GLOBE_RADIUS
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  // Depth pushes inward toward Earth center
  const depthScale = Math.min(Math.max(depthM / 2000, 0), 1.0);
  const r = radius - depthScale * MAX_DEPTH_OFFSET;

  const x = -r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

// Scientific Color Scale Mappers
export function getVariableColor(
  variable: ActiveVariable,
  tempC?: number | null,
  salPsu?: number | null,
  zScore?: number | null,
  targetColor: THREE.Color = new THREE.Color()
): THREE.Color {
  if (variable === "Temperature (°C)") {
    const t = tempC !== null && tempC !== undefined ? tempC : 20;
    // Scale: 4°C (Deep Blue) -> 12°C (Cyan) -> 18°C (Green) -> 24°C (Yellow/Amber) -> 30°C (Red)
    if (t <= 6) targetColor.setHex(0x1d4ed8);
    else if (t <= 12) targetColor.setHex(0x06b6d4);
    else if (t <= 18) targetColor.setHex(0x10b981);
    else if (t <= 24) targetColor.setHex(0xf59e0b);
    else targetColor.setHex(0xef4444);
  } else if (variable === "Salinity (PSU)") {
    const s = salPsu !== null && salPsu !== undefined ? salPsu : 34.5;
    // Scale: <32.5 (Fresh/Sky Blue) -> 34.0 (Cyan) -> 35.0 (Mint) -> 36.0 (Orange) -> >36.5 (Crimson)
    if (s <= 32.8) targetColor.setHex(0x38bdf8);
    else if (s <= 34.2) targetColor.setHex(0x06b6d4);
    else if (s <= 35.2) targetColor.setHex(0x10b981);
    else if (s <= 36.2) targetColor.setHex(0xf59e0b);
    else targetColor.setHex(0xf43f5e);
  } else if (variable === "Temperature Anomaly") {
    const z = zScore !== null && zScore !== undefined ? zScore : 0;
    if (z >= 2.0) targetColor.setHex(0xef4444); // Strong warm anomaly
    else if (z >= 1.0) targetColor.setHex(0xf97316); // Moderate warm
    else if (z <= -2.0) targetColor.setHex(0x1e40af); // Strong cold anomaly
    else if (z <= -1.0) targetColor.setHex(0x0284c7); // Moderate cold
    else targetColor.setHex(0x10b981); // Normal baseline
  } else {
    // Salinity Anomaly
    const z = zScore !== null && zScore !== undefined ? zScore : 0;
    if (z >= 2.0) targetColor.setHex(0xe11d48);
    else if (z <= -2.0) targetColor.setHex(0x0284c7);
    else targetColor.setHex(0x10b981);
  }

  return targetColor;
}

export default function TrueOcean3DScene({
  observations,
  floats,
  selectedFloatId,
  selectedCycleNumber,
  onSelectFloat,
  activeVariable,
  showTrajectories,
  showPositions,
  showAnomalies,
  depthRange,
  selectedRegion,
  onResetView,
  isLoading = false,
}: TrueOcean3DSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const compassNeedleRef = useRef<HTMLDivElement>(null);

  // Hovered observation / float state
  const [hoveredInfo, setHoveredInfo] = useState<{
    floatId: string;
    cycleNumber: number;
    depthM?: number;
    tempC?: number | null;
    salPsu?: number | null;
    zScore?: number | null;
    isAnomaly?: boolean;
    lat: number;
    lon: number;
    time?: string;
    screenPos: { x: number; y: number };
  } | null>(null);

  // Scene references to preserve across renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const transitionAnimIdRef = useRef<number | null>(null);

  // GPU Instanced and Batched Mesh References
  const obsInstancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const floatInstancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const haloInstancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const trajectoryLinesRef = useRef<THREE.LineSegments | null>(null);
  const pillarLinesRef = useRef<THREE.LineSegments | null>(null);

  // Mapping from instance index back to observation / float item for instant raycasting
  const obsIndexMapRef = useRef<ObservationPoint3D[]>([]);
  const floatIndexMapRef = useRef<FloatSummaryItem[]>([]);

  // Reusable reusable Three.js math objects to avoid GC allocation in hot loops
  const dummyRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const tempColorRef = useRef<THREE.Color>(new THREE.Color());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseCoordRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const lastRaycastTimeRef = useRef<number>(0);

  // Smooth camera orientation transition
  const focusCameraOn = useCallback((lat: number, lon: number, distance: number = 55) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (transitionAnimIdRef.current) {
      cancelAnimationFrame(transitionAnimIdRef.current);
      transitionAnimIdRef.current = null;
    }

    const targetPos = latLonDepthToVector3(lat, lon, 0, GLOBE_RADIUS);
    const cameraDir = targetPos.clone().normalize().multiplyScalar(distance);

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const destTarget = targetPos.clone().multiplyScalar(0.12);
    const startTime = performance.now();
    const duration = 1000; // ms

    const animateTransition = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      // Smooth cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startPos, cameraDir, ease);
      controls.target.lerpVectors(startTarget, destTarget, ease);
      controls.update();

      if (progress < 1.0) {
        transitionAnimIdRef.current = requestAnimationFrame(animateTransition);
      } else {
        transitionAnimIdRef.current = null;
      }
    };

    transitionAnimIdRef.current = requestAnimationFrame(animateTransition);
  }, []);

  // 1. Initialize Scene, Globe, Atmosphere, OrbitControls, and Lighting (ONCE)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020814);
    scene.fog = new THREE.FogExp2(0x020814, 0.005);
    sceneRef.current = scene;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 2. Camera setup - Positioned towards Indian Ocean (Lat ~12°N, Lon ~78°E)
    const camera = new THREE.PerspectiveCamera(42, Math.max(width / height, 0.1), 0.1, 1000);
    const initialCamPos = latLonDepthToVector3(12.0, 78.0, 0, 56.0);
    camera.position.copy(initialCamPos);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: true,
      depth: true,
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.outline = "none";
    renderer.domElement.style.pointerEvents = "auto";

    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Tuned OrbitControls (Smooth 360-degree rotation, pan, zoom within bounds)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 28.5; // Zoom safely near surface without entering Earth radius 26.0
    controls.maxDistance = 110.0; // Prevent shrinking to a dot
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x1e3a5f, 2.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 3.0);
    sunLight.position.set(40, 30, 50);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.4);
    rimLight.position.set(-50, -20, -40);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x0ea5e9, 1.4);
    fillLight.position.set(0, 50, 0);
    scene.add(fillLight);

    // 6. Earth Sphere Geometry & Textures
    const textureLoader = new THREE.TextureLoader();
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);

    const earthTexture = textureLoader.load(
      "/assets/earth_blue_marble.jpg",
      () => {
        if (rendererRef.current) rendererRef.current.render(scene, camera);
      },
      undefined,
      () => console.warn("Fallback Earth texture in use")
    );
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const specularMap = textureLoader.load("/assets/earth_specular.jpg");
    const normalMap = textureLoader.load("/assets/earth_normal.jpg");

    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughnessMap: specularMap,
      roughness: 0.65,
      metalness: 0.1,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.6, 0.6),
    });

    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // Atmosphere Glow Layer
    const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.018, 64, 64);
    const atmosMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    // Subtle Cloud Layer
    const cloudsGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.008, 64, 64);
    const cloudsTexture = textureLoader.load("/assets/earth_clouds.png");
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    scene.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // 7. Depth Reference Shells (0m, 500m, 1000m, 2000m)
    const depthGridGroup = new THREE.Group();
    const depthLevels = [
      { depth: 0, r: GLOBE_RADIUS, label: "0 m (Surface)", opacity: 0.12, color: 0x38bdf8 },
      { depth: 500, r: GLOBE_RADIUS - (500 / 2000) * MAX_DEPTH_OFFSET, label: "500 m", opacity: 0.08, color: 0x0ea5e9 },
      { depth: 1000, r: GLOBE_RADIUS - (1000 / 2000) * MAX_DEPTH_OFFSET, label: "1000 m", opacity: 0.08, color: 0x0284c7 },
      { depth: 2000, r: GLOBE_RADIUS - MAX_DEPTH_OFFSET, label: "2000 m", opacity: 0.14, color: 0x1e3a5f },
    ];

    depthLevels.forEach((lvl) => {
      const ringGeo = new THREE.SphereGeometry(lvl.r, 32, 16, 0.9, 1.4, 1.1, 0.9);
      const ringMat = new THREE.MeshBasicMaterial({
        color: lvl.color,
        wireframe: true,
        transparent: true,
        opacity: lvl.opacity,
        depthWrite: false,
      });
      depthGridGroup.add(new THREE.Mesh(ringGeo, ringMat));
    });
    scene.add(depthGridGroup);

    // 8. GPU InstancedMesh Initialization for Observations (Single Draw Call)
    const obsGeo = new THREE.SphereGeometry(0.20, 8, 8);
    const obsMat = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.15,
      toneMapped: true,
    });
    const obsInstancedMesh = new THREE.InstancedMesh(obsGeo, obsMat, MAX_OBS_INSTANCES);
    obsInstancedMesh.count = 0;
    obsInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    obsInstancedMesh.userData = { type: "observations_instanced" };
    scene.add(obsInstancedMesh);
    obsInstancedMeshRef.current = obsInstancedMesh;

    // 9. GPU InstancedMesh for Float Surface Markers
    const floatGeo = new THREE.SphereGeometry(0.40, 12, 12);
    const floatMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const floatInstancedMesh = new THREE.InstancedMesh(floatGeo, floatMat, MAX_FLOAT_INSTANCES);
    floatInstancedMesh.count = 0;
    floatInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    floatInstancedMesh.userData = { type: "floats_instanced" };
    scene.add(floatInstancedMesh);
    floatInstancedMeshRef.current = floatInstancedMesh;

    // 10. GPU InstancedMesh for Float Halos
    const haloGeo = new THREE.RingGeometry(0.5, 0.78, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    const haloInstancedMesh = new THREE.InstancedMesh(haloGeo, haloMat, MAX_FLOAT_INSTANCES);
    haloInstancedMesh.count = 0;
    haloInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(haloInstancedMesh);
    haloInstancedMeshRef.current = haloInstancedMesh;

    // 11. Batched LineSegments for Trajectories & Depth Pillars
    const trajMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      vertexColors: true,
    });
    const trajGeo = new THREE.BufferGeometry();
    const trajectoryLines = new THREE.LineSegments(trajGeo, trajMat);
    scene.add(trajectoryLines);
    trajectoryLinesRef.current = trajectoryLines;

    const pillarMat = new THREE.LineBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.35,
      vertexColors: true,
    });
    const pillarGeo = new THREE.BufferGeometry();
    const pillarLines = new THREE.LineSegments(pillarGeo, pillarMat);
    scene.add(pillarLines);
    pillarLinesRef.current = pillarLines;

    // 12. ResizeObserver for Deterministic Canvas Sizing (No stretching or overflow)
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 0 && h > 0 && camera && renderer) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        }
      }
    });
    resizeObserver.observe(container);

    // 13. High-Performance Render Loop (Zero React Re-renders inside loop)
    let lastCompassUpdate = 0;
    const dirVector = new THREE.Vector3();

    const animate = (time: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      controls.update();

      // Slow cloud movement
      if (cloudsMesh) {
        cloudsMesh.rotation.y = time * 0.00003;
      }

      // Update Compass Needle via Direct DOM transform (Zero React State Thrashing)
      if (time - lastCompassUpdate > 80 && camera && compassNeedleRef.current) {
        lastCompassUpdate = time;
        camera.getWorldDirection(dirVector);
        const angleDeg = Math.round((Math.atan2(dirVector.x, dirVector.z) * 180) / Math.PI);
        compassNeedleRef.current.style.transform = `rotate(${-angleDeg}deg)`;
      }

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (transitionAnimIdRef.current) cancelAnimationFrame(transitionAnimIdRef.current);
      controls.dispose();
      renderer.dispose();
      if (container) {
        container.innerHTML = "";
      }
    };
  }, []);

  // 2. High-Performance Instanced GPU Buffer Synchronization
  useEffect(() => {
    const obsInstanced = obsInstancedMeshRef.current;
    const floatInstanced = floatInstancedMeshRef.current;
    const haloInstanced = haloInstancedMeshRef.current;
    const trajectoryLines = trajectoryLinesRef.current;
    const pillarLines = pillarLinesRef.current;
    const dummy = dummyRef.current;
    const tempColor = tempColorRef.current;

    if (!obsInstanced || !floatInstanced || !haloInstanced || !trajectoryLines || !pillarLines) return;

    const [minDepth, maxDepth] = depthRange;

    // --- A. Populate Observations InstancedMesh (1 Draw Call for 5,000+ points) ---
    const visibleObservations: ObservationPoint3D[] = [];
    let obsCount = 0;

    for (let i = 0; i < observations.length; i++) {
      if (obsCount >= MAX_OBS_INSTANCES) break;
      const obs = observations[i];
      if (obs.depth_m < minDepth || obs.depth_m > maxDepth) continue;

      const isAnom = obs.is_anomaly || (obs.z_score !== null && Math.abs(obs.z_score || 0) >= 2.0);
      if (showAnomalies && !isAnom) continue;

      const isSelectedFloat = obs.float_id === selectedFloatId;
      const isSelectedCycle =
        isSelectedFloat && selectedCycleNumber !== null && selectedCycleNumber !== undefined
          ? obs.cycle_number === selectedCycleNumber
          : isSelectedFloat;

      const pos = latLonDepthToVector3(obs.latitude, obs.longitude, obs.depth_m);
      dummy.position.copy(pos);

      const scale = isAnom ? 1.4 : isSelectedCycle ? 1.15 : 0.8;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      obsInstanced.setMatrixAt(obsCount, dummy.matrix);

      getVariableColor(activeVariable, obs.temperature_c, obs.salinity_psu, obs.z_score, tempColor);
      if (isSelectedCycle) {
        tempColor.offsetHSL(0, 0, 0.15); // Slightly brighter for selected profile
      }
      obsInstanced.setColorAt(obsCount, tempColor);

      visibleObservations.push(obs);
      obsCount++;
    }

    obsInstanced.count = obsCount;
    obsInstanced.instanceMatrix.needsUpdate = true;
    if (obsInstanced.instanceColor) obsInstanced.instanceColor.needsUpdate = true;
    obsIndexMapRef.current = visibleObservations;

    // --- B. Populate Float Surface Markers & Halos InstancedMesh ---
    const visibleFloats: FloatSummaryItem[] = [];
    let floatCount = 0;

    if (showPositions && floats && floats.length > 0) {
      for (let i = 0; i < floats.length; i++) {
        if (floatCount >= MAX_FLOAT_INSTANCES) break;
        const f = floats[i];
        const isSelected = f.float_id === selectedFloatId;
        const pos = latLonDepthToVector3(f.latest_latitude, f.latest_longitude, 0, GLOBE_RADIUS + 0.14);

        dummy.position.copy(pos);
        const scale = isSelected ? 1.35 : 0.9;
        dummy.scale.set(scale, scale, scale);
        dummy.updateMatrix();

        floatInstanced.setMatrixAt(floatCount, dummy.matrix);
        tempColor.setHex(isSelected ? 0x22d3ee : 0x38bdf8);
        floatInstanced.setColorAt(floatCount, tempColor);

        // Halo orientation matching radial surface normal
        dummy.lookAt(pos.clone().multiplyScalar(2));
        dummy.scale.set(isSelected ? 1.25 : 0.85, isSelected ? 1.25 : 0.85, 1);
        dummy.updateMatrix();
        haloInstanced.setMatrixAt(floatCount, dummy.matrix);

        visibleFloats.push(f);
        floatCount++;
      }
    }

    floatInstanced.count = floatCount;
    floatInstanced.instanceMatrix.needsUpdate = true;
    if (floatInstanced.instanceColor) floatInstanced.instanceColor.needsUpdate = true;

    haloInstanced.count = floatCount;
    haloInstanced.instanceMatrix.needsUpdate = true;
    floatIndexMapRef.current = visibleFloats;

    // --- C. Batched Trajectory Line Segments ---
    if (showTrajectories && observations.length > 0) {
      const trajPositions: number[] = [];
      const trajColors: number[] = [];

      // Group by float_id -> unique cycle surface points
      const floatCyclesMap = new Map<string, Map<number, ObservationPoint3D>>();
      for (let i = 0; i < observations.length; i++) {
        const o = observations[i];
        if (!floatCyclesMap.has(o.float_id)) {
          floatCyclesMap.set(o.float_id, new Map());
        }
        const cMap = floatCyclesMap.get(o.float_id)!;
        if (!cMap.has(o.cycle_number) || o.depth_m < cMap.get(o.cycle_number)!.depth_m) {
          cMap.set(o.cycle_number, o);
        }
      }

      floatCyclesMap.forEach((cyclesMap, fid) => {
        const sortedCycles = Array.from(cyclesMap.values()).sort((a, b) => a.cycle_number - b.cycle_number);
        if (sortedCycles.length > 1) {
          const isSelected = fid === selectedFloatId;
          const r = isSelected ? 0.22 : 0.02;
          const g = isSelected ? 0.83 : 0.45;
          const b = isSelected ? 0.97 : 0.75;

          for (let k = 0; k < sortedCycles.length - 1; k++) {
            const p1 = latLonDepthToVector3(sortedCycles[k].latitude, sortedCycles[k].longitude, 0, GLOBE_RADIUS + 0.06);
            const p2 = latLonDepthToVector3(sortedCycles[k + 1].latitude, sortedCycles[k + 1].longitude, 0, GLOBE_RADIUS + 0.06);

            trajPositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
            trajColors.push(r, g, b, r, g, b);
          }
        }
      });

      trajectoryLines.geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(trajPositions, 3)
      );
      trajectoryLines.geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(trajColors, 3)
      );
      trajectoryLines.geometry.computeBoundingSphere();
      trajectoryLines.visible = true;
    } else {
      trajectoryLines.visible = false;
    }

    // --- D. Batched Vertical CTD Profile Pillars ---
    const pillarPositions: number[] = [];
    const pillarColors: number[] = [];

    const cycleDepthBounds = new Map<string, { top: ObservationPoint3D; bottom: ObservationPoint3D }>();
    for (let i = 0; i < observations.length; i++) {
      const o = observations[i];
      if (o.depth_m < minDepth || o.depth_m > maxDepth) continue;
      const key = `${o.float_id}_${o.cycle_number}`;
      if (!cycleDepthBounds.has(key)) {
        cycleDepthBounds.set(key, { top: o, bottom: o });
      } else {
        const b = cycleDepthBounds.get(key)!;
        if (o.depth_m < b.top.depth_m) b.top = o;
        if (o.depth_m > b.bottom.depth_m) b.bottom = o;
      }
    }

    cycleDepthBounds.forEach((b, key) => {
      if (b.top.depth_m !== b.bottom.depth_m) {
        const isSelected = b.top.float_id === selectedFloatId;
        const p1 = latLonDepthToVector3(b.top.latitude, b.top.longitude, b.top.depth_m);
        const p2 = latLonDepthToVector3(b.bottom.latitude, b.bottom.longitude, b.bottom.depth_m);

        pillarPositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        const colR = isSelected ? 0.22 : 0.04;
        const colG = isSelected ? 0.74 : 0.40;
        const colB = isSelected ? 0.97 : 0.70;
        pillarColors.push(colR, colG, colB, colR, colG, colB);
      }
    });

    pillarLines.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(pillarPositions, 3)
    );
    pillarLines.geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(pillarColors, 3)
    );
    pillarLines.geometry.computeBoundingSphere();
  }, [
    observations,
    floats,
    selectedFloatId,
    selectedCycleNumber,
    activeVariable,
    showTrajectories,
    showPositions,
    showAnomalies,
    depthRange,
  ]);

  // 3. Region Focus Changes (Smooth Camera Transition)
  useEffect(() => {
    if (!selectedRegion) return;
    const r = selectedRegion.toLowerCase();
    if (r.includes("bengal") || r === "bay_of_bengal") {
      focusCameraOn(14.0, 88.0, 48.0);
    } else if (r.includes("arabian") || r === "arabian_sea") {
      focusCameraOn(16.0, 66.0, 48.0);
    } else if (r.includes("indian") || r === "indian_ocean") {
      focusCameraOn(10.0, 78.0, 58.0);
    } else {
      // Global
      focusCameraOn(8.0, 78.0, 75.0);
    }
  }, [selectedRegion, focusCameraOn]);

  // 4. Smooth Focus on Selected Float
  useEffect(() => {
    if (!selectedFloatId || !floats) return;
    const match = floats.find((f) => f.float_id === selectedFloatId);
    if (match) {
      focusCameraOn(match.latest_latitude, match.latest_longitude, 42.0);
    }
  }, [selectedFloatId, floats, focusCameraOn]);

  // 5. Throttled Pointer Move & Raycaster for Fast Tooltip (30ms debounce)
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const now = performance.now();
    if (now - lastRaycastTimeRef.current < 30) return; // 30ms throttle
    lastRaycastTimeRef.current = now;

    const container = containerRef.current;
    const camera = cameraRef.current;
    const floatMesh = floatInstancedMeshRef.current;
    const obsMesh = obsInstancedMeshRef.current;
    if (!container || !camera || !floatMesh || !obsMesh) return;

    const rect = container.getBoundingClientRect();
    mouseCoordRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseCoordRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseCoordRef.current, camera);

    // 1. Check Float surface markers first (highest priority)
    if (floatMesh.count > 0) {
      const floatIntersects = raycasterRef.current.intersectObject(floatMesh);
      if (floatIntersects.length > 0 && floatIntersects[0].instanceId !== undefined) {
        const f = floatIndexMapRef.current[floatIntersects[0].instanceId];
        if (f) {
          setHoveredInfo({
            floatId: f.float_id,
            cycleNumber: f.profile_count,
            lat: f.latest_latitude,
            lon: f.latest_longitude,
            time: f.last_observation,
            screenPos: { x: e.clientX - rect.left, y: e.clientY - rect.top },
          });
          return;
        }
      }
    }

    // 2. Check Observation 3D Points InstancedMesh
    if (obsMesh.count > 0) {
      const obsIntersects = raycasterRef.current.intersectObject(obsMesh);
      if (obsIntersects.length > 0 && obsIntersects[0].instanceId !== undefined) {
        const obs = obsIndexMapRef.current[obsIntersects[0].instanceId];
        if (obs) {
          setHoveredInfo({
            floatId: obs.float_id,
            cycleNumber: obs.cycle_number,
            depthM: obs.depth_m,
            tempC: obs.temperature_c,
            salPsu: obs.salinity_psu,
            zScore: obs.z_score,
            isAnomaly: obs.is_anomaly,
            lat: obs.latitude,
            lon: obs.longitude,
            time: obs.timestamp,
            screenPos: { x: e.clientX - rect.left, y: e.clientY - rect.top },
          });
          return;
        }
      }
    }

    setHoveredInfo(null);
  }, []);

  // 6. Click Selection
  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const floatMesh = floatInstancedMeshRef.current;
    const obsMesh = obsInstancedMeshRef.current;
    if (!container || !camera || !floatMesh || !obsMesh) return;

    const rect = container.getBoundingClientRect();
    mouseCoordRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseCoordRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseCoordRef.current, camera);

    // Click Float Marker
    if (floatMesh.count > 0) {
      const floatIntersects = raycasterRef.current.intersectObject(floatMesh);
      if (floatIntersects.length > 0 && floatIntersects[0].instanceId !== undefined) {
        const f = floatIndexMapRef.current[floatIntersects[0].instanceId];
        if (f) {
          onSelectFloat(f.float_id);
          return;
        }
      }
    }

    // Click Observation Point
    if (obsMesh.count > 0) {
      const obsIntersects = raycasterRef.current.intersectObject(obsMesh);
      if (obsIntersects.length > 0 && obsIntersects[0].instanceId !== undefined) {
        const obs = obsIndexMapRef.current[obsIntersects[0].instanceId];
        if (obs) {
          onSelectFloat(obs.float_id, obs.cycle_number, obs);
          return;
        }
      }
    }
  }, [onSelectFloat]);

  // Reset to default Indian Ocean View
  const handleResetCamera = useCallback(() => {
    focusCameraOn(12.0, 78.0, 56.0);
    if (onResetView) onResetView();
  }, [focusCameraOn, onResetView]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#020814] overflow-hidden rounded-2xl cursor-grab active:cursor-grabbing select-none"
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      {/* 1. TOP-LEFT HUD: 3D Globe Navigation & Geographic Orientation */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#031124]/90 backdrop-blur-md border border-cyan-500/30 text-white shadow-xl">
          <Globe className="w-4 h-4 text-cyan-400 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-tight">3D Indian Ocean Globe</span>
            <span className="text-[10px] text-cyan-300/80 font-mono-sci leading-none">
              {selectedRegion || "Indian Ocean Basin"}
            </span>
          </div>
        </div>

        {/* Quick View Presets */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#020b18]/85 backdrop-blur-md border border-cyan-500/20 text-xs">
          <button
            onClick={() => focusCameraOn(14.0, 88.0, 48.0)}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              selectedRegion === "Bay of Bengal"
                ? "bg-cyan-500 text-slate-950 font-bold shadow"
                : "text-slate-300 hover:text-white hover:bg-cyan-950/60"
            }`}
          >
            Bay of Bengal
          </button>
          <button
            onClick={() => focusCameraOn(16.0, 66.0, 48.0)}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              selectedRegion === "Arabian Sea"
                ? "bg-cyan-500 text-slate-950 font-bold shadow"
                : "text-slate-300 hover:text-white hover:bg-cyan-950/60"
            }`}
          >
            Arabian Sea
          </button>
          <button
            onClick={() => focusCameraOn(10.0, 78.0, 58.0)}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              selectedRegion === "Indian Ocean"
                ? "bg-cyan-500 text-slate-950 font-bold shadow"
                : "text-slate-300 hover:text-white hover:bg-cyan-950/60"
            }`}
          >
            Full Basin
          </button>
        </div>
      </div>

      {/* 2. TOP-RIGHT CONTROLS: Compass, Zoom In/Out, Reset View */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end pointer-events-auto">
        {/* Interactive 3D Compass */}
        <button
          onClick={handleResetCamera}
          title="Click to reset camera to Indian Ocean North orientation"
          className="w-10 h-10 rounded-xl bg-[#031124]/90 backdrop-blur-md border border-cyan-500/30 flex items-center justify-center text-cyan-300 shadow-xl hover:border-cyan-400 hover:text-white transition-all group"
        >
          <div
            ref={compassNeedleRef}
            className="transition-transform duration-75 flex items-center justify-center"
          >
            <Navigation className="w-5 h-5 text-cyan-400 group-hover:scale-110 fill-cyan-400/20" />
          </div>
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-xl bg-[#031124]/90 backdrop-blur-md border border-cyan-500/30 overflow-hidden shadow-xl">
          <button
            onClick={() => {
              if (controlsRef.current && cameraRef.current) {
                const newPos = cameraRef.current.position.clone().multiplyScalar(0.85);
                if (newPos.length() >= 28.5) {
                  cameraRef.current.position.copy(newPos);
                  controlsRef.current.update();
                }
              }
            }}
            title="Zoom In"
            className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white hover:bg-cyan-950/60 transition-colors border-b border-cyan-500/20"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (controlsRef.current && cameraRef.current) {
                const newPos = cameraRef.current.position.clone().multiplyScalar(1.15);
                if (newPos.length() <= 110.0) {
                  cameraRef.current.position.copy(newPos);
                  controlsRef.current.update();
                }
              }
            }}
            title="Zoom Out"
            className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white hover:bg-cyan-950/60 transition-colors border-b border-cyan-500/20"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetCamera}
            title="Reset View"
            className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-white hover:bg-cyan-950/60 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. BOTTOM-LEFT DEPTH REFERENCE BADGES */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1 pointer-events-none select-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#020b18]/80 backdrop-blur-sm border border-cyan-500/20 text-[10px] text-cyan-300 font-mono-sci">
          <Waves className="w-3 h-3 text-cyan-400" />
          <span>Underwater 3D Space: 0m → 2000m (Max Profile Depth)</span>
        </div>
        <div className="text-[9px] text-slate-400 font-mono-sci pl-1">
          Drag to rotate 360° • Scroll to zoom • Click float or CTD point to inspect
        </div>
      </div>

      {/* 4. HOVER TOOLTIP */}
      {hoveredInfo && (
        <div
          ref={tooltipRef}
          className="absolute z-30 pointer-events-none p-3 rounded-xl bg-[#031124]/95 backdrop-blur-xl border border-cyan-400/50 shadow-2xl text-xs flex flex-col gap-1 min-w-[200px]"
          style={{
            left: `${Math.min(hoveredInfo.screenPos.x + 12, (containerRef.current?.clientWidth || 600) - 220)}px`,
            top: `${Math.max(hoveredInfo.screenPos.y - 80, 10)}px`,
          }}
        >
          <div className="flex items-center justify-between border-b border-cyan-500/25 pb-1">
            <span className="font-bold text-white flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Float #{hoveredInfo.floatId}
            </span>
            <span className="text-[10px] text-cyan-300 font-mono-sci">
              Cycle {hoveredInfo.cycleNumber}
            </span>
          </div>

          {hoveredInfo.depthM !== undefined && (
            <div className="flex items-center justify-between text-slate-300">
              <span>Depth:</span>
              <span className="font-mono-sci font-bold text-white">
                {hoveredInfo.depthM.toFixed(1)} m
              </span>
            </div>
          )}

          {hoveredInfo.tempC !== undefined && hoveredInfo.tempC !== null && (
            <div className="flex items-center justify-between text-slate-300">
              <span>Temperature:</span>
              <span className="font-mono-sci font-bold text-emerald-400">
                {hoveredInfo.tempC.toFixed(2)} °C
              </span>
            </div>
          )}

          {hoveredInfo.salPsu !== undefined && hoveredInfo.salPsu !== null && (
            <div className="flex items-center justify-between text-slate-300">
              <span>Salinity:</span>
              <span className="font-mono-sci font-bold text-sky-400">
                {hoveredInfo.salPsu.toFixed(2)} PSU
              </span>
            </div>
          )}

          {hoveredInfo.zScore !== undefined && hoveredInfo.zScore !== null && (
            <div className="flex items-center justify-between text-slate-300">
              <span>Statistical Z-Score:</span>
              <span
                className={`font-mono-sci font-bold ${
                  Math.abs(hoveredInfo.zScore) >= 2.0 ? "text-rose-400" : "text-slate-300"
                }`}
              >
                {hoveredInfo.zScore > 0 ? `+${hoveredInfo.zScore.toFixed(2)}` : hoveredInfo.zScore.toFixed(2)}σ
              </span>
            </div>
          )}

          <div className="text-[9px] text-slate-400 font-mono-sci pt-1 border-t border-cyan-500/15">
            {hoveredInfo.lat.toFixed(2)}°N, {hoveredInfo.lon.toFixed(2)}°E • Click to inspect CTD
          </div>
        </div>
      )}

      {/* 5. LOADING OVERLAY */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#020814]/60 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#031124]/90 border border-cyan-500/40 text-cyan-300 shadow-2xl">
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono-sci font-bold">Querying Real ARGO Observations...</span>
          </div>
        </div>
      )}
    </div>
  );
}
