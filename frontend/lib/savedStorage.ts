import { SavedQuery, SavedVisualization } from "./types";

const SAVED_QUERIES_KEY = "floatchat_saved_queries";
const SAVED_VISUALIZATIONS_KEY = "floatchat_saved_visualizations";
const SAVED_INITIALIZED_KEY = "floatchat_saved_initialized_v2";

export const SAVED_STORAGE_EVENT = "floatchat_storage_update";

function dispatchStorageEvent() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SAVED_STORAGE_EVENT));
  }
}

export const EXAMPLE_QUERIES: SavedQuery[] = [
  {
    id: "demo_1",
    title: "Bay of Bengal Temperature Anomaly",
    queryText: "Show temperature anomalies in the Bay of Bengal below 500 metres during the last six months.",
    category: "Temperature",
    tags: ["Bay of Bengal", "Temperature", "Example"],
    region: "Bay of Bengal",
    variable: "Temperature",
    depth: "500-2000m",
    period: "Last 6 Months",
    analysis: "Statistical Anomaly Detection (Z-Score)",
    savedAt: new Date().toISOString(),
    thumbnailType: "temperature-anomaly",
    summary: "Example scientific query for statistical thermal anomalies.",
  },
  {
    id: "demo_2",
    title: "Arabian Sea Salinity Profile",
    queryText: "Plot salinity profiles near the Arabian Sea for the last 6 months.",
    category: "Salinity",
    tags: ["Arabian Sea", "Salinity", "Example"],
    region: "Arabian Sea",
    variable: "Salinity",
    depth: "0-2000m (Full Column)",
    period: "Last 6 Months",
    analysis: "Salinity Stratification & Halocline Gradient",
    savedAt: new Date().toISOString(),
    thumbnailType: "salinity-profile",
    summary: "Example scientific query for vertical salinity stratification.",
  },
  {
    id: "demo_3",
    title: "Thermocline Depth Analysis",
    queryText: "Where is the thermocline depth in the Bay of Bengal during summer 2025?",
    category: "Temperature",
    tags: ["Bay of Bengal", "Thermocline", "Example"],
    region: "Bay of Bengal",
    variable: "Thermocline",
    depth: "0-500m",
    period: "Summer 2025",
    analysis: "Vertical Temperature Gradient (|dT/dz| max)",
    savedAt: new Date().toISOString(),
    thumbnailType: "thermocline-depth",
    summary: "Example scientific query for vertical thermocline estimation.",
  },
  {
    id: "demo_4",
    title: "Float Trajectories (ID: 2902235)",
    queryText: "Show the trajectory of float 2902235 over the last 12 months.",
    category: "Trajectories",
    tags: ["Float Trajectory", "Float ID", "Example"],
    region: "Bay of Bengal",
    variable: "Float Trajectories",
    floatId: "2902235",
    depth: "0-2000m",
    period: "Last 12 Months",
    analysis: "4D Geostrophic & Deep Drift Path",
    savedAt: new Date().toISOString(),
    thumbnailType: "float-trajectory",
    summary: "Example trajectory query for active ARGO float platform.",
  },
];

// ==========================================
// SAVED QUERIES
// ==========================================

export function getSavedQueries(): SavedQuery[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_QUERIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading saved queries from localStorage:", err);
    return [];
  }
}

export function loadExampleQueries(): void {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(EXAMPLE_QUERIES));
      dispatchStorageEvent();
    } catch (err) {
      console.error("Error loading example queries:", err);
    }
  }
}



