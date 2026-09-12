"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { ArgoFloat, OceanRegion } from "@/lib/types";

interface Ocean3DCanvasProps {
  floats: ArgoFloat[];
  selectedFloat: ArgoFloat | null;
  onSelectFloat: (argoFloat: ArgoFloat) => void;
  selectedRegion: OceanRegion | "All";
  selectedDepth: number; // in meters (0 - 2000)
  selectedCycleTime: number; // 0 (oldest) to 100 (latest)
}

export default function Ocean3DCanvas({
  floats,
  selectedFloat,
  onSelectFloat,
  selectedRegion,
  selectedDepth,
  selectedCycleTime,
}: Ocean3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredFloat, setHoveredFloat] = useState<ArgoFloat | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020a17, 0.015);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 35, 55);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x0a3264, 1.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0x38bdf8, 2.5);
    sunLight.position.set(20, 50, 30);
    scene.add(sunLight);

    const cyanPointLight = new THREE.PointLight(0x22d3ee, 3, 100);
    cyanPointLight.position.set(0, 10, 0);
    scene.add(cyanPointLight);

    // Create Ocean Grid / Bathymetry Base
    const gridHelper = new THREE.GridHelper(70, 24, 0x38bdf8, 0x082750);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Deep ocean floor plane (2000m depth level)
    const floorGeometry = new THREE.PlaneGeometry(80, 80, 20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x020a19,
      roughness: 0.9,
      metalness: 0.1,
      wireframe: false,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -18; // Represents 2000m bathymetry
    scene.add(floor);

    // Northern Indian Ocean Basin Landmark Markers (India, Bay of Bengal, Arabian Sea)
    const createBasinLabel = (text: string, x: number, z: number, color: number) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "rgba(4, 20, 45, 0.7)";
        ctx.fillRect(0, 0, 256, 64);
        ctx.font = "bold 24px system-ui";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(text, 128, 40);
      }
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.position.set(x, 1, z);
      sprite.scale.set(10, 2.5, 1);
      scene.add(sprite);
    };

    createBasinLabel("Bay of Bengal", 16, -5, 0x22d3ee);
    createBasinLabel("Arabian Sea", -18, -5, 0x22d3ee);
    createBasinLabel("Indian Subcontinent", 0, -18, 0x64748b);

    // Float Object Group
    const floatObjects: { mesh: THREE.Group; floatData: ArgoFloat }[] = [];

    // Map Geographic Coordinates (Lat: 8°N-22°N, Lon: 58°E-94°E) to 3D Scene coordinates (X, Z)
    const lonToX = (lon: number) => ((lon - 78) / 18) * 32;
    const latToZ = (lat: number) => -((lat - 15) / 10) * 20;

    // Filter floats by region and depth
    const visibleFloats = floats.filter((f) => {
      if (selectedRegion !== "All" && f.region !== selectedRegion) return false;
      return true;
    });

    visibleFloats.forEach((f) => {
      const group = new THREE.Group();
      const x = lonToX(f.lon);
      const z = latToZ(f.lat);
      const y = -(selectedDepth / 2000) * 16; // Real depth position

      group.position.set(x, y, z);

      const isAnomaly = f.currentAnomaly?.isAnomalous;
      const isSelected = selectedFloat?.id === f.id;

      // Float 3D Mesh (Hull + Mast)
      const hullColor = isAnomaly ? 0xf59e0b : isSelected ? 0x00f0ff : 0xeab308;
      const hullGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.8, 16);
      const hullMat = new THREE.MeshStandardMaterial({
        color: hullColor,
        metalness: 0.4,
        roughness: 0.3,
        emissive: isSelected ? 0x00f0ff : 0x000000,
        emissiveIntensity: isSelected ? 0.6 : 0,
      });
      const hull = new THREE.Mesh(hullGeo, hullMat);
      hull.position.y = 0.9;
      group.add(hull);

      // Antenna mast
      const mastGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8);
      const mastMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.y = 2.2;
      group.add(mast);

      // Glowing Beacon Sphere
      const beaconGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: isAnomaly ? 0xf43f5e : isSelected ? 0x22d3ee : 0x38bdf8,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 2.8;
      group.add(beacon);

      // Vertical CTD profiling laser/depth track
      const trackPoints = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, -18, 0), // Full 2000m vertical profile track
      ];
      const trackGeo = new THREE.BufferGeometry().setFromPoints(trackPoints);
      const trackMat = new THREE.LineDashedMaterial({
        color: isAnomaly ? 0xf59e0b : 0x0284c7,
        dashSize: 0.8,
        gapSize: 0.5,
        opacity: isSelected ? 0.9 : 0.35,
        transparent: true,
      });
      const trackLine = new THREE.Line(trackGeo, trackMat);
      trackLine.computeLineDistances();
      group.add(trackLine);

      // 3D Drift Trajectory Line across past cycles
      if (f.trajectory && f.trajectory.length > 1) {
        const trajPoints = f.trajectory.map((tp) => {
          const tx = lonToX(tp.lon) - x;
          const tz = latToZ(tp.lat) - z;
          return new THREE.Vector3(tx, 0.2, tz);
        });
        const trajGeo = new THREE.BufferGeometry().setFromPoints(trajPoints);
        const trajMat = new THREE.LineBasicMaterial({
          color: isAnomaly ? 0xfbbf24 : 0x38bdf8,
          linewidth: 2,
          opacity: 0.8,
          transparent: true,
        });
        const trajLine = new THREE.Line(trajGeo, trajMat);
        group.add(trajLine);
      }

      scene.add(group);
      floatObjects.push({ mesh: group, floatData: f });
    });

    // Raycasting for float clicking and hovering
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        floatObjects.flatMap((f) => f.mesh.children)
      );

      if (intersects.length > 0) {
        const hit = floatObjects.find((fo) =>
          fo.mesh.children.some((c) => c === intersects[0].object)
        );
        if (hit) {
          setHoveredFloat(hit.floatData);
          renderer.domElement.style.cursor = "pointer";
          return;
        }
      }
      setHoveredFloat(null);
      renderer.domElement.style.cursor = "default";
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        floatObjects.flatMap((f) => f.mesh.children)
      );

      if (intersects.length > 0) {
        const hit = floatObjects.find((fo) =>
          fo.mesh.children.some((c) => c === intersects[0].object)
        );
        if (hit) {
          onSelectFloat(hit.floatData);
        }
      }
    };

    // Smooth Orbit Controls (Pan / Tilt / Rotate)
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let spherical = { radius: 65, theta: Math.PI / 4, phi: Math.PI / 3 };

    const updateCamera = () => {
      camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = spherical.radius * Math.cos(spherical.phi);
      camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(0, -4, 0);
    };
    updateCamera();

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      onPointerMove(e);
      if (!isDragging) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      spherical.theta -= deltaX * 0.006;
      spherical.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, spherical.phi - deltaY * 0.006));

      previousMousePosition = { x: e.clientX, y: e.clientY };
      updateCamera();
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      spherical.radius = Math.max(25, Math.min(110, spherical.radius + e.deltaY * 0.05));
      updateCamera();
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    domEl.addEventListener("wheel", onWheel, { passive: false });
    domEl.addEventListener("click", onClick);

    // Animation loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsed = clock.getElapsedTime();

      // Gentle float bobbing & beacon pulsation
      floatObjects.forEach((fo, idx) => {
        fo.mesh.position.y += Math.sin(elapsed * 2 + idx) * 0.004;
      });

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
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
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      domEl.removeEventListener("mousedown", onMouseDown);
      domEl.removeEventListener("wheel", onWheel);
      domEl.removeEventListener("click", onClick);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [floats, selectedFloat, selectedRegion, selectedDepth, selectedCycleTime, onSelectFloat]);

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden select-none">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Hovered Float Tooltip Overlay */}
      {hoveredFloat && (
        <div className="absolute top-6 left-6 p-3.5 rounded-xl bg-[#061c38]/90 backdrop-blur-md border border-cyan-400/40 shadow-2xl pointer-events-none z-20 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold text-white font-mono-sci">
              WMO {hoveredFloat.wmo}
            </span>
            <span className="text-[10px] text-cyan-300 font-mono-sci">
              ({hoveredFloat.region})
            </span>
          </div>
          <p className="text-slate-300 text-[11px]">{hoveredFloat.name}</p>
          <p className="text-cyan-400/80 text-[10px] font-mono-sci mt-1">
            Lat: {hoveredFloat.lat}°N | Lon: {hoveredFloat.lon}°E | Cycle #{hoveredFloat.lastCycle}
          </p>
          <span className="text-[10px] text-emerald-400 block mt-1">
            Click to inspect vertical CTD profile & thermocline
          </span>
        </div>
      )}

      {/* 3D Navigation Controls Legend */}
      <div className="absolute bottom-6 left-6 p-3 rounded-xl bg-[#041226]/80 backdrop-blur-md border border-cyan-500/20 text-[11px] text-slate-300 space-y-1 pointer-events-none">
        <p className="font-semibold text-cyan-300">3D Ocean Controls</p>
        <p>• Left-click + drag: Rotate orbital view</p>
        <p>• Scroll wheel: Zoom into basin / depth</p>
        <p>• Click float buoy: Open profile inspector</p>
      </div>
    </div>
  );
}
