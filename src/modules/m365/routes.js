const express = require("express");
const router = express.Router();
const controller = require("./controller");
const { hasPermission } = require("../../middleware/auth");

// We map L365 frontend expectations: GET /api/data and POST /api/save
router.get("/data", hasPermission('m365:view'), controller.getData);
router.post("/save", hasPermission('m365:edit'), controller.saveData);
router.get("/recommendations", hasPermission('m365:view'), controller.getRecommendations);
router.post("/recommendations/apply", hasPermission('m365:edit'), controller.applyRecommendation);

module.exports = router;