export function saveQuery(queryData: Omit<SavedQuery, "id" | "savedAt">): SavedQuery {
  const existing = getSavedQueries();
  const existingIndex = existing.findIndex(
    (q) => q.queryText.trim().toLowerCase() === queryData.queryText.trim().toLowerCase()
  );

  // Auto-infer title and category if omitted
  const qText = queryData.queryText.toLowerCase();
  let category = queryData.category;
  if (!category) {
    if (qText.includes("salin") || (queryData.variable && queryData.variable.toLowerCase().includes("salin"))) {
      category = "Salinity";
    } else if (qText.includes("traject") || qText.includes("drift") || qText.includes("float")) {
      category = "Trajectories";
    } else if (qText.includes("anomal") || qText.includes("heatwave") || qText.includes("extreme")) {
      category = "Anomalies";
    } else {
      category = "Temperature";
    }
  }

  let title = queryData.title;
  if (!title) {
    const reg = queryData.region || (qText.includes("arabian") ? "Arabian Sea" : (qText.includes("bengal") ? "Bay of Bengal" : "Ocean"));
    if (category === "Salinity") {
      title = `${reg} Salinity Analysis`;
    } else if (category === "Trajectories") {
      title = `${reg} Float Trajectory`;
    } else if (category === "Anomalies") {
      title = `${reg} Thermal Anomalies`;
    } else {
      title = `${reg} Temperature Query`;
    }
  }

  let thumbnailType = queryData.thumbnailType;
  if (!thumbnailType) {
    if (category === "Salinity") thumbnailType = "salinity-profile";
    else if (category === "Trajectories") thumbnailType = "float-trajectory";
    else if (category === "Anomalies") thumbnailType = "marine-heatwaves";
    else if (qText.includes("thermocline")) thumbnailType = "thermocline-depth";
    else if (qText.includes("trend")) thumbnailType = "surface-trends";
    else thumbnailType = "temperature-anomaly";
  }

  const tags = queryData.tags || [
    queryData.region || "Indian Ocean",
    category,
    ...(qText.includes("anomaly") ? ["Anomalies"] : [queryData.variable || "Profile"]),
  ].filter(Boolean);

  const newSavedQuery: SavedQuery = {
    ...queryData,
    title,
    category,
    tags,
    thumbnailType,
    id: `sq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    savedAt: new Date().toISOString(),
  };

  let updated: SavedQuery[];
  if (existingIndex >= 0) {
    updated = [...existing];
    updated[existingIndex] = { ...newSavedQuery, id: existing[existingIndex].id };
  } else {
    updated = [newSavedQuery, ...existing];
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(updated));
      dispatchStorageEvent();
    } catch (err) {
      console.error("Error saving query to localStorage:", err);
    }
  }

  return newSavedQuery;
}


export function deleteSavedQuery(id: string): void {
  const existing = getSavedQueries();
  const filtered = existing.filter((q) => q.id !== id);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SAVED_QUERIES_KEY, JSON.stringify(filtered));
      dispatchStorageEvent();
    } catch (err) {
      console.error("Error deleting saved query from localStorage:", err);
    }
  }
}

export function isQuerySaved(queryText: string): boolean {
  if (!queryText) return false;
  const existing = getSavedQueries();
  return existing.some(
    (q) => q.queryText.trim().toLowerCase() === queryText.trim().toLowerCase()
  );
}

// ==========================================
// SAVED VISUALIZATIONS
// ==========================================

export function getSavedVisualizations(): SavedVisualization[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SAVED_VISUALIZATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading saved visualizations from localStorage:", err);
    return [];
  }
}

export function saveVisualization(
  visData: Omit<SavedVisualization, "id" | "savedAt">
): SavedVisualization {
  const existing = getSavedVisualizations();
  const existingIndex = existing.findIndex(
    (v) =>
      v.type === visData.type &&
      v.floatId === visData.floatId &&
      v.title.trim().toLowerCase() === visData.title.trim().toLowerCase()
  );

  const newSavedVis: SavedVisualization = {
    ...visData,
    id: `sv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    savedAt: new Date().toISOString(),
  };

  let updated: SavedVisualization[];
  if (existingIndex >= 0) {
    updated = [...existing];
    updated[existingIndex] = { ...newSavedVis, id: existing[existingIndex].id };
  } else {
    updated = [newSavedVis, ...existing];
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SAVED_VISUALIZATIONS_KEY, JSON.stringify(updated));
      dispatchStorageEvent();
    } catch (err) {
      console.error("Error saving visualization to localStorage:", err);
    }
  }

  return newSavedVis;
}

export function deleteSavedVisualization(id: string): void {
  const existing = getSavedVisualizations();
  const filtered = existing.filter((v) => v.id !== id);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SAVED_VISUALIZATIONS_KEY, JSON.stringify(filtered));
      dispatchStorageEvent();
    } catch (err) {
      console.error("Error deleting saved visualization from localStorage:", err);
    }
  }
}

export function isVisualizationSaved(
  floatId?: string,
  type?: string,
  title?: string
): boolean {
  if (!floatId && !title) return false;
  const existing = getSavedVisualizations();
  return existing.some((v) => {
    if (floatId && v.floatId === floatId && (!type || v.type === type)) return true;
    if (title && v.title.trim().toLowerCase() === title.trim().toLowerCase()) return true;
    return false;
  });
}
