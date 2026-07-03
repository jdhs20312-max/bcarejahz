import { Router } from "express";
import { getSettings, saveSettings, type CompanySettings } from "../lib/settings-store";

const router = Router();

console.log("[Settings Router] Registering routes...");

// GET /api/settings - Get all company settings
router.get("/", (_req, res) => {
  console.log("[Settings Router] GET /api/settings called");
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (error) {
    console.error("[Settings GET] Error:", error);
    res.status(500).json({ error: "Failed to get settings", details: String(error) });
  }
});

// PUT /api/settings - Update company settings
router.put("/", (req, res) => {
  console.log("[Settings Router] PUT /api/settings called");
  console.log("[Settings Router] Request body:", JSON.stringify(req.body).substring(0, 200));
  try {
    const settings = req.body as CompanySettings;
    console.log("[Settings PUT] Received settings with", settings?.offers?.length, "offers");

    if (!settings || !Array.isArray(settings.offers)) {
      console.error("[Settings PUT] Invalid format:", settings);
      res.status(400).json({ error: "Invalid settings format" });
      return;
    }

    saveSettings(settings);
    console.log("[Settings PUT] Saved successfully");
    res.json(settings);
  } catch (error) {
    console.error("[Settings PUT] Error:", error);
    res.status(500).json({ error: "Failed to save settings", details: String(error) });
  }
});

console.log("[Settings Router] Routes registered");

export default router;
