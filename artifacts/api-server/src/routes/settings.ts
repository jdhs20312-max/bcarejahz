import { Router } from "express";
import { getSettings, saveSettings, type CompanySettings } from "../lib/settings-store";

const router = Router();

// GET /api/settings - Get all company settings
router.get("/", (_req, res) => {
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

export default router;
