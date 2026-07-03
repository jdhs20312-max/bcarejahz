const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

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

export async function getSettings(): Promise<CompanySettings> {
  const response = await fetch(`${API_BASE_URL}/settings`);
  if (!response.ok) {
    throw new Error("Failed to get settings");
  }
  return response.json();
}

export async function saveSettings(settings: CompanySettings): Promise<CompanySettings> {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error("Failed to save settings");
  }
  return response.json();
}
