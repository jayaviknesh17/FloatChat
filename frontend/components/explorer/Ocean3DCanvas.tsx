"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import * as THREE from "three";
import { FloatSummaryItem, ArgoFloat, OceanRegion, TrajectoryPoint } from "@/lib/types";
import { getFloatMarkerColor, normalizeFloatDepth } from "@/lib/depthColor";
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

const REGION_COORDINATES: Record<string, { lat: number; lon: number; dist?: number }> = {
  "Global Ocean": { lat: 10, lon: 75, dist: 42 },
  "global_ocean": { lat: 10, lon: 75, dist: 42 },
  "Indian Ocean": { lat: -10, lon: 75, dist: 36 },
  "indian_ocean": { lat: -10, lon: 75, dist: 36 },
  "Bay of Bengal": { lat: 14, lon: 88, dist: 32 },
  "bay_of_bengal": { lat: 14, lon: 88, dist: 32 },
  "Arabian Sea": { lat: 15, lon: 64, dist: 32 },
  "arabian_sea": { lat: 15, lon: 64, dist: 32 },
  "South China Sea": { lat: 16, lon: 114, dist: 32 },
  "south_china_sea": { lat: 16, lon: 114, dist: 32 },
  "Western Pacific": { lat: 25, lon: 145, dist: 34 },
  "western_pacific": { lat: 25, lon: 145, dist: 34 },
  "Eastern Pacific": { lat: 12, lon: -110, dist: 36 },
  "eastern_pacific": { lat: 12, lon: -110, dist: 36 },
  "Western Atlantic": { lat: 26, lon: -65, dist: 34 },
  "western_atlantic": { lat: 26, lon: -65, dist: 34 },
  "Eastern Atlantic": { lat: -25, lon: 45, dist: 36 },
  "eastern_atlantic": { lat: -25, lon: 45, dist: 36 },
  "Southern Ocean": { lat: -55, lon: 95, dist: 36 },
  "southern_ocean": { lat: -55, lon: 95, dist: 36 },
  "Arctic Ocean": { lat: 72, lon: -15, dist: 36 },
  "arctic_ocean": { lat: 72, lon: -15, dist: 36 },
  "Mediterranean Sea": { lat: 38, lon: 10, dist: 32 },
  "mediterranean_sea": { lat: 38, lon: 10, dist: 32 },
};

