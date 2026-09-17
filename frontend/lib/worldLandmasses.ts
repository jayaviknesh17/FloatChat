/**
 * World Continent Landmass Polygon Coordinates (Longitude [-180..180], Latitude [-90..90]).
 * Used by OceanMapCanvas for fast, crisp, zero-latency vector rendering of global geography.
 */

export interface LandmassPolygon {
  name: string;
  coordinates: [number, number][]; // [lon, lat] pairs
}

export const WORLD_LANDMASSES: LandmassPolygon[] = [
  // 1. Eurasia (Europe + Asia including India, Arabia, SE Asia)
  {
    name: "Eurasia",
    coordinates: [
      [-9.5, 38.8], [-9.5, 43.8], [-5.0, 48.5], [2.3, 51.1], [8.0, 54.0], [14.0, 54.5],
      [21.0, 56.0], [28.0, 70.0], [60.0, 70.0], [100.0, 76.0], [140.0, 72.0], [170.0, 66.0],
      [170.0, 60.0], [142.0, 50.0], [130.0, 42.0], [121.0, 31.0], [114.0, 22.5], [108.0, 15.0],
      [104.0, 10.0], [100.0, 4.0], [104.0, 1.5], [108.0, 12.0], [115.0, 20.0], [120.0, 30.0],
      [122.0, 38.0], [119.0, 45.0], [100.0, 52.0], [90.0, 54.0], [75.0, 35.0], [68.0, 24.0],
      [72.0, 19.0], [76.0, 12.0], [77.5, 8.1], [80.0, 13.0], [85.0, 20.0], [88.0, 22.0],
      [92.0, 21.0], [94.0, 16.0], [98.0, 10.0], [99.0, 7.0], [96.0, 16.0], [92.0, 22.0],
      [89.0, 25.0], [80.0, 26.0], [70.0, 23.0], [60.0, 25.0], [56.0, 27.0], [55.0, 25.0],
      [51.0, 24.0], [43.0, 12.5], [38.0, 12.0], [35.0, 28.0], [32.0, 31.0], [26.0, 38.0],
      [14.0, 41.0], [9.0, 43.0], [-5.0, 36.0], [-9.5, 38.8]
    ]
  },
  // 2. India Subcontinent Detail Outline (High accuracy for FloatChat regional context)
  {
    name: "India Subcontinent",
    coordinates: [
      [68.1, 23.7], [70.0, 21.0], [72.8, 19.0], [73.8, 15.5], [75.0, 12.5], [76.9, 10.0],
      [77.5, 8.1], [78.2, 9.3], [79.8, 11.9], [80.2, 13.1], [80.3, 16.0], [83.3, 17.7],
      [85.8, 19.8], [87.0, 21.5], [88.2, 21.6], [89.0, 23.0], [88.5, 25.5], [80.0, 28.5],
      [74.0, 31.0], [70.0, 28.0], [68.1, 23.7]
    ]
  },
  // 3. Sri Lanka
  {
    name: "Sri Lanka",
    coordinates: [
      [79.7, 9.8], [81.8, 8.6], [81.8, 6.9], [80.5, 5.9], [79.8, 6.9], [79.7, 9.8]
    ]
  },
  // 4. Africa
  {
    name: "Africa",
    coordinates: [
      [-17.5, 14.7], [-17.0, 21.0], [-5.0, 35.8], [11.0, 37.0], [25.0, 31.5], [32.5, 31.2],
      [34.0, 27.5], [43.0, 12.5], [51.2, 11.8], [42.0, -11.5], [35.0, -24.0], [28.0, -32.0],
      [19.0, -34.8], [18.0, -34.0], [12.0, -17.0], [9.0, 0.0], [0.0, 5.0], [-10.0, 6.0],
      [-15.0, 11.0], [-17.5, 14.7]
    ]
  },
  // 5. Madagascar
  {
    name: "Madagascar",
    coordinates: [
      [49.3, -12.2], [50.5, -15.5], [47.5, -24.5], [44.0, -25.2], [43.5, -20.0], [47.0, -14.0], [49.3, -12.2]
    ]
  },
  // 6. Australia
  {
    name: "Australia",
    coordinates: [
      [113.5, -26.0], [114.0, -21.8], [121.0, -18.0], [130.0, -12.0], [136.0, -12.0], [142.0, -10.8],
      [145.0, -15.0], [153.5, -28.0], [150.0, -37.5], [140.0, -38.5], [130.0, -31.5], [115.0, -34.5],
      [113.5, -26.0]
    ]
  },
  // 7. Southeast Asian Archipelago (Sumatra, Java, Borneo)
  {
    name: "Sumatra",
    coordinates: [
      [95.3, 5.6], [98.5, 3.0], [103.5, -1.5], [106.0, -6.0], [102.0, -4.5], [97.0, 1.5], [95.3, 5.6]
    ]
  },
  {
    name: "Java",
    coordinates: [
      [105.2, -6.0], [110.0, -7.0], [114.5, -8.7], [112.0, -8.3], [106.5, -7.5], [105.2, -6.0]
    ]
  },
  {
    name: "Borneo",
    coordinates: [
      [109.0, 2.0], [113.0, 4.5], [118.0, 5.0], [119.0, -1.0], [116.0, -4.0], [110.0, -3.0], [109.0, 2.0]
    ]
  },
  // 8. Arabian Peninsula
  {
    name: "Arabian Peninsula",
    coordinates: [
      [35.0, 28.0], [43.0, 12.5], [51.0, 12.0], [59.0, 22.5], [56.0, 26.0], [50.0, 29.5], [48.0, 30.0], [35.0, 28.0]
    ]
  },
  // 9. North America
  {
    name: "North America",
    coordinates: [
      [-168.0, 65.0], [-140.0, 69.0], [-100.0, 70.0], [-64.0, 60.0], [-52.0, 47.0], [-75.0, 35.0],
      [-80.0, 25.0], [-97.0, 26.0], [-105.0, 20.0], [-90.0, 14.0], [-80.0, 8.0], [-100.0, 16.0],
      [-115.0, 30.0], [-124.0, 48.0], [-140.0, 59.0], [-168.0, 65.0]
    ]
  },
  // 10. South America
  {
    name: "South America",
    coordinates: [
      [-80.0, 8.0], [-60.0, 8.0], [-35.0, -5.0], [-38.0, -18.0], [-53.0, -33.0], [-68.0, -55.0],
      [-75.0, -45.0], [-80.0, -10.0], [-80.0, 8.0]
    ]
  },
  // 11. Antarctica
  {
    name: "Antarctica",
    coordinates: [
      [-180.0, -70.0], [-120.0, -74.0], [-60.0, -68.0], [0.0, -70.0], [60.0, -66.0], [120.0, -67.0], [180.0, -70.0], [180.0, -90.0], [-180.0, -90.0], [-180.0, -70.0]
    ]
  }
];

