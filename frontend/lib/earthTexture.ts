/**
 * High-Resolution Realistic Earth Texture & Geographic Vector Generator for Three.js 3D Globe
 * Generates high-fidelity geographic textures with realistic ocean bathymetry, continental landmasses,
 * coastlines (India, Sri Lanka, Bay of Bengal, Arabian Sea, Asia, Africa, Australia), and latitude-longitude graticules.
 */

import * as THREE from "three";

export function createRealisticEarthTexture(): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  // Helper: Convert Lat (-90 to +90) & Lon (-180 to +180) to Canvas (x, y)
  const toX = (lon: number) => ((lon + 180) / 360) * width;
  const toY = (lat: number) => ((90 - lat) / 180) * height;

  // 1. Deep Ocean Base Background with realistic bathymetric gradient
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
  oceanGrad.addColorStop(0, "#011229");    // Arctic deep blue
  oceanGrad.addColorStop(0.35, "#021c40"); // Northern temperate
  oceanGrad.addColorStop(0.5, "#042c5c");  // Tropical Indian / Pacific / Atlantic ocean
  oceanGrad.addColorStop(0.65, "#021c40"); // Southern temperate
  oceanGrad.addColorStop(1, "#010e22");    // Antarctic deep blue

  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Subtle Ocean Bathymetry Ridges (Indian Ocean Central Ridge, 90 East Ridge, Carlsberg Ridge)
  ctx.strokeStyle = "rgba(14, 165, 233, 0.12)";
  ctx.lineWidth = 12;
  ctx.filter = "blur(8px)";

  // Carlsberg & Central Indian Ridge
  ctx.beginPath();
  ctx.moveTo(toX(60), toY(12));
  ctx.bezierCurveTo(toX(65), toY(0), toX(70), toY(-15), toX(75), toY(-30));
  ctx.stroke();

  // 90 East Ridge in Bay of Bengal / Indian Ocean
  ctx.beginPath();
  ctx.moveTo(toX(90), toY(15));
  ctx.lineTo(toX(90), toY(-35));
  ctx.stroke();

  ctx.filter = "none";

  // 3. Draw Continental Landmasses with rich terrestrial colors
  ctx.fillStyle = "#0c2847"; // Base continental shelf
  ctx.strokeStyle = "#38bdf8"; // Crisp coastline glow
  ctx.lineWidth = 1.2;

  // Function to draw and stroke a geographic polygon
  const drawRegion = (points: [number, number][], fillColor = "#0e3357", strokeColor = "#38bdf8") => {
    if (points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(toX(points[0][0]), toY(points[0][1]));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(toX(points[i][0]), toY(points[i][1]));
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  };

  // --- Indian Subcontinent (High Detail) ---
  const india = [
    [68.5, 24.5], [69.5, 22.8], [72.5, 21.0], [72.8, 19.0],
    [73.8, 15.5], [75.5, 12.0], [77.5, 8.1],  // Kanyakumari
    [78.5, 9.5],  [79.8, 11.0], [80.3, 13.1], // Chennai
    [82.0, 16.5], [84.0, 18.5], [86.5, 20.2], // Odisha
    [88.5, 21.8], [91.5, 22.5], [92.5, 21.0], // Bengal Delta / Myanmar border
    [90.0, 25.0], [88.0, 27.5], [84.0, 28.5], [80.0, 31.0],
    [75.0, 34.5], [73.0, 34.0], [70.0, 30.0], [68.0, 26.0],
  ] as [number, number][];
  drawRegion(india, "#113860", "#00f0ff");

  // --- Sri Lanka ---
  const sriLanka = [
    [80.0, 9.5], [81.5, 8.5], [81.8, 7.0], [80.5, 6.0], [79.8, 7.5],
  ] as [number, number][];
  drawRegion(sriLanka, "#113860", "#00f0ff");

  // --- Arabian Peninsula ---
  const arabia = [
    [36.0, 28.0], [42.0, 22.0], [43.5, 13.0], [50.0, 14.5],
    [53.5, 17.0], [59.5, 22.5], [56.5, 26.0], [50.0, 28.0],
    [48.0, 30.0], [39.0, 32.0],
  ] as [number, number][];
  drawRegion(arabia, "#0f2e50", "#38bdf8");

  // --- Africa (East Coast / Horn of Africa / Madagascar) ---
  const hornOfAfrica = [
    [43.0, 12.0], [51.0, 11.5], [49.0, 5.0], [41.0, -4.0],
    [40.0, -10.0], [35.0, -20.0], [32.0, -28.0], [28.0, -34.0],
    [18.0, -34.0], [12.0, -20.0], [10.0, 0.0], [32.0, 31.0],
    [35.0, 28.0], [40.0, 20.0],
  ] as [number, number][];
  drawRegion(hornOfAfrica, "#0a2442", "#0284c7");

  // Madagascar
  const madagascar = [
    [49.5, -12.5], [50.5, -16.0], [47.5, -25.0], [44.0, -25.0], [44.0, -17.0],
  ] as [number, number][];
  drawRegion(madagascar, "#0d2b4a", "#38bdf8");

  // --- Southeast Asia & Indochina ---
  const seAsia = [
    [92.5, 21.0], [98.0, 16.0], [100.0, 10.0], [101.5, 3.0],
    [104.0, 1.5], [105.0, 10.0], [109.0, 13.0], [108.0, 21.0],
    [100.0, 22.0], [94.0, 23.0],
  ] as [number, number][];
  drawRegion(seAsia, "#0c2847", "#38bdf8");

  // --- Indonesia & Sumatra / Java ---
  const sumatra = [
    [95.5, 5.5], [98.5, 2.0], [103.0, -2.0], [106.0, -6.0],
    [103.5, -5.0], [98.5, 0.0],
  ] as [number, number][];
  drawRegion(sumatra, "#0d2b4a", "#38bdf8");

  const java = [
    [106.0, -6.0], [114.0, -8.0], [112.0, -8.5], [106.0, -7.0],
  ] as [number, number][];
  drawRegion(java, "#0d2b4a", "#38bdf8");

  // --- Australia ---
  const australia = [
    [114.0, -22.0], [122.0, -17.0], [130.0, -12.0], [136.0, -12.0],
    [142.0, -11.0], [148.0, -20.0], [153.0, -28.0], [150.0, -37.0],
    [140.0, -38.0], [130.0, -32.0], [115.0, -34.0], [113.0, -26.0],
  ] as [number, number][];
  drawRegion(australia, "#0a2442", "#0284c7");

  // --- Eurasia / East Asia Mainland ---
  const eurasia = [
    [30.0, 60.0], [60.0, 68.0], [100.0, 72.0], [140.0, 70.0],
    [130.0, 45.0], [120.0, 32.0], [110.0, 22.0], [80.0, 35.0],
    [50.0, 40.0], [30.0, 42.0],
  ] as [number, number][];
  drawRegion(eurasia, "#09223e", "#0284c7");

  // 4. Draw Latitude / Longitude Graticules (Equator, Tropics, Prime Meridian, Key Longitudes)
  ctx.strokeStyle = "rgba(14, 165, 233, 0.18)";
  ctx.lineWidth = 1.0;

  // Equator
  ctx.beginPath();
  ctx.moveTo(0, toY(0));
  ctx.lineTo(width, toY(0));
  ctx.stroke();

  // Tropic of Cancer & Capricorn
  ctx.strokeStyle = "rgba(14, 165, 233, 0.12)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, toY(23.5));
  ctx.lineTo(width, toY(23.5));
  ctx.moveTo(0, toY(-23.5));
  ctx.lineTo(width, toY(-23.5));
  ctx.stroke();

  // Major Longitude Meridians (0°, 60°E, 90°E, 120°E, 180°)
  [0, 30, 60, 80, 90, 120, 150, 180, -60, -120].forEach((lon) => {
    ctx.beginPath();
    ctx.moveTo(toX(lon), 0);
    ctx.lineTo(toX(lon), height);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // 5. Geographic Basin Watermarks on Ocean Surface
  ctx.font = "bold 20px system-ui, sans-serif";
  ctx.fillStyle = "rgba(56, 189, 248, 0.65)";
  ctx.textAlign = "center";
  ctx.fillText("BAY OF BENGAL", toX(89), toY(14));
  ctx.fillText("ARABIAN SEA", toX(66), toY(15));
  ctx.fillText("INDIAN OCEAN", toX(78), toY(-8));

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return texture;
}

// Convert spherical geographic coordinates to 3D Cartesian Vector3
export function geoToCartesian(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}
