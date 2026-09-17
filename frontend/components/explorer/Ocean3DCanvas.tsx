"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { FloatSummaryItem, ArgoFloat, OceanRegion, TrajectoryPoint } from "@/lib/types";
import {
  Plus,
  Minus,
  Crosshair,
  Globe as GlobeIcon,
  RotateCcw,
  Maximize2,
  Compass as CompassIcon,
  ArrowRight,
} from "lucide-react";

export interface Ocean3DCanvasRef {
  resetView: () => void;
  focusIndianOcean: () => void;
  fitAllFloats: () => void;
  focusRegion: (region: string) => void;
}

interface Ocean3DCanvasProps {
  floats: (FloatSummaryItem | ArgoFloat | any)[];
  selectedFloat: FloatSummaryItem | ArgoFloat | any | null;
  onSelectFloat: (argoFloat: any) => void;
  selectedRegion: OceanRegion | "All" | string;
  selectedVariable?: string;
  trajectories?: TrajectoryPoint[];
}

interface GeoLabel {
  name: string;
  lat: number;
  lon: number;
  type: "ocean" | "continent" | "country" | "sea";
  maxDist: number;
}

const REGION_COORDINATES: Record<string, { lat: number; lon: number }> = {
  "Global Ocean": { lat: 10, lon: 75 },
  "Indian Ocean": { lat: -5, lon: 75 },
  "Bay of Bengal": { lat: 14, lon: 88 },
  "Arabian Sea": { lat: 15, lon: 64 },
  "South China Sea": { lat: 14, lon: 114 },
  "Western Pacific": { lat: 10, lon: 135 },
  "Eastern Pacific": { lat: 0, lon: -110 },
  "Western Atlantic": { lat: 25, lon: -70 },
  "Eastern Atlantic": { lat: 15, lon: -25 },
  "Southern Ocean": { lat: -55, lon: 75 },
  "Arctic Ocean": { lat: 75, lon: 0 },
  "Mediterranean Sea": { lat: 35, lon: 18 },
};

const GLOBE_LABELS: GeoLabel[] = [
  // Major Oceans (Visible at all zoom levels up to maxDist 65)
  { name: "INDIAN OCEAN", lat: -10, lon: 78, type: "ocean", maxDist: 65 },
  { name: "PACIFIC OCEAN", lat: 0, lon: 165, type: "ocean", maxDist: 65 },
  { name: "ATLANTIC OCEAN", lat: 0, lon: -30, type: "ocean", maxDist: 65 },
  { name: "SOUTHERN OCEAN", lat: -60, lon: 75, type: "ocean", maxDist: 65 },

  // Continents (Visible up to maxDist 65)
  { name: "ASIA", lat: 38, lon: 95, type: "continent", maxDist: 65 },
  { name: "AFRICA", lat: 5, lon: 22, type: "continent", maxDist: 65 },
  { name: "EUROPE", lat: 50, lon: 15, type: "continent", maxDist: 65 },
  { name: "AUSTRALIA", lat: -25, lon: 134, type: "continent", maxDist: 65 },

  // Major Countries & Seas (Visible at medium zoom <= 52)
  { name: "INDIA", lat: 20.5, lon: 78.9, type: "country", maxDist: 52 },
  { name: "CHINA", lat: 35.8, lon: 104.1, type: "country", maxDist: 52 },
  { name: "SAUDI ARABIA", lat: 23.8, lon: 45.0, type: "country", maxDist: 52 },
  { name: "BAY OF BENGAL", lat: 14.0, lon: 88.0, type: "sea", maxDist: 52 },
  { name: "ARABIAN SEA", lat: 15.0, lon: 64.0, type: "sea", maxDist: 52 },

  // Regional Countries & Seas (Visible at close zoom <= 42)
  { name: "Sri Lanka", lat: 7.8, lon: 80.7, type: "country", maxDist: 42 },
  { name: "Bangladesh", lat: 23.8, lon: 90.3, type: "country", maxDist: 42 },
  { name: "Myanmar", lat: 19.8, lon: 96.1, type: "country", maxDist: 42 },
  { name: "Pakistan", lat: 30.3, lon: 69.3, type: "country", maxDist: 42 },
  { name: "Oman", lat: 21.5, lon: 57.0, type: "country", maxDist: 42 },
  { name: "Indonesia", lat: -0.78, lon: 113.9, type: "country", maxDist: 42 },
  { name: "South China Sea", lat: 14.0, lon: 114.0, type: "sea", maxDist: 42 },
  { name: "Madagascar", lat: -18.7, lon: 46.8, type: "country", maxDist: 42 },
];

