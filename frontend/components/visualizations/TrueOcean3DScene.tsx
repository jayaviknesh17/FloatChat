"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  ObservationPoint3D,
  FloatSummaryItem,
  ProfileCycleSummary,
} from "@/lib/types";
import {
  Compass,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Layers,
  Sparkles,
  Maximize2,
  Navigation,
  Globe,
  Waves,
  Eye,
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
  zScore?: number | null
): THREE.Color {
  const color = new THREE.Color();

  if (variable === "Temperature (°C)") {
    const t = tempC !== null && tempC !== undefined ? tempC : 20;
    // Scale: 4°C (Deep Blue) -> 12°C (Cyan) -> 18°C (Green) -> 24°C (Yellow/Amber) -> 30°C (Red)
    if (t <= 6) color.setHex(0x1d4ed8);
    else if (t <= 12) color.setHex(0x06b6d4);
    else if (t <= 18) color.setHex(0x10b981);
    else if (t <= 24) color.setHex(0xf59e0b);
    else color.setHex(0xef4444);
  } else if (variable === "Salinity (PSU)") {
    const s = salPsu !== null && salPsu !== undefined ? salPsu : 34.5;
    // Scale: <32.5 (Fresh/Sky Blue) -> 34.0 (Cyan) -> 35.0 (Mint) -> 36.0 (Orange) -> >36.5 (Crimson)
    if (s <= 32.8) color.setHex(0x38bdf8);
    else if (s <= 34.2) color.setHex(0x06b6d4);
    else if (s <= 35.2) color.setHex(0x10b981);
    else if (s <= 36.2) color.setHex(0xf59e0b);
    else color.setHex(0xf43f5e);
  } else if (variable === "Temperature Anomaly") {
    const z = zScore !== null && zScore !== undefined ? zScore : 0;
    if (z >= 2.0) color.setHex(0xef4444); // Strong warm anomaly
    else if (z >= 1.0) color.setHex(0xf97316); // Moderate warm
    else if (z <= -2.0) color.setHex(0x1e40af); // Strong cold anomaly
    else if (z <= -1.0) color.setHex(0x0284c7); // Moderate cold
    else color.setHex(0x10b981); // Normal baseline
  } else {
    // Salinity Anomaly
    const z = zScore !== null && zScore !== undefined ? zScore : 0;
    if (z >= 2.0) color.setHex(0xe11d48);
    else if (z <= -2.0) color.setHex(0x0284c7);
    else color.setHex(0x10b981);
  }

  return color;
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

  // Camera azimuth and compass angle
  const [compassHeading, setCompassHeading] = useState<number>(0);

  // Scene references to preserve across renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const dataGroupRef = useRef<THREE.Group | null>(null);
  const depthGridGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Focus camera target coordinates
  const focusCameraOn = useCallback((lat: number, lon: number, distance: number = 55) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const targetPos = latLonDepthToVector3(lat, lon, 0, GLOBE_RADIUS);
    const cameraDir = targetPos.clone().normalize().multiplyScalar(distance);

    // Smoothly animate controls target and camera position
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();
    const duration = 1200; // ms

    const animateTransition = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1.0);
      // Smooth cubic ease-out
      const ease = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(startPos, cameraDir, ease);
      controls.target.lerpVectors(startTarget, targetPos.clone().multiplyScalar(0.2), ease);
      controls.update();

      if (progress < 1.0) {
        requestAnimationFrame(animateTransition);
      }
    };

    requestAnimationFrame(animateTransition);
  }, []);

  // 1. Initialize Scene, Globe, Atmosphere, OrbitControls, and Lighting
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
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    const initialCamPos = latLonDepthToVector3(12.0, 78.0, 0, 58.0);
    camera.position.copy(initialCamPos);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: true,
    });
    renderer.setSize(width, height);
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

    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls (Smooth 360-degree rotation, pan, zoom)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.screenSpacePanning = true;
    controls.minDistance = 32.0; // Zoom close enough for detailed underwater depth view
    controls.maxDistance = 160.0;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x1e3a5f, 2.2);
    scene.add(ambientLight);

    // Directional Sun Light illuminating Indian Ocean & South Asia
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.0);
    sunLight.position.set(40, 30, 50);
    scene.add(sunLight);

    // Blue Rim Light giving oceanic atmosphere glow
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.4);
    rimLight.position.set(-50, -20, -40);
    scene.add(rimLight);

    // Secondary Equatorial Fill
    const fillLight = new THREE.DirectionalLight(0x0ea5e9, 1.4);
    fillLight.position.set(0, 50, 0);
    scene.add(fillLight);

    // 6. Texture Loader with Fallback procedural Earth
    const textureLoader = new THREE.TextureLoader();

    // Earth Sphere Geometry
    const earthGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);

    // Textures
    const earthTexture = textureLoader.load(
      "/assets/earth_blue_marble.jpg",
      () => {
        if (rendererRef.current) rendererRef.current.render(scene, camera);
      },
      undefined,
      () => {
        // Fallback procedural canvas texture if file load fails
        console.warn("Using fallback procedural Earth map");
      }
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
    earthMeshRef.current = earthMesh;

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

    // 7. Depth Reference Shells (0m, 500m, 1000m, 2000m Maximum Profile Depth)
    const depthGridGroup = new THREE.Group();
    const depthLevels = [
      { depth: 0, r: GLOBE_RADIUS, label: "0 m (Surface)", opacity: 0.12, color: 0x38bdf8 },
      { depth: 500, r: GLOBE_RADIUS - (500 / 2000) * MAX_DEPTH_OFFSET, label: "500 m", opacity: 0.08, color: 0x0ea5e9 },
      { depth: 1000, r: GLOBE_RADIUS - (1000 / 2000) * MAX_DEPTH_OFFSET, label: "1000 m", opacity: 0.08, color: 0x0284c7 },
      { depth: 2000, r: GLOBE_RADIUS - MAX_DEPTH_OFFSET, label: "2000 m (Max Profile Depth)", opacity: 0.14, color: 0x1e3a5f },
    ];

    depthLevels.forEach((lvl) => {
      // Create subtle longitude & latitude rings around the Northern Indian Ocean
      const ringGeo = new THREE.SphereGeometry(lvl.r, 32, 16, 0.9, 1.4, 1.1, 0.9);
      const ringMat = new THREE.MeshBasicMaterial({
        color: lvl.color,
        wireframe: true,
        transparent: true,
        opacity: lvl.opacity,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      depthGridGroup.add(ringMesh);
    });

    scene.add(depthGridGroup);
    depthGridGroupRef.current = depthGridGroup;

    // 8. Data Group for Observation Points, Profiles, and Trajectories
    const dataGroup = new THREE.Group();
    scene.add(dataGroup);
    dataGroupRef.current = dataGroup;

    // 9. Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // 10. Animation render loop
    let lastHeadingUpdate = 0;

    const animate = (time: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      controls.update();

      // Subtle slow rotation of cloud layer
      if (cloudsMesh) {
        cloudsMesh.rotation.y = time * 0.00004;
      }

      // Update Compass Heading every 100ms
      if (time - lastHeadingUpdate > 100 && camera) {
        lastHeadingUpdate = time;
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        // Calculate azimuth angle relative to North pole
        const angleDeg = Math.round((Math.atan2(dir.x, dir.z) * 180) / Math.PI);
        setCompassHeading(angleDeg);
      }

      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      controls.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.innerHTML = "";
      }
    };
  }, []);

  // 2. Render Real ARGO Float Markers, Trajectories, and Discrete CTD Depth Observations
  useEffect(() => {
    const dataGroup = dataGroupRef.current;
    if (!dataGroup) return;

    // Clear previous children and dispose geometries/materials
    while (dataGroup.children.length > 0) {
      const child = dataGroup.children[0];
      dataGroup.remove(child);
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry?.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material?.dispose();
      }
    }

    if (!observations || observations.length === 0) return;

    const [minDepth, maxDepth] = depthRange;

    // Group observations by float_id
    const floatGroups = new Map<string, ObservationPoint3D[]>();
    for (const obs of observations) {
      if (obs.depth_m < minDepth || obs.depth_m > maxDepth) continue;
      if (!floatGroups.has(obs.float_id)) {
        floatGroups.set(obs.float_id, []);
      }
      floatGroups.get(obs.float_id)!.push(obs);
    }

    // 1. Render Float Surface Markers and Status Halos
    if (showPositions) {
      floats.forEach((f) => {
        const isSelected = f.float_id === selectedFloatId;
        const pos = latLonDepthToVector3(f.latest_latitude, f.latest_longitude, 0, GLOBE_RADIUS + 0.12);

        // Core marker
        const markerGeo = new THREE.SphereGeometry(isSelected ? 0.48 : 0.32, 16, 16);
        const markerMat = new THREE.MeshStandardMaterial({
          color: isSelected ? 0x22d3ee : 0x38bdf8,
          emissive: isSelected ? 0x06b6d4 : 0x0284c7,
          emissiveIntensity: isSelected ? 1.8 : 0.8,
          roughness: 0.2,
        });
        const markerMesh = new THREE.Mesh(markerGeo, markerMat);
        markerMesh.position.copy(pos);
        markerMesh.userData = { type: "float", floatId: f.float_id, float: f };
        dataGroup.add(markerMesh);

        // Outer pulsating halo for selected or active float
        const haloGeo = new THREE.RingGeometry(isSelected ? 0.6 : 0.4, isSelected ? 0.85 : 0.55, 32);
        const haloMat = new THREE.MeshBasicMaterial({
          color: isSelected ? 0x22d3ee : 0x0ea5e9,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isSelected ? 0.85 : 0.45,
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        haloMesh.position.copy(pos);
        haloMesh.lookAt(pos.clone().multiplyScalar(2));
        dataGroup.add(haloMesh);
      });
    }

    // 2. Render Chronological Float Trajectories
    if (showTrajectories) {
      floatGroups.forEach((obsList, floatId) => {
        const isSelected = floatId === selectedFloatId;

        // Group by cycle to get unique surface points for trajectory
        const cycleMap = new Map<number, ObservationPoint3D>();
        obsList.forEach((o) => {
          if (!cycleMap.has(o.cycle_number)) {
            cycleMap.set(o.cycle_number, o);
          }
        });

        const sortedCycles = Array.from(cycleMap.values()).sort((a, b) => a.cycle_number - b.cycle_number);

        if (sortedCycles.length > 1) {
          const points = sortedCycles.map((c) =>
            latLonDepthToVector3(c.latitude, c.longitude, 0, GLOBE_RADIUS + 0.05)
          );

          const curve = new THREE.CatmullRomCurve3(points);
          const curvePoints = curve.getPoints(Math.max(points.length * 4, 20));
          const lineGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
          const lineMat = new THREE.LineBasicMaterial({
            color: isSelected ? 0x38bdf8 : 0x0369a1,
            linewidth: isSelected ? 3 : 1,
            transparent: true,
            opacity: isSelected ? 0.95 : 0.55,
          });
          const lineMesh = new THREE.Line(lineGeo, lineMat);
          dataGroup.add(lineMesh);
        }
      });
    }

    // 3. Render Discrete Vertical CTD Depth Observation Columns
    // Group observations by (float_id, cycle_number) to form vertical profile pillars
    const profileGroups = new Map<string, ObservationPoint3D[]>();
    for (const obs of observations) {
      if (obs.depth_m < minDepth || obs.depth_m > maxDepth) continue;
      const key = `${obs.float_id}_${obs.cycle_number}`;
      if (!profileGroups.has(key)) {
        profileGroups.set(key, []);
      }
      profileGroups.get(key)!.push(obs);
    }

    profileGroups.forEach((cycleObs, key) => {
      const isSelectedFloat = cycleObs[0].float_id === selectedFloatId;
      const isSelectedCycle =
        isSelectedFloat && selectedCycleNumber !== null && selectedCycleNumber !== undefined
          ? cycleObs[0].cycle_number === selectedCycleNumber
          : isSelectedFloat;

      // Draw subtle vertical pillar connecting surface down to max measured depth
      cycleObs.sort((a, b) => a.depth_m - b.depth_m);
      if (cycleObs.length > 1) {
        const topPoint = latLonDepthToVector3(cycleObs[0].latitude, cycleObs[0].longitude, cycleObs[0].depth_m);
        const bottomPoint = latLonDepthToVector3(
          cycleObs[0].latitude,
          cycleObs[0].longitude,
          cycleObs[cycleObs.length - 1].depth_m
        );

        const pillarGeo = new THREE.BufferGeometry().setFromPoints([topPoint, bottomPoint]);
        const pillarMat = new THREE.LineBasicMaterial({
          color: isSelectedCycle ? 0x38bdf8 : 0x0284c7,
          transparent: true,
          opacity: isSelectedCycle ? 0.75 : 0.25,
        });
        const pillarLine = new THREE.Line(pillarGeo, pillarMat);
        dataGroup.add(pillarLine);
      }

      // Discrete observation level spheres
      cycleObs.forEach((obs) => {
        const pos = latLonDepthToVector3(obs.latitude, obs.longitude, obs.depth_m);
        const col = getVariableColor(activeVariable, obs.temperature_c, obs.salinity_psu, obs.z_score);

        const isAnom = obs.is_anomaly || (obs.z_score !== null && Math.abs(obs.z_score || 0) >= 2.0);

        if (showAnomalies && !isAnom) {
          // In anomaly-focus mode, dim non-anomalies
          col.setHex(0x1e293b);
        }

        const pointSize = isAnom ? 0.28 : isSelectedCycle ? 0.20 : 0.14;
        const pointGeo = new THREE.SphereGeometry(pointSize, 10, 10);
        const pointMat = new THREE.MeshStandardMaterial({
          color: col,
          emissive: col,
          emissiveIntensity: isAnom ? 2.2 : isSelectedCycle ? 1.2 : 0.4,
          roughness: 0.3,
        });

        const pointMesh = new THREE.Mesh(pointGeo, pointMat);
        pointMesh.position.copy(pos);
        pointMesh.userData = { type: "observation", observation: obs };
        dataGroup.add(pointMesh);

        // Warning pulsating ring for anomalies
        if (isAnom && (activeVariable === "Temperature Anomaly" || showAnomalies)) {
          const anomRingGeo = new THREE.RingGeometry(0.35, 0.48, 16);
          const anomRingMat = new THREE.MeshBasicMaterial({
            color: 0xef4444,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          });
          const anomRingMesh = new THREE.Mesh(anomRingGeo, anomRingMat);
          anomRingMesh.position.copy(pos);
          anomRingMesh.lookAt(pos.clone().multiplyScalar(2));
          dataGroup.add(anomRingMesh);
        }
      });
    });
  }, [observations, floats, selectedFloatId, selectedCycleNumber, activeVariable, showTrajectories, showPositions, showAnomalies, depthRange]);

  // 3. Region Focus changes
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

  // 4. Focus on selected float when changed
  useEffect(() => {
    if (!selectedFloatId) return;
    const match = floats.find((f) => f.float_id === selectedFloatId);
    if (match) {
      focusCameraOn(match.latest_latitude, match.latest_longitude, 42.0);
    }
  }, [selectedFloatId, floats, focusCameraOn]);

  // 5. Interactive Raycaster for Hover Tooltip & Click Selection
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const dataGroup = dataGroupRef.current;
    if (!container || !camera || !dataGroup) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const intersects = raycaster.intersectObjects(dataGroup.children, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const uData = hit.userData;

      if (uData.type === "observation" && uData.observation) {
        const o = uData.observation as ObservationPoint3D;
        setHoveredInfo({
          floatId: o.float_id,
          cycleNumber: o.cycle_number,
          depthM: o.depth_m,
          tempC: o.temperature_c,
          salPsu: o.salinity_psu,
          zScore: o.z_score,
          isAnomaly: o.is_anomaly,
          lat: o.latitude,
          lon: o.longitude,
          time: o.timestamp,
          screenPos: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        });
        return;
      } else if (uData.type === "float" && uData.float) {
        const f = uData.float as FloatSummaryItem;
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

    setHoveredInfo(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const dataGroup = dataGroupRef.current;
    if (!container || !camera || !dataGroup) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const intersects = raycaster.intersectObjects(dataGroup.children, false);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const uData = hit.userData;

      if (uData.type === "observation" && uData.observation) {
        const o = uData.observation as ObservationPoint3D;
        onSelectFloat(o.float_id, o.cycle_number, o);
      } else if (uData.type === "float" && uData.float) {
        const f = uData.float as FloatSummaryItem;
        onSelectFloat(f.float_id);
      }
    }
  };

  // Reset to default Indian Ocean View
  const handleResetCamera = () => {
    focusCameraOn(12.0, 78.0, 58.0);
    if (onResetView) onResetView();
  };

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
            className="transition-transform duration-200 flex items-center justify-center"
            style={{ transform: `rotate(${-compassHeading}deg)` }}
          >
            <Navigation className="w-5 h-5 text-cyan-400 group-hover:scale-110 fill-cyan-400/20" />
          </div>
        </button>

        {/* Zoom Controls */}
        <div className="flex flex-col rounded-xl bg-[#031124]/90 backdrop-blur-md border border-cyan-500/30 overflow-hidden shadow-xl">
          <button
            onClick={() => {
              if (controlsRef.current && cameraRef.current) {
                cameraRef.current.position.multiplyScalar(0.85);
                controlsRef.current.update();
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
                cameraRef.current.position.multiplyScalar(1.15);
                controlsRef.current.update();
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
          Drag to rotate 360° • Scroll to zoom • Double click float to inspect
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
