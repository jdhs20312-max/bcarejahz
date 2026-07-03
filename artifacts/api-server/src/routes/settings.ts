import { Router } from "express";
import { getSettings, saveSettings, type CompanySettings } from "../lib/settings-store";

const router = Router();

// GET /api/settings - Get all company settings
router.get("/", (_req, res) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (error) {
    console.error("Error getting settings:", error);
    res.status(500).json({ error: "Failed to get settings" });
  }
});

// PUT /api/settings - Update company settings
router.put("/", (req, res) => {
  try {
    const settings = req.body as CompanySettings;
    
    if (!settings || !Array.isArray(settings.offers)) {
      res.status(400).json({ error: "Invalid settings format" });
      return;
    }

    saveSettings(settings);
    res.json(settings);
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

export default router;