function getFloatId(f: any): string {
  return String(f.float_id || f.id || f.wmo || "Unknown");
}

function getFloatLat(f: any): number {
  return f.latest_latitude ?? f.lat ?? 0;
}

function getFloatLon(f: any): number {
  return f.latest_longitude ?? f.lon ?? 0;
}

function getFloatDepth(f: any): number {
  return f.max_depth || f.depth || 1000;
}

// Convert Geographic (Lat, Lon) to 3D Sphere Vector3
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

// Get marker color by float depth/variable
function getFloatMarkerColor(floatItem: any): string {
  if (floatItem.currentAnomaly?.isAnomalous) return "#FBBF24"; // Amber anomaly
  const depth = getFloatDepth(floatItem);
  if (depth <= 200) return "#22D3EE"; // 0-200m Bright cyan
  if (depth <= 500) return "#38BDF8"; // 200-500m Ocean blue
  if (depth <= 1000) return "#14B8A6"; // 500-1000m Deep teal
  return "#FBBF24"; // 1000-2000m Warm amber/gold
}

const Ocean3DCanvas = forwardRef<Ocean3DCanvasRef, Ocean3DCanvasProps>(
  ({ floats, selectedFloat, onSelectFloat, selectedRegion, selectedVariable, trajectories }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const labelsContainerRef = useRef<HTMLDivElement>(null);

    const [hoveredFloat, setHoveredFloat] = useState<any | null>(null);
    const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

    // Camera animation target state
    const targetCameraRotRef = useRef<{ lat: number; lon: number; dist: number } | null>(null);

    // Internal Three.js references
    const controlsRef = useRef<{
      resetView: () => void;
      focusIndianOcean: () => void;
      fitAllFloats: () => void;
      focusRegion: (region: string) => void;
      zoomIn: () => void;
      zoomOut: () => void;
    }>({
      resetView: () => {},
      focusIndianOcean: () => {},
      fitAllFloats: () => {},
      focusRegion: () => {},
      zoomIn: () => {},
      zoomOut: () => {},
    });

    useImperativeHandle(ref, () => ({
      resetView: () => controlsRef.current.resetView(),
      focusIndianOcean: () => controlsRef.current.focusIndianOcean(),
      fitAllFloats: () => controlsRef.current.fitAllFloats(),
      focusRegion: (r: string) => controlsRef.current.focusRegion(r),
    }));

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const GLOBE_RADIUS = 15;

      // 1. Scene, Camera & WebGL Renderer
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x020917, 0.008);

      const camera = new THREE.PerspectiveCamera(
        45,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
      );

      // Default Camera position focusing Indian Ocean (Lat 10°N, Lon 75°E)
      let camLat = 10;
      let camLon = 75;
      let targetCamLat = 10;
      let targetCamLon = 75;

      let camDist = 42;
      let targetCamDist = 42;

      const updateCameraPosition = () => {
        const pos = latLonToVector3(camLat, camLon, camDist);
        camera.position.copy(pos);
        camera.lookAt(0, 0, 0);
      };
      updateCameraPosition();

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.35;
      container.appendChild(renderer.domElement);

      // 2. Realistic & Vibrant Lighting Setup
      const ambientLight = new THREE.AmbientLight(0x406585, 2.5);
      scene.add(ambientLight);

      const mainSun = new THREE.DirectionalLight(0xfff5e6, 3.2);
      mainSun.position.set(50, 30, 50);
      scene.add(mainSun);

      const backLight = new THREE.DirectionalLight(0x0284c7, 1.4);
      backLight.position.set(-50, -20, -50);
      scene.add(backLight);

      // 3. Genuine NASA Blue Marble Satellite Earth Mesh with Vibrant Emissive Lift
      const textureLoader = new THREE.TextureLoader();
      const earthTexture = textureLoader.load("/assets/earth_blue_marble.jpg");
      const specularTexture = textureLoader.load("/assets/earth_specular.jpg");

      const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
      const globeMat = new THREE.MeshPhongMaterial({
        map: earthTexture,
        specularMap: specularTexture,
        specular: new THREE.Color(0x38bdf8),
        shininess: 25,
        emissive: new THREE.Color(0x0c2540),
        emissiveIntensity: 0.38,
      });
      const globeMesh = new THREE.Mesh(globeGeo, globeMat);
      scene.add(globeMesh);

      // 4. Outer Glowing Atmosphere Halo Mesh
      const atmosGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.035, 64, 64);
      const atmosMat = new THREE.ShaderMaterial({
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          void main() {
            float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
            gl_FragColor = vec4(0.08, 0.78, 0.98, 1.0) * intensity;
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
        transparent: true,
      });
      const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
      scene.add(atmosMesh);

      // 5. Equatorial Orbital Dashed Ring
      const ringPoints: THREE.Vector3[] = [];
      for (let i = 0; i <= 120; i++) {
        const theta = (i / 120) * Math.PI * 2;
        ringPoints.push(new THREE.Vector3(Math.cos(theta) * 19, 0, Math.sin(theta) * 19));
      }
      const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPoints);
      const ringMat = new THREE.LineDashedMaterial({
        color: 0x38bdf8,
        dashSize: 0.8,
        gapSize: 0.6,
        opacity: 0.35,
        transparent: true,
      });
      const ringLine = new THREE.Line(ringGeo, ringMat);
      ringLine.computeLineDistances();
      scene.add(ringLine);

      // 6. Real ARGO Float Markers Group
      const markersGroup = new THREE.Group();
      scene.add(markersGroup);

      const markerObjects: { mesh: THREE.Group; floatData: any }[] = [];

      // Filter floats by region
      const visibleFloats = floats.filter((f) => {
        if (selectedRegion !== "All" && selectedRegion !== "Indian Ocean" && f.region !== selectedRegion) {
          return false;
        }
        return true;
      });

      visibleFloats.forEach((f) => {
        const lat = getFloatLat(f);
        const lon = getFloatLon(f);

        const pos = latLonToVector3(lat, lon, GLOBE_RADIUS + 0.25);
        const floatGroup = new THREE.Group();
        floatGroup.position.copy(pos);

        floatGroup.lookAt(pos.clone().multiplyScalar(2));

        const isSelected = selectedFloat && getFloatId(selectedFloat) === getFloatId(f);
        const hexColorStr = getFloatMarkerColor(f);
        const hexColor = parseInt(hexColorStr.replace("#", "0x"), 16);

        // Core Marker Sphere (Clean 3D Sphere Geometry)
        const pinRadius = isSelected ? 0.52 : 0.38;
        const pinGeo = new THREE.SphereGeometry(pinRadius, 16, 16);
        const pinMat = new THREE.MeshBasicMaterial({ color: isSelected ? 0xffffff : hexColor });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        floatGroup.add(pinMesh);

        // Subtle Outer Glow Ring matching color
        const haloRadius = isSelected ? 0.85 : 0.62;
        const haloGeo = new THREE.RingGeometry(pinRadius * 1.15, haloRadius, 24);
        const haloMat = new THREE.MeshBasicMaterial({
          color: hexColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: isSelected ? 0.9 : 0.45,
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        floatGroup.add(haloMesh);

        // Distinct Selection Outline Ring (Cyan/White)
        if (isSelected) {
          const selectRingGeo = new THREE.RingGeometry(0.9, 1.25, 32);
          const selectRingMat = new THREE.MeshBasicMaterial({
            color: 0x22d3ee,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
          });
          const selectRingMesh = new THREE.Mesh(selectRingGeo, selectRingMat);
          floatGroup.add(selectRingMesh);
        }

        // Vertical Laser Depth Probe Line into Earth
        const probePoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2.5)];
        const probeGeo = new THREE.BufferGeometry().setFromPoints(probePoints);
        const probeMat = new THREE.LineBasicMaterial({
          color: isSelected ? 0x22d3ee : hexColor,
          opacity: 0.65,
          transparent: true,
        });
        const probeLine = new THREE.Line(probeGeo, probeMat);
        floatGroup.add(probeLine);

        markersGroup.add(floatGroup);
        markerObjects.push({ mesh: floatGroup, floatData: f });
      });

      // 7. Raycasting & User-Controlled Pointer Interaction (No Auto-Rotation by Default)
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();

      let isPointerDown = false;
      let dragMoved = false;
      let dragDistance = 0;
      let lastPointerPos = { x: 0, y: 0 };

      const domEl = renderer.domElement;

      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        if ((e.target as HTMLElement).closest("button")) return;

        isPointerDown = true;
        dragMoved = false;
        dragDistance = 0;
        lastPointerPos = { x: e.clientX, y: e.clientY };

        try {
          domEl.setPointerCapture(e.pointerId);
        } catch (_) {}
      };

      const onPointerMove = (e: PointerEvent) => {
        const rect = domEl.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        if (isPointerDown) {
          const deltaX = e.clientX - lastPointerPos.x;
          const deltaY = e.clientY - lastPointerPos.y;

          const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          dragDistance += dist;
          if (dragDistance > 4) {
            dragMoved = true;
          }

          // Direct User Drag Rotation Sensitivity
          const rotSpeed = 0.25;
          targetCamLon -= deltaX * rotSpeed;
          targetCamLat = Math.max(-80, Math.min(80, targetCamLat + deltaY * rotSpeed));

          lastPointerPos = { x: e.clientX, y: e.clientY };
          return;
        }

        // Raycast against float markers for hover tooltip
        raycaster.setFromCamera(mouse, camera);
        const hitMeshes = markerObjects.flatMap((m) => m.mesh.children);
        const intersects = raycaster.intersectObjects(hitMeshes);

        if (intersects.length > 0) {
          const matched = markerObjects.find((m) =>
            m.mesh.children.some((c) => c === intersects[0].object)
          );
          if (matched) {
            setHoveredFloat(matched.floatData);
            setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            domEl.style.cursor = "pointer";
            return;
          }
        }
        setHoveredFloat(null);
        setTooltipPos(null);
        domEl.style.cursor = "default";
      };

      const onPointerUp = (e: PointerEvent) => {
        if (!isPointerDown) return;
        isPointerDown = false;
        try {
          domEl.releasePointerCapture(e.pointerId);
        } catch (_) {}
      };

      const onClick = (e: MouseEvent) => {
        if (dragMoved || dragDistance > 4) return; // Prevent accidental float selection while dragging

        const rect = domEl.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const hitMeshes = markerObjects.flatMap((m) => m.mesh.children);
        const intersects = raycaster.intersectObjects(hitMeshes);

        if (intersects.length > 0) {
          const matched = markerObjects.find((m) =>
            m.mesh.children.some((c) => c === intersects[0].object)
          );
          if (matched) {
            onSelectFloat(matched.floatData);
          }
        }
      };

      const onWheel = (e: WheelEvent) => {
        e.preventDefault();
        // Normalize wheel delta across mouse devices and trackpads
        const normalizedDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 40);
        targetCamDist = Math.max(22, Math.min(65, targetCamDist + normalizedDelta * 0.08));
      };

      domEl.addEventListener("pointerdown", onPointerDown);
      domEl.addEventListener("pointermove", onPointerMove);
      domEl.addEventListener("pointerup", onPointerUp);
      domEl.addEventListener("pointercancel", onPointerUp);
      domEl.addEventListener("click", onClick);
      domEl.addEventListener("wheel", onWheel, { passive: false });

      // Controls methods for ref
      controlsRef.current = {
        resetView: () => {
          targetCameraRotRef.current = { lat: 10, lon: 75, dist: 42 };
        },
        focusIndianOcean: () => {
          targetCameraRotRef.current = { lat: 5, lon: 75, dist: 35 };
        },
        fitAllFloats: () => {
          if (visibleFloats.length === 0) {
            targetCameraRotRef.current = { lat: 10, lon: 75, dist: 42 };
            return;
          }
          let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
          visibleFloats.forEach((f) => {
            const lat = getFloatLat(f);
            const lon = getFloatLon(f);
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
          });
          const centerLat = (minLat + maxLat) / 2;
          const centerLon = (minLon + maxLon) / 2;
          targetCameraRotRef.current = { lat: centerLat, lon: centerLon, dist: 36 };
        },
        focusRegion: (reg: string) => {
          const coords = REGION_COORDINATES[reg] || { lat: 10, lon: 75 };
          targetCameraRotRef.current = { lat: coords.lat, lon: coords.lon, dist: 34 };
        },
        zoomIn: () => {
          targetCamDist = Math.max(22, targetCamDist - 6);
        },
        zoomOut: () => {
          targetCamDist = Math.min(65, targetCamDist + 6);
        },
      };

      // 8. Animation Loop & Projected 2D Geo Label Positioning
      let animId: number;
      let clock = new THREE.Clock();

      const animate = () => {
        const elapsed = clock.getElapsedTime();

        if (targetCameraRotRef.current) {
          const target = targetCameraRotRef.current;
          targetCamLat = target.lat;
          targetCamLon = target.lon;
          targetCamDist = target.dist;

          camLat += (targetCamLat - camLat) * 0.1;
          camLon += (targetCamLon - camLon) * 0.1;
          camDist += (targetCamDist - camDist) * 0.1;
          updateCameraPosition();

          if (
            Math.abs(camLat - target.lat) < 0.1 &&
            Math.abs(camLon - target.lon) < 0.1 &&
            Math.abs(camDist - target.dist) < 0.1
          ) {
            targetCameraRotRef.current = null;
          }
        } else {
          // Smooth direct lerp to user target positions (Globe remains stationary when untouched)
          camLat += (targetCamLat - camLat) * 0.15;
          camLon += (targetCamLon - camLon) * 0.15;
          camDist += (targetCamDist - camDist) * 0.15;
          updateCameraPosition();
        }

        // High-performance 60fps 2D Geo Label Projection & Occlusion
        if (labelsContainerRef.current) {
          const children = labelsContainerRef.current.children;
          GLOBE_LABELS.forEach((label, idx) => {
            const el = children[idx] as HTMLElement;
            if (!el) return;

            // Zoom-based distance check
            if (camDist > (label.maxDist || 70)) {
              el.style.opacity = "0";
              return;
            }

            const pos = latLonToVector3(label.lat, label.lon, GLOBE_RADIUS + 0.15);
            const normal = pos.clone().normalize();
            const camDir = camera.position.clone().sub(pos).normalize();
            const dot = normal.dot(camDir);

            // Hide labels on the back side of the Earth curve
            if (dot < 0.15) {
              el.style.opacity = "0";
              return;
            }

            const proj = pos.clone().project(camera);
            const x = ((proj.x + 1) * container.clientWidth) / 2;
            const y = ((-proj.y + 1) * container.clientHeight) / 2;

            el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0)`;
            const fade = Math.min(1, Math.max(0, (dot - 0.15) * 3));
            el.style.opacity = String(fade * 0.9);
          });
        }

        // Pulse float marker halos
        markerObjects.forEach((m, idx) => {
          const halo = m.mesh.children[1] as THREE.Mesh;
          if (halo) {
            const scale = 1 + Math.sin(elapsed * 3 + idx) * 0.15;
            halo.scale.set(scale, scale, 1);
          }
        });

        renderer.render(scene, camera);
        animId = requestAnimationFrame(animate);
      };

      animate();

      const handleResize = () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        domEl.removeEventListener("pointerdown", onPointerDown);
        domEl.removeEventListener("pointermove", onPointerMove);
        domEl.removeEventListener("pointerup", onPointerUp);
        domEl.removeEventListener("pointercancel", onPointerUp);
        domEl.removeEventListener("click", onClick);
        domEl.removeEventListener("wheel", onWheel);
        cancelAnimationFrame(animId);
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    }, [floats, selectedFloat, selectedRegion, onSelectFloat]);

    return (
      <div className="relative w-full h-full min-h-[440px] rounded-2xl overflow-hidden select-none bg-[#031B35] border border-cyan-500/30 shadow-2xl">
        {/* DEEP OCEAN RADIAL BACKDROP GLOW BEHIND THE GLOBE */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_rgba(8,126,164,0.38)_0%,_rgba(6,59,99,0.32)_30%,_rgba(3,27,53,0.75)_65%,_rgba(6,20,38,0.98)_100%)]" />

        {/* VIGNETTE EDGE OVERLAY */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(2,9,23,0.85)] rounded-2xl z-10" />

        {/* PROJECTED 2D GEOGRAPHIC LABELS OVERLAY LAYER */}
        <div ref={labelsContainerRef} className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {GLOBE_LABELS.map((label, i) => (
            <div
              key={i}
              className={`absolute top-0 left-0 transition-opacity duration-150 whitespace-nowrap font-mono-sci uppercase tracking-wider font-bold select-none ${
                label.type === "ocean"
                  ? "text-[11px] text-cyan-200/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] italic tracking-widest"
                  : label.type === "continent"
                  ? "text-[12px] text-amber-200/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)] tracking-widest font-extrabold"
                  : label.type === "sea"
                  ? "text-[10px] text-sky-300/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] italic"
                  : "text-[10px] text-slate-100 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
              }`}
              style={{ opacity: 0 }}
            >
              {label.name}
            </div>
          ))}
        </div>

        {/* Three.js Canvas Container */}
        <div ref={containerRef} className="w-full h-full relative z-0" />

        {/* TOP-LEFT OVERLAY CONTROLS */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
          <button
            onClick={() => controlsRef.current.zoomIn()}
            className="w-8 h-8 rounded-xl bg-[#04162e]/85 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-200 hover:text-white flex items-center justify-center backdrop-blur-md transition-all shadow-lg"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => controlsRef.current.zoomOut()}
            className="w-8 h-8 rounded-xl bg-[#04162e]/85 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-200 hover:text-white flex items-center justify-center backdrop-blur-md transition-all shadow-lg"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => controlsRef.current.focusIndianOcean()}
            className="w-8 h-8 rounded-xl bg-[#04162e]/85 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-200 hover:text-white flex items-center justify-center backdrop-blur-md transition-all shadow-lg"
            title="Recenter Camera"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            onClick={() => controlsRef.current.resetView()}
            className="w-8 h-8 rounded-xl bg-[#04162e]/85 hover:bg-cyan-900/60 border border-cyan-500/30 text-cyan-200 hover:text-white flex items-center justify-center backdrop-blur-md transition-all shadow-lg"
            title="Global World View"
          >
            <GlobeIcon className="w-4 h-4" />
          </button>
        </div>

        {/* TOP-RIGHT OVERLAY ACTION BUTTONS */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={() => controlsRef.current.resetView()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#04162e]/85 hover:bg-cyan-900/70 border border-cyan-500/30 text-xs font-semibold text-cyan-200 hover:text-white backdrop-blur-md transition-all shadow-lg"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
          <button
            onClick={() => controlsRef.current.focusIndianOcean()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#04162e]/85 hover:bg-cyan-900/70 border border-cyan-500/30 text-xs font-semibold text-cyan-200 hover:text-white backdrop-blur-md transition-all shadow-lg"
          >
            <span>Focus: Indian Ocean</span>
          </button>
          <button
            onClick={() => controlsRef.current.fitAllFloats()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#04162e]/85 hover:bg-cyan-900/70 border border-cyan-500/30 text-xs font-semibold text-cyan-200 hover:text-white backdrop-blur-md transition-all shadow-lg"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Fit All Floats</span>
          </button>
        </div>

        {/* TOP-RIGHT COMPASS ROSE */}
        <div className="absolute top-16 right-4 z-10 opacity-70 pointer-events-none">
          <div className="w-12 h-12 rounded-full border border-cyan-400/40 flex items-center justify-center relative bg-[#04162e]/40 backdrop-blur-sm">
            <span className="absolute top-0.5 text-[9px] font-bold text-cyan-300 font-mono-sci">N</span>
            <span className="absolute bottom-0.5 text-[8px] font-bold text-slate-400 font-mono-sci">S</span>
            <span className="absolute left-1 text-[8px] font-bold text-slate-400 font-mono-sci">W</span>
            <span className="absolute right-1 text-[8px] font-bold text-slate-400 font-mono-sci">E</span>
            <CompassIcon className="w-5 h-5 text-cyan-400/60" />
          </div>
        </div>

        {/* BOTTOM-LEFT FLOAT DEPTH LEGEND */}
        <div className="absolute bottom-4 left-4 z-20 p-3 rounded-2xl bg-[#04162e]/90 backdrop-blur-md border border-cyan-500/30 text-xs text-slate-200 space-y-1.5 shadow-2xl w-48">
          <span className="font-bold text-cyan-300 text-[11px] block font-mono-sci uppercase tracking-wider">
            Float Depth
          </span>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22D3EE] shadow-[0_0_8px_#22D3EE]" />
              <span>0 – 200 m</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
              <span>200 – 500 m</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6] shadow-[0_0_8px_#14B8A6]" />
              <span>500 – 1000 m</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FBBF24] shadow-[0_0_8px_#FBBF24]" />
              <span>1000 – 2000 m</span>
            </div>
          </div>
        </div>

        {/* BOTTOM-CENTER INSTRUCTION BAR */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-1.5 rounded-full bg-[#04162e]/90 backdrop-blur-md border border-cyan-500/30 text-[11px] text-cyan-200 flex items-center gap-2 shadow-xl pointer-events-none">
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>Drag to rotate • Scroll to zoom • Click on a float to view details</span>
        </div>

        {/* HOVERED FLOAT TOOLTIP CARD MATCHING REFERENCE SCREENSHOT */}
        {hoveredFloat && tooltipPos && (
          <div
            className="absolute z-30 p-3 rounded-xl bg-[#041836]/95 backdrop-blur-xl border border-cyan-400/60 shadow-2xl pointer-events-none text-xs text-white space-y-0.5 min-w-[190px]"
            style={{
              left: Math.min(tooltipPos.x + 12, window.innerWidth - 240),
              top: Math.max(tooltipPos.y - 75, 10),
            }}
          >
            <div className="flex items-center gap-1.5 font-bold text-cyan-300 font-mono-sci">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>WMO #{getFloatId(hoveredFloat)}</span>
            </div>
            <p className="text-slate-300 text-[11px]">Region: {hoveredFloat.region}</p>
            <p className="text-[10px] text-slate-400 font-mono-sci">
              Lat: {getFloatLat(hoveredFloat).toFixed(2)}°N Lon: {getFloatLon(hoveredFloat).toFixed(2)}°E
            </p>
            <p className="text-[10px] text-slate-400 font-mono-sci">
              Depth: {getFloatDepth(hoveredFloat)} m
            </p>
            <p className="text-[10px] text-slate-400 font-mono-sci">
              Last: {hoveredFloat.last_observation?.substring(0, 10) || "2024-10-17"}
            </p>
            <p className="text-[10.5px] text-cyan-400 font-semibold pt-1 flex items-center gap-1">
              <span>Click to view profile</span>
              <ArrowRight className="w-3 h-3" />
            </p>
          </div>
        )}
      </div>
    );
  }
);

Ocean3DCanvas.displayName = "Ocean3DCanvas";

export default Ocean3DCanvas;
