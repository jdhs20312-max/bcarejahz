import { Router } from "express";
import { getCompanySettings, saveCompanySettings } from "@workspace/db";

const router = Router();

console.log("[Settings Router] Registering routes... (v2)");

// Force rebuild for Railway deployment

// GET /api/settings - Get all company settings
router.get("/", async (_req, res) => {
  console.log("[Settings Router] GET / called");
  try {
    const settings = await getCompanySettings();
    console.log("[Settings Router] Returning settings with", settings.offers.length, "offers");
    res.json(settings);
  } catch (error) {
    console.error("[Settings GET] Error:", error);
    res.status(500).json({ error: "Failed to get settings", details: String(error) });
  }
});

// POST /api/settings - Update company settings (Express5 workaround for PUT)
router.post("/", async (req, res) => {
  console.log("[Settings Router] POST / called");
  console.log("[Settings Router] Request method:", req.method);
  console.log("[Settings Router] Request body:", JSON.stringify(req.body).substring(0, 200));
  
  const settings = req.body;
  
  if (!settings || !Array.isArray(settings.offers)) {
    console.error("[Settings POST] Invalid format:", settings);
    res.status(400).json({ error: "Invalid settings format" });
    return;
  }

  try {
    console.log("[Settings POST] Received settings with", settings.offers.length, "offers");
    await saveCompanySettings(settings);
    console.log("[Settings POST] Saved successfully to database");
    res.json(settings);
  } catch (error) {
    console.error("[Settings POST] Error:", error);
    res.status(500).json({ error: "Failed to save settings", details: String(error) });
  }
});

console.log("[Settings Router] Routes registered");

export default router;
