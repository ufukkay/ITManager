const MasterDataService = require('./service');
const { parseM365Excel } = require('./services/m365InvoiceParser');

class MasterDataController {
    // Shirketler
    static async getCompanies(req, res) {
        try {
            const data = await MasterDataService.getAllCompanies();
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async createCompany(req, res) {
        try {
            const id = await MasterDataService.createCompany(req.body);
            res.status(201).json({ id });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async updateCompany(req, res) {
        try {
            await MasterDataService.updateCompany(req.params.id, req.body);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async deleteCompany(req, res) {
        try {
            await MasterDataService.deleteCompany(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // Departmanlar
    static async getDepartments(req, res) {
        try {
            const { companyId } = req.query;
            const data = await MasterDataService.getAllDepartments(companyId);
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async createDepartment(req, res) {
        try {
            const id = await MasterDataService.createDepartment(req.body);
            res.status(201).json({ id });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async updateDepartment(req, res) {
        try {
            await MasterDataService.updateDepartment(req.params.id, req.body);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async deleteDepartment(req, res) {
        try {
            await MasterDataService.deleteDepartment(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // Masraf Yerleri
    static async getCostCenters(req, res) {
        try {
            const { companyId } = req.query;
            const data = await MasterDataService.getAllCostCenters(companyId);
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async createCostCenter(req, res) {
        try {
            const id = await MasterDataService.createCostCenter(req.body);
            res.status(201).json({ id });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async updateCostCenter(req, res) {
        try {
            await MasterDataService.updateCostCenter(req.params.id, req.body);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async deleteCostCenter(req, res) {
        try {
            await MasterDataService.deleteCostCenter(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // Personeller
    static async getPersonnel(req, res) {
        try {
            const data = await MasterDataService.getAllPersonnel(req.query);
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async createPersonnel(req, res) {
        try {
            const id = await MasterDataService.createPersonnel(req.body);
            res.status(201).json({ id });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async updatePersonnel(req, res) {
        try {
            await MasterDataService.updatePersonnel(req.params.id, req.body);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async deletePersonnel(req, res) {
        try {
            await MasterDataService.deletePersonnel(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async bulkDeletePersonnel(req, res) {
        try {
            await MasterDataService.bulkDeletePersonnel(req.body.ids);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async bulkUpdatePersonnel(req, res) {
        try {
            await MasterDataService.bulkUpdatePersonnel(req.body.ids, req.body.data);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // Araclar
    static async getVehicles(req, res) {
        try {
            const data = await MasterDataService.getAllVehicles();
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async createVehicle(req, res) {
        try {
            const id = await MasterDataService.createVehicle(req.body);
            res.status(201).json({ id });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async updateVehicle(req, res) {
        try {
            await MasterDataService.updateVehicle(req.params.id, req.body);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async deleteVehicle(req, res) {
        try {
            await MasterDataService.deleteVehicle(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // Lokasyonlar
    static async getLocations(req, res) {
        try {
            const data = await MasterDataService.getAllLocations();
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async createLocation(req, res) {
        try {
            const id = await MasterDataService.createLocation(req.body);
            res.status(201).json({ id });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async updateLocation(req, res) {
        try {
            await MasterDataService.updateLocation(req.params.id, req.body);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async deleteLocation(req, res) {
        try {
            await MasterDataService.deleteLocation(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // Operatorler
    static async getOperators(req, res) {
        try {
            const data = await MasterDataService.getAllOperators();
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async createOperator(req, res) {
        try {
            const id = await MasterDataService.createOperator(req.body.name);
            res.status(201).json({ id });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async updateOperator(req, res) {
        try {
            await MasterDataService.updateOperator(req.params.id, req.body.name);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async deleteOperator(req, res) {
        try {
            await MasterDataService.deleteOperator(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // Paketler
    static async getPackages(req, res) {
        try {
            const { type } = req.query;
            const data = await MasterDataService.getAllPackages(type);
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async createPackage(req, res) {
        try {
            const id = await MasterDataService.createPackage(req.body);
            res.status(201).json({ id });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async updatePackage(req, res) {
        try {
            await MasterDataService.updatePackage(req.params.id, req.body);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async deletePackage(req, res) {
        try {
            await MasterDataService.deletePackage(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // Lisanslar
    static async getLicenses(req, res) {
        try {
            const data = await MasterDataService.getAllLicenses();
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async createLicense(req, res) {
        try {
            const id = await MasterDataService.createLicense(req.body);
            res.status(201).json({ id });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async updateLicense(req, res) {
        try {
            await MasterDataService.updateLicense(req.params.id, req.body);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async deleteLicense(req, res) {
        try {
            await MasterDataService.deleteLicense(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    // Sunucular
    static async getServers(req, res) {
        try {
            const { type } = req.query;
            const data = await MasterDataService.getAllServers(type);
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async createServer(req, res) {
        try {
            const id = await MasterDataService.createServer(req.body);
            res.status(201).json({ id });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async updateServer(req, res) {
        try {
            await MasterDataService.updateServer(req.params.id, req.body);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async deleteServer(req, res) {
        try {
            await MasterDataService.deleteServer(req.params.id);
            res.json({ success: true });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getDeleteImpact(req, res) {
        try {
            const { type, id } = req.params;
            const data = await MasterDataService.getDeleteImpact(type, id);
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getPersonnelFinancialHistory(req, res) {
        try {
            const { id } = req.params;
            const history = await MasterDataService.getPersonnelFinancialHistory(id);
            res.json(history);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async getFinancialStats(req, res) {
        try {
            const stats = await MasterDataService.getGlobalFinancialStats();
            res.json(stats);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }

    static async uploadM365Invoice(req, res) {
        try {
            if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'Dosya yüklenmedi.' });
            
            const { period } = req.body;
            if (!period) return res.status(400).json({ message: 'Dönem seçimi zorunludur.' });

            let totalInserted = 0;

            for (const file of req.files) {
                const records = await parseM365Excel(file.buffer);
                
                for (const rec of records) {
                    const personnel = MasterDataService.findPersonnelByEmail(rec.email);
                    
                    // Add to invoices table as 'm365' type
                    await MasterDataService.insertInvoiceRecord({
                        invoice_type: 'm365',
                        operator: 'Microsoft',
                        period: period,
                        phone_no: null,
                        personnel_id: personnel ? personnel.id : null,
                        company_id: personnel ? personnel.company_id : null,
                        cost_center_id: personnel ? personnel.cost_center_id : null,
                        source_file: file.originalname,
                        tariff: rec.tariff,
                        amount: rec.amount,
                        tax_kdv: 0,
                        tax_oiv: 0,
                        total_amount: rec.amount,
                        is_matched: personnel ? 1 : 0
                    });
                    totalInserted++;
                }
            }

            res.json({ success: true, message: `${totalInserted} adet lisans maliyet kaydı işlendi.` });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    }
}

module.exports = MasterDataController;