export interface OceanRegionLabel {
  name: string;
  lon: number;
  lat: number;
  size: number;
  style: "normal" | "italic";
  color: string;
  minZoom?: number;
}

export const GLOBAL_OCEAN_LABELS: OceanRegionLabel[] = [
  { name: "Bay of Bengal", lon: 89.0, lat: 14.5, size: 13, style: "normal", color: "rgba(186, 230, 253, 0.95)" },
  { name: "Arabian Sea", lon: 64.0, lat: 15.0, size: 13, style: "normal", color: "rgba(186, 230, 253, 0.95)" },
  { name: "Indian Ocean", lon: 78.0, lat: -5.0, size: 16, style: "italic", color: "rgba(147, 197, 253, 0.90)" },
  { name: "Pacific Ocean", lon: 160.0, lat: 0.0, size: 15, style: "italic", color: "rgba(148, 163, 184, 0.70)" },
  { name: "Atlantic Ocean", lon: -30.0, lat: 5.0, size: 15, style: "italic", color: "rgba(148, 163, 184, 0.70)" },
  { name: "Southern Ocean", lon: 70.0, lat: -58.0, size: 14, style: "italic", color: "rgba(148, 163, 184, 0.65)" },
  { name: "India", lon: 78.5, lat: 21.0, size: 11, style: "normal", color: "rgba(226, 232, 240, 0.85)" },
  { name: "Africa", lon: 22.0, lat: 7.0, size: 12, style: "normal", color: "rgba(148, 163, 184, 0.50)" },
  { name: "Australia", lon: 134.0, lat: -25.0, size: 12, style: "normal", color: "rgba(148, 163, 184, 0.50)" },
];