const GLOBE_LABELS: GeoLabel[] = [
  // ==================== OCEANS (Visible at all zoom levels) ====================
  { name: "INDIAN OCEAN", lat: -10, lon: 78, type: "ocean", maxDist: 70 },
  { name: "PACIFIC OCEAN", lat: 0, lon: 165, type: "ocean", maxDist: 70 },
  { name: "ATLANTIC OCEAN", lat: 5, lon: -30, type: "ocean", maxDist: 70 },
  { name: "SOUTHERN OCEAN", lat: -60, lon: 75, type: "ocean", maxDist: 70 },
  { name: "ARCTIC OCEAN", lat: 82, lon: 0, type: "ocean", maxDist: 70 },

  // ==================== CONTINENTS (Visible at all zoom levels) ====================
  { name: "ASIA", lat: 38, lon: 95, type: "continent", maxDist: 70 },
  { name: "AFRICA", lat: 5, lon: 22, type: "continent", maxDist: 70 },
  { name: "EUROPE", lat: 50, lon: 15, type: "continent", maxDist: 70 },
  { name: "NORTH AMERICA", lat: 45, lon: -100, type: "continent", maxDist: 70 },
  { name: "SOUTH AMERICA", lat: -15, lon: -60, type: "continent", maxDist: 70 },
  { name: "AUSTRALIA", lat: -25, lon: 134, type: "continent", maxDist: 70 },
  { name: "ANTARCTICA", lat: -80, lon: 0, type: "continent", maxDist: 70 },

  // ==================== MAJOR SEAS & GULFS ====================
  { name: "MEDITERRANEAN SEA", lat: 35.0, lon: 18.0, type: "sea", maxDist: 55 },
  { name: "CARIBBEAN SEA", lat: 15.0, lon: -75.0, type: "sea", maxDist: 55 },
  { name: "SOUTH CHINA SEA", lat: 14.0, lon: 114.0, type: "sea", maxDist: 55 },
  { name: "ARABIAN SEA", lat: 15.0, lon: 64.0, type: "sea", maxDist: 55 },
  { name: "BAY OF BENGAL", lat: 14.0, lon: 88.0, type: "sea", maxDist: 55 },
  { name: "RED SEA", lat: 20.0, lon: 38.0, type: "sea", maxDist: 50 },
  { name: "GULF OF MEXICO", lat: 25.0, lon: -90.0, type: "sea", maxDist: 52 },
  { name: "CORAL SEA", lat: -18.0, lon: 155.0, type: "sea", maxDist: 52 },
  { name: "BERING SEA", lat: 58.0, lon: -175.0, type: "sea", maxDist: 52 },
  { name: "BALTIC SEA", lat: 58.0, lon: 20.0, type: "sea", maxDist: 48 },
  { name: "BLACK SEA", lat: 43.0, lon: 35.0, type: "sea", maxDist: 48 },
  { name: "NORWEGIAN SEA", lat: 68.0, lon: 5.0, type: "sea", maxDist: 52 },
  { name: "TASMAN SEA", lat: -38.0, lon: 160.0, type: "sea", maxDist: 50 },
  { name: "LABRADOR SEA", lat: 58.0, lon: -55.0, type: "sea", maxDist: 50 },

  // ==================== AFRICA COUNTRIES ====================
  { name: "NIGERIA", lat: 9.08, lon: 8.68, type: "country", maxDist: 58 },
  { name: "SOUTH AFRICA", lat: -30.56, lon: 22.94, type: "country", maxDist: 58 },
  { name: "EGYPT", lat: 26.82, lon: 30.80, type: "country", maxDist: 58 },
  { name: "ALGERIA", lat: 28.03, lon: 1.66, type: "country", maxDist: 58 },
  { name: "KENYA", lat: -1.29, lon: 36.82, type: "country", maxDist: 58 },
  { name: "ETHIOPIA", lat: 9.15, lon: 40.49, type: "country", maxDist: 58 },
  { name: "DR CONGO", lat: -4.03, lon: 21.76, type: "country", maxDist: 58 },
  { name: "Morocco", lat: 31.79, lon: -7.09, type: "country", maxDist: 46 },
  { name: "Tanzania", lat: -6.37, lon: 34.89, type: "country", maxDist: 46 },
  { name: "Angola", lat: -11.20, lon: 17.87, type: "country", maxDist: 46 },
  { name: "Sudan", lat: 12.86, lon: 30.22, type: "country", maxDist: 46 },
  { name: "Ghana", lat: 7.95, lon: -1.03, type: "country", maxDist: 46 },
  { name: "Madagascar", lat: -18.77, lon: 46.87, type: "country", maxDist: 46 },
  { name: "Mozambique", lat: -18.67, lon: 35.53, type: "country", maxDist: 46 },
  { name: "Cameroon", lat: 7.37, lon: 12.35, type: "country", maxDist: 46 },
  { name: "Senegal", lat: 14.50, lon: -14.45, type: "country", maxDist: 46 },
  { name: "Tunisia", lat: 33.88, lon: 9.53, type: "country", maxDist: 46 },
  { name: "Somalia", lat: 5.15, lon: 46.20, type: "country", maxDist: 46 },
  { name: "Libya", lat: 26.33, lon: 17.23, type: "country", maxDist: 46 },
  { name: "Zambia", lat: -13.13, lon: 27.85, type: "country", maxDist: 46 },
  { name: "Ivory Coast", lat: 7.54, lon: -5.55, type: "country", maxDist: 46 },
  { name: "Zimbabwe", lat: -19.01, lon: 29.15, type: "country", maxDist: 46 },

  // ==================== SOUTH AMERICA COUNTRIES ====================
  { name: "BRAZIL", lat: -14.24, lon: -51.92, type: "country", maxDist: 58 },
  { name: "ARGENTINA", lat: -38.41, lon: -63.61, type: "country", maxDist: 58 },
  { name: "COLOMBIA", lat: 4.57, lon: -74.30, type: "country", maxDist: 58 },
  { name: "PERU", lat: -9.19, lon: -75.01, type: "country", maxDist: 58 },
  { name: "CHILE", lat: -35.67, lon: -71.54, type: "country", maxDist: 58 },
  { name: "Venezuela", lat: 6.42, lon: -66.59, type: "country", maxDist: 46 },
  { name: "Ecuador", lat: -1.83, lon: -78.18, type: "country", maxDist: 46 },
  { name: "Bolivia", lat: -16.29, lon: -63.58, type: "country", maxDist: 46 },
  { name: "Paraguay", lat: -23.44, lon: -58.44, type: "country", maxDist: 46 },
  { name: "Uruguay", lat: -32.52, lon: -55.76, type: "country", maxDist: 46 },
  { name: "Guyana", lat: 4.86, lon: -58.93, type: "country", maxDist: 46 },

  // ==================== NORTH AMERICA & CENTRAL AMERICA COUNTRIES ====================
  { name: "UNITED STATES", lat: 37.09, lon: -95.71, type: "country", maxDist: 58 },
  { name: "CANADA", lat: 56.13, lon: -106.35, type: "country", maxDist: 58 },
  { name: "MEXICO", lat: 23.63, lon: -102.55, type: "country", maxDist: 58 },
  { name: "Cuba", lat: 21.52, lon: -77.78, type: "country", maxDist: 46 },
  { name: "Jamaica", lat: 18.11, lon: -77.30, type: "country", maxDist: 46 },
  { name: "Guatemala", lat: 15.78, lon: -90.23, type: "country", maxDist: 46 },
  { name: "Costa Rica", lat: 9.74, lon: -83.75, type: "country", maxDist: 46 },
  { name: "Panama", lat: 8.53, lon: -80.78, type: "country", maxDist: 46 },
  { name: "Dominican Rep.", lat: 18.73, lon: -70.16, type: "country", maxDist: 46 },
  { name: "Greenland", lat: 71.70, lon: -42.60, type: "country", maxDist: 46 },

  // ==================== EUROPE COUNTRIES ====================
  { name: "UNITED KINGDOM", lat: 55.37, lon: -3.43, type: "country", maxDist: 58 },
  { name: "FRANCE", lat: 46.22, lon: 2.21, type: "country", maxDist: 58 },
  { name: "GERMANY", lat: 51.16, lon: 10.45, type: "country", maxDist: 58 },
  { name: "SPAIN", lat: 40.46, lon: -3.74, type: "country", maxDist: 58 },
  { name: "ITALY", lat: 41.87, lon: 12.56, type: "country", maxDist: 58 },
  { name: "NORWAY", lat: 60.47, lon: 8.46, type: "country", maxDist: 58 },
  { name: "TURKEY", lat: 38.96, lon: 35.24, type: "country", maxDist: 58 },
  { name: "Sweden", lat: 60.12, lon: 18.64, type: "country", maxDist: 46 },
  { name: "Poland", lat: 51.91, lon: 19.14, type: "country", maxDist: 46 },
  { name: "Ukraine", lat: 48.37, lon: 31.16, type: "country", maxDist: 46 },
  { name: "Greece", lat: 39.07, lon: 21.82, type: "country", maxDist: 46 },
  { name: "Portugal", lat: 39.40, lon: -8.22, type: "country", maxDist: 46 },
  { name: "Ireland", lat: 53.14, lon: -7.69, type: "country", maxDist: 46 },
  { name: "Netherlands", lat: 52.13, lon: 5.29, type: "country", maxDist: 46 },
  { name: "Finland", lat: 61.92, lon: 25.74, type: "country", maxDist: 46 },
  { name: "Iceland", lat: 64.96, lon: -19.02, type: "country", maxDist: 46 },
  { name: "Romania", lat: 45.94, lon: 24.96, type: "country", maxDist: 46 },
  { name: "Switzerland", lat: 46.81, lon: 8.22, type: "country", maxDist: 46 },
  { name: "Austria", lat: 47.51, lon: 14.55, type: "country", maxDist: 46 },

  // ==================== ASIA COUNTRIES ====================
  { name: "INDIA", lat: 20.59, lon: 78.96, type: "country", maxDist: 58 },
  { name: "CHINA", lat: 35.86, lon: 104.19, type: "country", maxDist: 58 },
  { name: "RUSSIA", lat: 61.52, lon: 105.31, type: "country", maxDist: 58 },
  { name: "JAPAN", lat: 36.20, lon: 138.25, type: "country", maxDist: 58 },
  { name: "SAUDI ARABIA", lat: 23.88, lon: 45.07, type: "country", maxDist: 58 },
  { name: "INDONESIA", lat: -0.78, lon: 113.92, type: "country", maxDist: 58 },
  { name: "PAKISTAN", lat: 30.37, lon: 69.34, type: "country", maxDist: 58 },
  { name: "IRAN", lat: 32.42, lon: 53.68, type: "country", maxDist: 58 },
  { name: "South Korea", lat: 35.90, lon: 127.76, type: "country", maxDist: 46 },
  { name: "Vietnam", lat: 14.05, lon: 108.27, type: "country", maxDist: 46 },
  { name: "Thailand", lat: 15.87, lon: 100.99, type: "country", maxDist: 46 },
  { name: "Malaysia", lat: 4.21, lon: 101.97, type: "country", maxDist: 46 },
  { name: "Philippines", lat: 12.87, lon: 121.77, type: "country", maxDist: 46 },
  { name: "Myanmar", lat: 21.91, lon: 95.95, type: "country", maxDist: 46 },
  { name: "Bangladesh", lat: 23.68, lon: 90.35, type: "country", maxDist: 46 },
  { name: "Sri Lanka", lat: 7.87, lon: 80.77, type: "country", maxDist: 46 },
  { name: "Iraq", lat: 33.22, lon: 43.67, type: "country", maxDist: 46 },
  { name: "UAE", lat: 23.42, lon: 53.84, type: "country", maxDist: 46 },
  { name: "Oman", lat: 21.51, lon: 55.92, type: "country", maxDist: 46 },
  { name: "Kazakhstan", lat: 48.01, lon: 66.92, type: "country", maxDist: 46 },
  { name: "Uzbekistan", lat: 41.37, lon: 64.58, type: "country", maxDist: 46 },
  { name: "Nepal", lat: 28.39, lon: 84.12, type: "country", maxDist: 46 },
  { name: "Taiwan", lat: 23.69, lon: 120.96, type: "country", maxDist: 46 },

  // ==================== OCEANIA & PACIFIC ====================
  { name: "AUSTRALIA", lat: -25.27, lon: 133.77, type: "country", maxDist: 58 },
  { name: "NEW ZEALAND", lat: -40.90, lon: 174.88, type: "country", maxDist: 58 },
  { name: "Papua New Guinea", lat: -6.31, lon: 143.95, type: "country", maxDist: 46 },
  { name: "Fiji", lat: -17.71, lon: 178.06, type: "country", maxDist: 46 },
  { name: "Hawaii", lat: 19.89, lon: -155.58, type: "country", maxDist: 46 },
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
  const norm = normalizeFloatDepth(f);
  return norm !== null ? Math.round(norm) : 0;
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
      renderer.toneMappingExposure = 1.45;
      container.appendChild(renderer.domElement);

      // 2. Realistic & Vibrant Lighting Setup
      const ambientLight = new THREE.AmbientLight(0x4a7378, 2.7);
      scene.add(ambientLight);

      const mainSun = new THREE.DirectionalLight(0xfffdf0, 3.4);
      mainSun.position.set(50, 30, 50);
      scene.add(mainSun);

      const sideFill = new THREE.DirectionalLight(0x14b8a6, 1.1);
      sideFill.position.set(-40, 20, -40);
      scene.add(sideFill);

      const backLight = new THREE.DirectionalLight(0x0284c7, 1.5);
      backLight.position.set(-50, -20, -50);
      scene.add(backLight);

      // 3. Genuine NASA Blue Marble Satellite Earth Mesh with Vibrant Natural Green & Blue Enhancement
      const textureLoader = new THREE.TextureLoader();
      const earthTexture = textureLoader.load("/assets/earth_blue_marble.jpg");
      const specularTexture = textureLoader.load("/assets/earth_specular.jpg");

      const globeGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
      const globeMat = new THREE.MeshPhongMaterial({
        map: earthTexture,
        color: new THREE.Color(0xdcf8e6), // Subtle green-tinted multiplier to enrich vegetation & forests naturally
        specularMap: specularTexture,
        specular: new THREE.Color(0x38bdf8),
        shininess: 28,
        emissive: new THREE.Color(0x082b2e), // Deep emerald-teal shadow fill
        emissiveIntensity: 0.32,
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

      // Filter floats by region cleanly & robustly
      const visibleFloats = floats.filter((f) => {
        if (
          !selectedRegion ||
          selectedRegion === "All" ||
          selectedRegion === "Global Ocean" ||
          selectedRegion === "global_ocean"
        ) {
          return true;
        }
        const selNorm = selectedRegion.toLowerCase().replace(/_/g, " ").trim();
        const fRegionNorm = (f.region || "").toLowerCase().replace(/_/g, " ").trim();

        return (
          fRegionNorm.includes(selNorm) ||
          selNorm.includes(fRegionNorm) ||
          (selNorm.includes("bengal") && fRegionNorm.includes("bengal")) ||
          (selNorm.includes("arabian") && fRegionNorm.includes("arabian")) ||
          (selNorm.includes("indian") && fRegionNorm.includes("indian")) ||
          (selNorm.includes("southern") && fRegionNorm.includes("southern")) ||
          (selNorm.includes("pacific") && fRegionNorm.includes("pacific")) ||
          (selNorm.includes("atlantic") && fRegionNorm.includes("atlantic")) ||
          (selNorm.includes("arctic") && fRegionNorm.includes("arctic")) ||
          (selNorm.includes("mediterranean") && fRegionNorm.includes("mediterranean")) ||
          (selNorm.includes("china") && fRegionNorm.includes("china"))
        );
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

        const resolvedDepth = normalizeFloatDepth(f);
        console.log(`[Ocean3DCanvas] Float ID: ${getFloatId(f)}, resolved depth: ${resolvedDepth}, color: ${hexColorStr}`);

        // Core Marker Sphere (Clean 3D Sphere Geometry) - always uses depth-based hexColor
        const pinRadius = isSelected ? 0.52 : 0.38;
        const pinGeo = new THREE.SphereGeometry(pinRadius, 16, 16);
        const pinMat = new THREE.MeshBasicMaterial({ color: hexColor });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        floatGroup.add(pinMesh);

        // Subtle Outer Glow Ring matching depth color
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

        // Distinct Selection Outline Ring
        if (isSelected) {
          const selectRingGeo = new THREE.RingGeometry(0.9, 1.25, 32);
          const selectRingMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.95,
          });
          const selectRingMesh = new THREE.Mesh(selectRingGeo, selectRingMat);
          floatGroup.add(selectRingMesh);
        }

        // Vertical Laser Depth Probe Line into Earth using depth color
        const probePoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -2.5)];
        const probeGeo = new THREE.BufferGeometry().setFromPoints(probePoints);
        const probeMat = new THREE.LineBasicMaterial({
          color: hexColor,
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
              if (el.style.opacity !== "0") el.style.opacity = "0";
              return;
            }

            const pos = latLonToVector3(label.lat, label.lon, GLOBE_RADIUS + 0.15);
            const normal = pos.clone().normalize();
            const camDir = camera.position.clone().sub(pos).normalize();
            const dot = normal.dot(camDir);

            // Hide labels on the back side of the Earth curve
            if (dot < 0.15) {
              if (el.style.opacity !== "0") el.style.opacity = "0";
              return;
            }

            const proj = pos.clone().project(camera);
            if (proj.z > 1 || proj.z < -1) {
              if (el.style.opacity !== "0") el.style.opacity = "0";
              return;
            }

            const x = ((proj.x + 1) * container.clientWidth) / 2;
            const y = ((-proj.y + 1) * container.clientHeight) / 2;

            el.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0)`;
            const fade = Math.min(1, Math.max(0, (dot - 0.15) * 3));
            el.style.opacity = String(fade * 0.9);
          });
        }

        // Pulse float marker halos & scale markers dynamically with camera distance
        const currentCamDist = camera.position.length();
        const dynamicMarkerScale = Math.max(0.48, Math.min(1.35, Math.pow(currentCamDist / 42.0, 0.85)));

        markerObjects.forEach((m, idx) => {
          m.mesh.scale.set(dynamicMarkerScale, dynamicMarkerScale, dynamicMarkerScale);

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
              className={`absolute top-0 left-0 transition-opacity duration-150 whitespace-nowrap font-mono-sci select-none pointer-events-none ${
                label.type === "ocean"
                  ? "text-[11px] text-cyan-200/90 font-bold uppercase italic tracking-widest drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
                  : label.type === "continent"
                  ? "text-[12px] text-amber-200/90 font-extrabold uppercase tracking-widest drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]"
                  : label.type === "sea"
                  ? "text-[10px] text-sky-300/85 font-bold uppercase italic tracking-wider drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]"
                  : label.maxDist >= 55
                  ? "text-[10.5px] text-slate-100 font-bold uppercase tracking-wider drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] bg-slate-950/40 px-1.5 py-0.5 rounded backdrop-blur-[1px] border border-slate-700/30"
                  : "text-[9.5px] text-slate-200 font-medium tracking-normal drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] bg-slate-950/35 px-1 py-0.5 rounded backdrop-blur-[1px] border border-slate-800/25"
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
              <span
                className="w-2 h-2 rounded-full animate-ping"
                style={{ backgroundColor: getFloatMarkerColor(hoveredFloat) }}
              />
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
