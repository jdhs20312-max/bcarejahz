import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface InsuranceOffer {
  id: string;
  name: string;
  price: number;
  type: "شامل" | "ضد الغير";
  active: boolean;
  imageUrl?: string;
}

export interface CompanySettings {
  offers: InsuranceOffer[];
}

const SETTINGS_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../data/settings.json");

const DEFAULT_OFFERS: InsuranceOffer[] = [
  // ضد الغير
  { id: "walaa", name: "ولاء", price: 530.0, type: "ضد الغير", active: true },
  { id: "medgulf", name: "ميدغلف", price: 540.0, type: "ضد الغير", active: true },
  { id: "malath", name: "ملاذ", price: 555.25, type: "ضد الغير", active: true },
  { id: "buruj", name: "بروج", price: 590.0, type: "ضد الغير", active: true },
  { id: "axa", name: "أكسا", price: 605.0, type: "ضد الغير", active: true },
  { id: "salama", name: "سلامة", price: 620.5, type: "ضد الغير", active: true },
  { id: "tawuniya", name: "التعاونية", price: 685.5, type: "ضد الغير", active: true },
  { id: "takaful", name: "تكافل الراجحي", price: 695.5, type: "ضد الغير", active: true },
  { id: "alrajhi", name: "الراجحي تكافل", price: 710.0, type: "ضد الغير", active: true },
  // شامل
  { id: "medgulf_2", name: "ميدغلف", price: 1350.0, type: "شامل", active: true },
  { id: "malath_2", name: "ملاذ", price: 1388.13, type: "شامل", active: true },
  { id: "walaa_2", name: "ولاء", price: 1325.0, type: "شامل", active: true },
  { id: "axa_2", name: "أكسا", price: 1512.5, type: "شامل", active: true },
  { id: "salama_2", name: "سلامة", price: 1551.25, type: "شامل", active: true },
  { id: "buruj_2", name: "بروج", price: 1475.0, type: "شامل", active: true },
  { id: "tawuniya_2", name: "التعاونية", price: 1713.75, type: "شامل", active: true },
  { id: "alrajhi_2", name: "الراجحي تكافل", price: 1775.0, type: "شامل", active: true },
  { id: "takaful_2", name: "تكافل الراجحي", price: 1738.75, type: "شامل", active: true },
];

const DEFAULT_SETTINGS: CompanySettings = {
  offers: DEFAULT_OFFERS,
};

function ensureDataDir(): void {
  const dataDir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function getSettings(): CompanySettings {
  try {
    ensureDataDir();
    if (!fs.existsSync(SETTINGS_FILE)) {
      saveSettings(DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }

    const raw = fs.readFileSync(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as CompanySettings | null;
    if (!parsed || !Array.isArray(parsed.offers)) {
      saveSettings(DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
    }

    return parsed;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: CompanySettings): void {
  try {
    ensureDataDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw error;
  }
}

export function updateOffer(offerId: string, updates: Partial<InsuranceOffer>): InsuranceOffer | null {
  const settings = getSettings();
  const index = settings.offers.findIndex(o => o.id === offerId);
  
  if (index === -1) {
    return null;
  }

  settings.offers[index] = { ...settings.offers[index], ...updates };
  saveSettings(settings);
  return settings.offers[index];
}
