const m365Service = require("./service");

class M365Controller {
  
  async getData(req, res) {
    try {
      const data = m365Service.getAllData();
      res.json(data);
    } catch (error) {
      console.error("[M365Controller] getData Error:", error);
      res.status(500).json({ error: "Veriler alınırken hata oluştu" });
    }
  }

  async saveData(req, res) {
    try {
      const data = req.body;
      m365Service.saveAllData(data);
      res.json({ success: true, message: "Veriler başarıyla kaydedildi." });
    } catch (error) {
      console.error("[M365Controller] saveData Error:", error);
      res.status(500).json({ error: "Veriler kaydedilirken hata oluştu" });
    }
  }

  async getRecommendations(req, res) {
    try {
      const data = m365Service.getOptimizationRecommendations();
      res.json(data);
    } catch (error) {
      console.error("[M365Controller] getRecommendations Error:", error);
      res.status(500).json({ error: "Öneriler alınırken hata oluştu" });
    }
  }

  async getSummary(req, res) {
    try {
      const data = m365Service.getSummaryReport();
      res.json(data);
    } catch (error) {
      console.error("[M365Controller] getSummary Error:", error);
      res.status(500).json({ error: "Özet rapor alınırken hata oluştu" });
    }
  }

}

module.exports = new M365Controller();
