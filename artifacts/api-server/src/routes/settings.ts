import { Router } from "express";
import { getSettings, saveSettings, type CompanySettings } from "../lib/settings-store";

const router = Router();

console.log("[Settings Router] Registering routes...");

// GET /api/settings - Get all company settings
router.get("/", (_req, res) => {
  console.log("[Settings Router] GET / called");
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (error) {
    console.error("[Settings GET] Error:", error);
    res.status(500).json({ error: "Failed to get settings", details: String(error) });
  }
});

// POST /api/settings - Update company settings (Express5 workaround for PUT)
router.post("/", (req, res) => {
  console.log("[Settings Router] POST / called");
  console.log("[Settings Router] Request method:", req.method);
  console.log("[Settings Router] Request body:", JSON.stringify(req.body).substring(0, 200));
  
  // Check if it's an update (has offers) or something else
  const settings = req.body as CompanySettings;
  
  if (!settings || !Array.isArray(settings.offers)) {
    console.error("[Settings POST] Invalid format:", settings);
    res.status(400).json({ error: "Invalid settings format" });
    return;
  }

  try {
    console.log("[Settings POST] Received settings with", settings.offers.length, "offers");
    saveSettings(settings);
    console.log("[Settings POST] Saved successfully");
    res.json(settings);
  } catch (error) {
    console.error("[Settings POST] Error:", error);
    res.status(500).json({ error: "Failed to save settings", details: String(error) });
  }
});

console.log("[Settings Router] Routes registered");

export default router;
