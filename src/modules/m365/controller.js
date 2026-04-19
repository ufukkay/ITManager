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

}

module.exports = new M365Controller();
