const { db } = require("../../database/db");
const xlsx = require("xlsx");

class M365Service {
  // Get all data formatted like L365 appData = { companies: [], licenses: [], allocations: [] }
  getAllData() {
    const companies = db.prepare("SELECT * FROM companies").all();
    const licenses = db.prepare("SELECT * FROM m365_licenses").all();
    
    const allocationsRaw = db.prepare("SELECT * FROM m365_allocations").all();
    const allocations = allocationsRaw.map(alloc => {
      // Get users from personnel join
      const users = db.prepare(`
        SELECT p.id, p.first_name, p.last_name 
        FROM m365_allocation_users au
        JOIN personnel p ON au.personnel_id = p.id
        WHERE au.allocation_id = ?
      `).all(alloc.id).map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}` }));

      return {
        id: alloc.id,
        companyId: alloc.company_id,
        licenseId: alloc.license_id,
        quantity: alloc.quantity,
        period: alloc.period,
        users: users // Now returning objects with ID and Name
      };
    });

    return { companies, licenses, allocations };
  }

  // Save full state (from analysis or reset)
  saveAllData(data) {
    const { companies, licenses, allocations } = data;

    const transaction = db.transaction(() => {
      // Manage Companies (Now using main companies table)
      if (companies) {
        companies.forEach(company => {
          const exists = db.prepare("SELECT id FROM companies WHERE id = ?").get(company.id);
          if (exists) {
            db.prepare("UPDATE companies SET name = ? WHERE id = ?").run(company.name, company.id);
          } else {
            db.prepare("INSERT INTO companies (name) VALUES (?)").run(company.name);
          }
        });
      }

      // Manage Licenses
      if (licenses) {
        licenses.forEach(license => {
          const exists = db.prepare("SELECT id FROM m365_licenses WHERE id = ?").get(license.id);
          if (exists) {
            db.prepare("UPDATE m365_licenses SET name = ?, quantity = ?, unit_price = ?, currency = ? WHERE id = ?").run(
              license.name, license.quantity || 0, license.unitPrice || 0, license.currency || 'USD', license.id
            );
          } else {
            db.prepare("INSERT OR REPLACE INTO m365_licenses (id, name, quantity, unit_price, currency) VALUES (?, ?, ?, ?, ?)").run(
              license.id, license.name, license.quantity || 0, license.unitPrice || 0, license.currency || 'USD'
            );
          }
        });
        // Check for deletions if needed (skipped for stability unless requested)
      }

      // Manage Allocations
      if (allocations) {
        // Clear all allocations and recreate (simplest way to sync state from frontend)
        db.prepare("DELETE FROM m365_allocations").run();
        db.prepare("DELETE FROM m365_allocation_users").run();

        const insertAlloc = db.prepare("INSERT INTO m365_allocations (company_id, license_id, quantity, period) VALUES (?, ?, ?, ?)");
        const insertUser = db.prepare("INSERT INTO m365_allocation_users (allocation_id, personnel_id) VALUES (?, ?)");

        allocations.forEach(alloc => {
          const info = insertAlloc.run(alloc.companyId, alloc.licenseId, alloc.quantity, alloc.period || new Date().toISOString().slice(0, 7));
          if (alloc.users && Array.isArray(alloc.users)) {
            alloc.users.forEach(user => {
              // user can be an ID (integer) or an object with ID
              const pId = typeof user === 'object' ? user.id : user;
              if (pId) {
                 insertUser.run(info.lastInsertRowid, pId);
              }
            });
          }
        });
      }
    });

    transaction();
    return true;
  }

  getOptimizationRecommendations() {
    const sql = `
      SELECT 
        mau.id as allocation_user_id,
        mau.allocation_id,
        mau.personnel_id,
        mau.last_activity_date,
        mau.mail_active,
        mau.teams_active,
        p.first_name,
        p.last_name,
        p.email,
        c.name as company_name,
        ml.name as license_name,
        ml.unit_price,
        ml.currency
      FROM m365_allocation_users mau
      JOIN m365_allocations ma ON mau.allocation_id = ma.id
      JOIN m365_licenses ml ON ma.license_id = ml.id
      JOIN personnel p ON mau.personnel_id = p.id
      JOIN companies c ON ma.company_id = c.id
    `;
    
    const users = db.prepare(sql).all();
    const recommendations = [];
    let totalSavings = 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    users.forEach(user => {
      let isInactive = false;
      let reason = '';
      
      const lastActivity = user.last_activity_date ? new Date(user.last_activity_date) : null;

      // Rule 1: No activity for over 30 days
      if (!lastActivity || lastActivity < thirtyDaysAgo) {
        isInactive = true;
        const days = lastActivity 
          ? Math.floor((new Date() - lastActivity) / (1000 * 60 * 60 * 24))
          : '30+';
        reason = `Pasif Kullanıcı (${days} gündür işlem yapmadı)`;
      } 
      // Rule 2: Active recently but BOTH mail and teams are unused
      else if (user.mail_active === 0 && user.teams_active === 0) {
        isInactive = true;
        reason = 'Atıl Lisans (E-Posta ve Teams servisleri inaktif)';
      }

      if (isInactive) {
        const potentialSavings = user.unit_price || 0;
        totalSavings += potentialSavings;

        recommendations.push({
          id: user.allocation_user_id,
          personnelId: user.personnel_id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          companyName: user.company_name,
          licenseName: user.license_name,
          lastActivity: user.last_activity_date,
          reason: reason,
          monthlyCost: user.unit_price,
          currency: user.currency || 'USD',
          allocationId: user.allocation_id
        });
      }
    });

    return {
      recommendations,
      totalSavings: parseFloat(totalSavings.toFixed(2)),
      currency: 'USD'
    };
  }

  removeAllocationUser(allocationUserId) {
    const transaction = db.transaction(() => {
      const row = db.prepare("SELECT allocation_id FROM m365_allocation_users WHERE id = ?").get(allocationUserId);
      if (row) {
        db.prepare("DELETE FROM m365_allocation_users WHERE id = ?").run(allocationUserId);
        
        db.prepare(`
          UPDATE m365_allocations 
          SET quantity = (
            SELECT COUNT(*) 
            FROM m365_allocation_users 
            WHERE m365_allocation_users.allocation_id = ?
          ) 
          WHERE id = ?
        `).run(row.allocation_id, row.allocation_id);
        return true;
      }
      return false;
    });

    return transaction();
  }
}

module.exports = new M365Service();
