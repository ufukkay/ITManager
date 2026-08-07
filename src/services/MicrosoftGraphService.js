const { db } = require('../database/db');
const axios = require('axios');

function normalizeTr(str) {
  return (str || '')
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .trim();
}

function parseName(displayName, givenName, surname) {
  if (givenName && surname) {
    return { first_name: givenName.trim(), last_name: surname.trim() };
  }
  if (displayName) {
    const cleaned = displayName.replace(/\s*\|.*$/, '').replace(/\s*\(.*\)$/, '').trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      const first = parts.slice(0, -1).join(' ');
      return { first_name: first, last_name: last };
    }
    return { first_name: cleaned, last_name: '' };
  }
  return { first_name: '', last_name: '' };
}

function getEmailDomain(user) {
  const email = user.mail || user.userPrincipalName || '';
  return (email.split('@')[1] || '').toLowerCase();
}

// Bilinen Microsoft SKU part number -> okunabilir isim eşleştirmesi.
// Liste tam değildir; eşleşmeyen SKU'lar humanizeSkuName() ile okunabilir hale getirilir.
const SKU_NAME_MAP = {
  ENTERPRISEPACK: 'Microsoft 365 E3',
  SPE_E3: 'Microsoft 365 E3',
  ENTERPRISEPREMIUM: 'Microsoft 365 E5',
  SPE_E5: 'Microsoft 365 E5',
  SPB: 'Microsoft 365 Business Premium',
  O365_BUSINESS_PREMIUM: 'Microsoft 365 Business Premium',
  O365_BUSINESS_ESSENTIALS: 'Microsoft 365 Business Basic',
  SMB_BUSINESS_PREMIUM: 'Microsoft 365 Business Standard',
  STANDARDPACK: 'Office 365 E1',
  DESKLESSPACK: 'Office 365 F3',
  SPE_F1: 'Microsoft 365 F3',
  EXCHANGESTANDARD: 'Exchange Online (Plan 1)',
  EXCHANGEENTERPRISE: 'Exchange Online (Plan 2)',
  POWER_BI_PRO: 'Power BI Pro',
  POWER_BI_STANDARD: 'Power BI (Ücretsiz)',
  Microsoft_365_Copilot: 'Microsoft 365 Copilot',
  MICROSOFT_365_COPILOT_DEPT: 'Microsoft 365 Copilot (Departman Denemesi)',
  FLOW_FREE: 'Power Automate (Ücretsiz)',
  POWERAPPS_VIRAL: 'Power Apps (Deneme)',
  POWERAPPS_PER_APP_IW: 'Power Apps (Per App)',
  CCIBOTS_PRIVPREV_VIRAL: 'Copilot Studio (Deneme)',
  WINDOWS_STORE: 'Windows Store Hizmeti',
  Microsoft_Teams_Exploratory_Dept: 'Teams Keşif Sürümü (Departman)',
  TEAMS_EXPLORATORY: 'Teams Keşif Sürümü',
  Dynamics_365_Customer_Service_Enterprise_viral_trial: 'Dynamics 365 Customer Service (Deneme)',
  MCOMEETADV: 'Microsoft 365 Audio Conferencing',
  VISIOCLIENT: 'Visio Plan 2',
  PROJECTPREMIUM: 'Project Plan 5',
  PROJECTPROFESSIONAL: 'Project Plan 3',
  AAD_PREMIUM: 'Entra ID P1',
  AAD_PREMIUM_P2: 'Entra ID P2',
  EMS: 'Enterprise Mobility + Security E3',
  EMSPREMIUM: 'Enterprise Mobility + Security E5',
  INTUNE_A: 'Intune'
};

function humanizeSkuName(skuPartNumber) {
  if (!skuPartNumber) return 'Bilinmeyen Lisans';
  return skuPartNumber
    .split('_')
    .map(word => {
      if (word.length <= 3 && word === word.toUpperCase()) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function resolveSkuFriendlyName(skuPartNumber) {
  return SKU_NAME_MAP[skuPartNumber] || humanizeSkuName(skuPartNumber);
}

// Graph Reports CSV çıktısını (quote-aware) satır/sütun dizisine çevirir.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r') {
      // yoksay
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

class MicrosoftGraphService {
  async getSettings() {
    let settings = db.prepare("SELECT * FROM entra_settings LIMIT 1").get();
    if (!settings) {
      db.prepare(`
        INSERT INTO entra_settings (tenant_id, client_id, client_secret, is_active, sync_interval_minutes, allowed_domains)
        VALUES ('', '', '', 0, 60, '["talay.com"]')
      `).run();
      settings = db.prepare("SELECT * FROM entra_settings LIMIT 1").get();
    }
    if (settings && !settings.allowed_domains) {
      settings.allowed_domains = '["talay.com"]';
    }
    return settings;
  }

  async saveSettings(settingsData) {
    const { tenant_id, client_id, client_secret, is_active, sync_interval_minutes, allowed_domains } = settingsData;
    const existing = await this.getSettings();
    
    let secretToSave = client_secret;
    if (!client_secret || client_secret.trim() === '') {
      secretToSave = existing.client_secret;
    }

    db.prepare(
      'UPDATE entra_settings SET tenant_id = ?, client_id = ?, client_secret = ?, is_active = ?, sync_interval_minutes = ?, allowed_domains = ? WHERE id = ?'
    ).run(
      tenant_id, client_id, secretToSave,
      is_active ? 1 : 0,
      sync_interval_minutes || 60,
      allowed_domains || '["talay.com"]',
      existing.id
    );
    return this.getSettings();
  }

  async getToken(settings) {
    const tokenUrl = `https://login.microsoftonline.com/${settings.tenant_id}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', settings.client_id);
    params.append('client_secret', settings.client_secret);
    params.append('scope', 'https://graph.microsoft.com/.default');

    const tokenRes = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return tokenRes.data.access_token;
  }

  async getAllAzureUsers(token) {
    let allUsers = [];
    let url = 'https://graph.microsoft.com/v1.0/users?$select=id,displayName,givenName,surname,mail,userPrincipalName,jobTitle,department,companyName,accountEnabled,employeeId,mobilePhone,assignedLicenses&$top=999';
    while (url) {
      const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      allUsers = allUsers.concat(res.data.value || []);
      url = res.data['@odata.nextLink'] || null;
    }
    return allUsers;
  }

  // Son 30 günün Exchange/Teams kullanım raporunu çeker, UPN bazlı bir harita döner:
  // { [upn]: { mailActive, teamsActive, lastActivityDate } }
  // Reports.Read.All izni gerektirir. Rapor çekilemezse boş harita döner (çağıran taraf güvenli varsayılana düşer).
  async getUsageReport(token) {
    const url = "https://graph.microsoft.com/v1.0/reports/getOffice365ActiveUserDetail(period='D30')";
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'text'
    });

    const rows = parseCsv(res.data);
    if (rows.length < 2) return {};

    const header = rows[0];
    const col = (name) => header.indexOf(name);
    const upnIdx = col('User Principal Name');
    const exLastIdx = col('Exchange Last Activity Date');
    const teamsLastIdx = col('Teams Last Activity Date');
    if (upnIdx === -1) return {};

    const now = new Date();
    const parseActivity = (dateStr) => {
      if (!dateStr) return { active: 0, date: null };
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { active: 0, date: null };
      const daysAgo = (now - d) / (1000 * 60 * 60 * 24);
      return { active: daysAgo <= 30 ? 1 : 0, date: d.toISOString() };
    };

    const map = {};
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const upn = (r[upnIdx] || '').trim().toLowerCase();
      if (!upn) continue;

      const ex = parseActivity(r[exLastIdx]);
      const teams = parseActivity(r[teamsLastIdx]);

      let lastActivityDate = null;
      if (ex.date && teams.date) {
        lastActivityDate = new Date(ex.date) > new Date(teams.date) ? ex.date : teams.date;
      } else {
        lastActivityDate = ex.date || teams.date || null;
      }

      map[upn] = { mailActive: ex.active, teamsActive: teams.active, lastActivityDate };
    }
    return map;
  }

  // Benzersiz domain listesi ve istatistiklerini döner
  async getAzureDomains() {
    const settings = await this.getSettings();
    const isMock = !settings.is_active || 
                   !settings.tenant_id || 
                   settings.tenant_id.includes('mock') || 
                   settings.tenant_id.includes('sandbox') ||
                   settings.tenant_id === '';

    if (isMock) {
      return [
        { domain: 'talay.com', total: 15, licensed: 12, enabled: 14 },
        { domain: 'partner.com', total: 5, licensed: 3, enabled: 4 },
        { domain: 'test.com', total: 3, licensed: 1, enabled: 2 }
      ];
    }

    const token = await this.getToken(settings);
    const allUsers = await this.getAllAzureUsers(token);

    const domainStats = {};
    allUsers.forEach(u => {
      const domain = getEmailDomain(u);
      // #EXT# işareti B2B guest kullanıcılarda UPN'nin @ öncesindeki (yerel) kısmında yer alır,
      // domain (split('@')[1]) içinde asla görünmez — bu yüzden UPN'nin kendisi kontrol edilmeli
      // (bkz. fullPersonnelSync'teki aynı kontrol, satır ~292).
      const upn = u.userPrincipalName || '';
      if (!domain || upn.toUpperCase().includes('#EXT#')) return;
      if (!domainStats[domain]) {
        domainStats[domain] = { domain, total: 0, licensed: 0, enabled: 0 };
      }
      domainStats[domain].total++;
      if (u.assignedLicenses && u.assignedLicenses.length > 0) domainStats[domain].licensed++;
      if (u.accountEnabled) domainStats[domain].enabled++;
    });

    return Object.values(domainStats).sort((a, b) => b.total - a.total);
  }

  // Tam personel senkronizasyonu - Azure'dan seçili domain'lerin kullanıcılarını içe aktar
  async fullPersonnelSync(allowedDomains, domainCompanyMap = {}) {
    const settings = await this.getSettings();
    const isMock = !settings.is_active || 
                   !settings.tenant_id || 
                   settings.tenant_id.includes('mock') || 
                   settings.tenant_id.includes('sandbox') ||
                   settings.tenant_id === '';

    if (isMock) {
      return await this.runSimulatedPersonnelSync(allowedDomains, domainCompanyMap);
    }

    const domains = Array.isArray(allowedDomains) && allowedDomains.length > 0
      ? allowedDomains
      : (JSON.parse(settings.allowed_domains || '["talay.com"]'));

    console.log(`Tam personel senkronizasyonu başlatılıyor. Domainler: ${domains.join(', ')}`);

    const token = await this.getToken(settings);
    const allAzureUsers = await this.getAllAzureUsers(token);
    console.log(`Azure'dan ${allAzureUsers.length} kullanıcı çekildi.`);

    // Seçili domainlere göre filtrele (servis hesapları ve EXT hariç)
    const filteredUsers = allAzureUsers.filter(u => {
      const domain = getEmailDomain(u);
      const upn = u.userPrincipalName || '';
      if (upn.includes('#EXT#')) return false;
      if (upn.startsWith('_') || /^[\d]/.test(upn)) return false; // servis hesapları
      return domains.includes(domain);
    });
    console.log(`Domain filtresi sonrası: ${filteredUsers.length} kullanıcı`);

    // Mevcut personeli yükle
    const existingPersonnel = db.prepare("SELECT * FROM personnel").all();

    // Email ve isim bazlı eşleştirme haritası
    const existingByEmail = {};
    const existingByEmailPrefix = {};
    const existingByNormName = {};
    existingPersonnel.forEach(p => {
      if (p.email) {
        const em = p.email.toLowerCase();
        existingByEmail[em] = p;
        const prefix = em.split('@')[0];
        if (prefix && !existingByEmailPrefix[prefix]) existingByEmailPrefix[prefix] = p;
      }
      const normKey = `${normalizeTr(p.first_name)}.${normalizeTr(p.last_name)}`;
      if (!existingByNormName[normKey]) existingByNormName[normKey] = p;
    });

    // Şirket ve departman lookup yardımcıları
    // Şirket bilgisi Azure'dan kullanıcı bazında (companyName alanı) okunur.
    // Aynı domain birden fazla şirkete ait kullanıcıları barındırabilir.
    const getOrCreateCompany = (companyName) => {
      if (!companyName || companyName.trim() === '') return null;
      const name = companyName.trim();
      let co = db.prepare("SELECT id FROM companies WHERE name LIKE ?").get(name);
      if (!co) {
        const result = db.prepare("INSERT INTO companies (name) VALUES (?)").run(name);
        co = { id: result.lastInsertRowid };
      }
      return co.id;
    };

    const getOrCreateDepartment = (deptName) => {
      if (!deptName || deptName.trim() === '') return null;
      const name = deptName.trim();
      let dept = db.prepare("SELECT id FROM departments WHERE name LIKE ?").get(name);
      if (!dept) {
        const result = db.prepare("INSERT INTO departments (name) VALUES (?)").run(name);
        dept = { id: result.lastInsertRowid };
      }
      return dept.id;
    };

    // Eşleştirme sonuçları
    const toUpdate = []; // { azureUser, existingPerson }
    const toInsert = []; // azureUser (yeni)
    const matchedPersonnelIds = new Set();

    for (const azureUser of filteredUsers) {
      const email = (azureUser.mail || azureUser.userPrincipalName || '').toLowerCase();
      const { first_name, last_name } = parseName(azureUser.displayName, azureUser.givenName, azureUser.surname);
      const normKey = `${normalizeTr(first_name)}.${normalizeTr(last_name)}`;

      let existing = null;
      // 1. Azure entra_id ile eşleşme
      if (azureUser.id) {
        existing = db.prepare("SELECT * FROM personnel WHERE entra_id = ?").get(azureUser.id);
      }
      // 2. Email tam eşleşme
      if (!existing && email) {
        existing = existingByEmail[email];
      }
      // 3. Email kullanıcı adı prefix'i (örn. anil.sorlu) ile eşleşme
      if (!existing && email) {
        const prefix = email.split('@')[0];
        if (prefix && existingByEmailPrefix[prefix]) {
          existing = existingByEmailPrefix[prefix];
        }
      }
      // 4. Normalize isim ile eşleşme
      if (!existing && normKey && normKey !== '.') {
        existing = existingByNormName[normKey];
      }

      if (existing && !matchedPersonnelIds.has(existing.id)) {
        toUpdate.push({ azureUser, existingPerson: existing });
        matchedPersonnelIds.add(existing.id);
      } else if (!existing) {
        toInsert.push(azureUser);
      }
    }

    // Eşleşmeyen mevcut personel (Azure'da olmayan)
    const unmatchedPersonnel = existingPersonnel.filter(p => !matchedPersonnelIds.has(p.id));

    // Max employee_id'yi bulup sonraki sicil no değerini belirle
    const lastRow = db.prepare("SELECT MAX(employee_id) as max_id FROM personnel").get();
    let nextEmpId = Math.max(lastRow.max_id || 999, 999) + 1;

    const getCleanEmployeeId = (azureEmpId) => {
      if (azureEmpId) {
        const parsed = parseInt(azureEmpId);
        if (!isNaN(parsed)) {
          // Bu sicil numarasının veritabanında başka birine ait olup olmadığını kontrol et
          const taken = db.prepare("SELECT id FROM personnel WHERE employee_id = ?").get(parsed);
          if (!taken) return parsed;
        }
      }
      return nextEmpId++;
    };

    console.log(`Eşleşen (güncellenecek): ${toUpdate.length}`);
    console.log(`Yeni (eklenecek): ${toInsert.length}`);
    console.log(`Eşleşmeyen (legacy/manual kalacak): ${unmatchedPersonnel.length}`);

    // Transaction ile senkronizasyon
    const syncTransaction = db.transaction(() => {
      // 1. Azure'dan eşleşen personeli güncelle (ID korunur, FK referansları bozulmaz)
      const updateStmt = db.prepare(`
        UPDATE personnel SET 
          first_name = ?, last_name = ?, email = ?, title = ?, title_en = ?, title_tr = ?,
          phone = COALESCE(?, phone),
          company_id = COALESCE(?, company_id), department_id = COALESCE(?, department_id),
          status = ?, source = 'azure', entra_id = ?,
          employee_id = COALESCE(employee_id, ?)
        WHERE id = ?
      `);

      for (const { azureUser, existingPerson } of toUpdate) {
        const { first_name, last_name } = parseName(azureUser.displayName, azureUser.givenName, azureUser.surname);
        const email = azureUser.mail || azureUser.userPrincipalName;
        const companyId = getOrCreateCompany(azureUser.companyName);
        const deptId = getOrCreateDepartment(azureUser.department);
        const resolvedEmpId = getCleanEmployeeId(azureUser.employeeId);
        const statusVal = azureUser.accountEnabled === false ? 'passive' : 'active';
        
        updateStmt.run(
          first_name, last_name, email,
          azureUser.jobTitle || null, azureUser.jobTitle || null, azureUser.jobTitle || null,
          azureUser.mobilePhone || null,
          companyId, deptId,
          statusVal,
          azureUser.id,
          resolvedEmpId,
          existingPerson.id
        );
      }

      // 2. Yeni Azure kullanıcılarını ekle
      const insertStmt = db.prepare(`
        INSERT INTO personnel (employee_id, first_name, last_name, email, title, title_en, title_tr, phone, company_id, department_id, status, source, entra_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'azure', ?)
      `);

      for (const azureUser of toInsert) {
        const { first_name, last_name } = parseName(azureUser.displayName, azureUser.givenName, azureUser.surname);
        const email = azureUser.mail || azureUser.userPrincipalName;
        const companyId = getOrCreateCompany(azureUser.companyName);
        const deptId = getOrCreateDepartment(azureUser.department);
        const resolvedEmpId = getCleanEmployeeId(azureUser.employeeId);
        const statusVal = azureUser.accountEnabled === false ? 'passive' : 'active';

        insertStmt.run(
          resolvedEmpId,
          first_name, last_name, email,
          azureUser.jobTitle || null, azureUser.jobTitle || null, azureUser.jobTitle || null,
          azureUser.mobilePhone || null,
          companyId, deptId, statusVal, azureUser.id
        );
      }

      // 3. Eşleşmeyen mevcut personeli 'legacy' olarak işaretle (silinmez, referanslar korunur)
      if (unmatchedPersonnel.length > 0) {
        const legacyStmt = db.prepare("UPDATE personnel SET source = 'legacy' WHERE id = ?");
        for (const p of unmatchedPersonnel) {
          legacyStmt.run(p.id);
        }
      }
    });

    syncTransaction();

    // allowed_domains ve domain_company_map'i güncelle
    db.prepare("UPDATE entra_settings SET allowed_domains = ?, domain_company_map = ?, last_sync = CURRENT_TIMESTAMP WHERE id = ?")
      .run(JSON.stringify(domains), JSON.stringify(domainCompanyMap || {}), settings.id);

    const total = db.prepare("SELECT COUNT(*) as c FROM personnel").get().c;

    return {
      success: true,
      message: `Personel Azure senkronizasyonu tamamlandı. ${toUpdate.length} güncellendi, ${toInsert.length} yeni eklendi.`,
      details: {
        updated: toUpdate.length,
        inserted: toInsert.length,
        legacy: unmatchedPersonnel.length,
        total,
        domains
      }
    };
  }

  async sync() {
    const settings = await this.getSettings();
    
    const isMock = !settings.is_active || 
                   !settings.tenant_id || 
                   settings.tenant_id.includes('mock') || 
                   settings.tenant_id.includes('sandbox') ||
                   settings.tenant_id === '';
                   
    let result;
    if (isMock) {
      result = await this.runSimulatedSync();
    } else {
      // Gerçek tenant yapılandırılmışken senkronizasyon hata verirse (ağ/izin/throttle),
      // sessizce sahte/rastgele veriye düşmüyoruz — bu, gerçek lisans/atama verisini
      // fark edilmeden bozardı. Hata olduğu gibi çağırana (admin route / scheduler) iletilir,
      // last_sync GÜNCELLENMEZ ki bir sonraki kontrolde tekrar denensin.
      result = await this.runRealSync(settings);
    }

    db.prepare("UPDATE entra_settings SET last_sync = CURRENT_TIMESTAMP WHERE id = ?").run(settings.id);
    return result;
  }

  async runSimulatedSync(fallback = false) {
    console.log("Simüle edilmiş Microsoft Graph senkronizasyonu başlatılıyor...");
    
    const mockLicenses = [
      { id: 1, name: 'Microsoft 365 E5', price: 57.00 },
      { id: 2, name: 'Microsoft 365 E3', price: 36.00 },
      { id: 3, name: 'Microsoft 365 Business Premium', price: 22.00 },
      { id: 4, name: 'Microsoft 365 Business Standard', price: 12.50 },
      { id: 5, name: 'Microsoft 365 Business Basic', price: 6.00 }
    ];

    for (const lic of mockLicenses) {
      const exists = db.prepare("SELECT id FROM m365_licenses WHERE id = ? OR name = ?").get(lic.id, lic.name);
      if (exists) {
        db.prepare("UPDATE m365_licenses SET name = ?, unit_price = ? WHERE id = ?").run(lic.name, lic.price, exists.id);
      } else {
        db.prepare('INSERT INTO m365_licenses (id, name, quantity, unit_price, currency, category) VALUES (?, ?, ?, ?, \'USD\', \'M365\')')
          .run(lic.id, lic.name, 50, lic.price);
      }
    }

    const personnel = db.prepare("SELECT * FROM personnel WHERE status = 'active'").all();
    if (personnel.length === 0) {
      return {
        success: true,
        message: fallback 
          ? "Gerçek bağlantı başarısız oldu. Simülasyon çalıştırıldı fakat eşleştirilecek aktif personel bulunamadı."
          : "Senkronizasyon simülasyonu tamamlandı (Eşleştirilecek personel bulunamadı).",
        details: { licensesSynced: mockLicenses.length, usersSynced: 0 }
      };
    }

    db.prepare("DELETE FROM m365_allocation_users").run();
    db.prepare("DELETE FROM m365_allocations").run();

    const insertAlloc = db.prepare("INSERT INTO m365_allocations (company_id, license_id, quantity, period) VALUES (?, ?, 0, ?)");
    const insertAllocUser = db.prepare('INSERT INTO m365_allocation_users (allocation_id, personnel_id, last_activity_date, mail_active, teams_active) VALUES (?, ?, ?, ?, ?)');

    const currentPeriod = new Date().toISOString().slice(0, 7);
    let allocatedUsersCount = 0;

    personnel.forEach((person, index) => {
      if (index % 5 === 4) return; 
      const lic = mockLicenses[index % mockLicenses.length];
      
      let allocation = db.prepare("SELECT id FROM m365_allocations WHERE company_id = ? AND license_id = ?").get(person.company_id, lic.id);
      if (!allocation) {
        const info = insertAlloc.run(person.company_id, lic.id, currentPeriod);
        allocation = { id: info.lastInsertRowid };
      }

      let lastActivityDate = new Date();
      let mailActive = 1;
      let teamsActive = 1;

      if (index % 7 === 0) {
        lastActivityDate.setDate(lastActivityDate.getDate() - 35 - (index % 10));
        mailActive = 0;
        teamsActive = 0;
      } else if (index % 7 === 1) {
        lastActivityDate.setDate(lastActivityDate.getDate() - 2);
        mailActive = 0;
        teamsActive = 0;
      } else {
        lastActivityDate.setDate(lastActivityDate.getDate() - (index % 5));
      }

      insertAllocUser.run(allocation.id, person.id, lastActivityDate.toISOString(), mailActive, teamsActive);
      allocatedUsersCount++;
    });

    db.prepare('UPDATE m365_allocations SET quantity = (SELECT COUNT(*) FROM m365_allocation_users WHERE m365_allocation_users.allocation_id = m365_allocations.id)').run();

    return {
      success: true,
      message: fallback 
        ? "Gerçek bağlantı başarısız oldu. Simüle edilmiş Microsoft Graph senkronizasyonu tamamlandı."
        : "Microsoft Graph senkronizasyon simülasyonu başarıyla tamamlandı.",
      details: { licensesSynced: mockLicenses.length, usersSynced: allocatedUsersCount }
    };
  }

  async runRealSync(settings) {
    console.log("Gerçek Microsoft Graph senkronizasyonu başlatılıyor...", settings.tenant_id);
    
    const token = await this.getToken(settings);
    
    // Get Subscribed SKUs (Licenses)
    const skuRes = await axios.get('https://graph.microsoft.com/v1.0/subscribedSkus', {
      headers: { Authorization: `Bearer ${token}` }
    });

    const graphLicenses = skuRes.data.value || [];
    const idMap = {};

    for (const sku of graphLicenses) {
      const friendlyName = resolveSkuFriendlyName(sku.skuPartNumber);

      let lic = db.prepare("SELECT id FROM m365_licenses WHERE name = ? OR sku_id = ?").get(friendlyName, sku.skuId);
      let licId;
      if (lic) {
        licId = lic.id;
        db.prepare("UPDATE m365_licenses SET quantity = ?, consumed_units = ?, sku_id = ?, sku_part_number = ? WHERE id = ?")
          .run(sku.prepaidUnits?.enabled || 0, sku.consumedUnits || 0, sku.skuId, sku.skuPartNumber, licId);
      } else {
        // Bilinmeyen SKU'lar için fiyat 0 olarak bırakılır; gerçek birim fiyat Lisans Kataloğu ekranından girilmelidir.
        let price = 0;
        if (friendlyName.includes('E5')) price = 57.00;
        else if (friendlyName.includes('E3')) price = 36.00;
        else if (friendlyName.includes('Business Premium')) price = 22.00;
        else if (friendlyName.includes('Business Standard')) price = 12.50;
        else if (friendlyName.includes('Business Basic')) price = 6.00;

        const info = db.prepare('INSERT INTO m365_licenses (name, quantity, unit_price, currency, category, sku_id, sku_part_number, consumed_units) VALUES (?, ?, ?, \'USD\', \'M365\', ?, ?, ?)')
          .run(friendlyName, sku.prepaidUnits?.enabled || 0, price, sku.skuId, sku.skuPartNumber, sku.consumedUnits || 0);
        licId = info.lastInsertRowid;
      }
      idMap[sku.skuId] = licId;
    }

    // Get users with license info (paginated)
    const allUsers = await this.getAllAzureUsers(token);

    // Gerçek kullanım verisi (Reports.Read.All). Çekilemezse boş harita ile devam edilir
    // (eşleşmeyen kullanıcılar güvenli varsayılan olarak "aktif" kabul edilir, yanlış pasif etiketlemesi önlenir).
    let usageMap = {};
    try {
      usageMap = await this.getUsageReport(token);
      console.log(`Kullanım raporu alındı: ${Object.keys(usageMap).length} kullanıcı.`);
    } catch (usageErr) {
      console.error('Kullanım raporu (Reports.Read.All) alınamadı, aktivite verisi olmadan devam ediliyor:', usageErr.response?.data || usageErr.message);
    }

    db.prepare("DELETE FROM m365_allocation_users").run();
    db.prepare("DELETE FROM m365_allocations").run();

    const insertAlloc = db.prepare("INSERT INTO m365_allocations (company_id, license_id, quantity, period) VALUES (?, ?, 0, ?)");
    const insertAllocUser = db.prepare('INSERT INTO m365_allocation_users (allocation_id, personnel_id, last_activity_date, mail_active, teams_active) VALUES (?, ?, ?, ?, ?)');

    const currentPeriod = new Date().toISOString().slice(0, 7);
    let matchedUsersCount = 0;
    // Eşleşen personel olduğu halde Graph'ın assignedLicenses döndürmediği kullanıcı sayısı —
    // önceden bu sessizce atlanıyordu (bkz. cross-tenant/guest tipi hesaplar, ör. Sinan Ozpolat
    // vakası: assignedLicenses alanı hiç dönmüyor). Artık loglanıp sonuç mesajında da gösteriliyor.
    let skippedNoLicenseCount = 0;
    let skippedUnknownSkuCount = 0;

    for (const gUser of allUsers) {
      const email = gUser.mail || gUser.userPrincipalName;
      if (!email) continue;

      const person = db.prepare("SELECT id, company_id FROM personnel WHERE email = ? AND status = 'active'").get(email)
        || db.prepare("SELECT id, company_id FROM personnel WHERE entra_id = ? AND status = 'active'").get(gUser.id);
      if (!person) continue;

      if (!gUser.assignedLicenses || gUser.assignedLicenses.length === 0) {
        skippedNoLicenseCount++;
      }

      if (gUser.assignedLicenses && gUser.assignedLicenses.length > 0) {
        const upnKey = (gUser.userPrincipalName || '').toLowerCase();
        const mailKey = (gUser.mail || '').toLowerCase();
        const usage = usageMap[upnKey] || usageMap[mailKey];
        const mailActive = usage ? usage.mailActive : 1;
        const teamsActive = usage ? usage.teamsActive : 1;
        const lastActivityDate = usage && usage.lastActivityDate ? usage.lastActivityDate : new Date().toISOString();

        for (const licInfo of gUser.assignedLicenses) {
          const licId = idMap[licInfo.skuId];
          if (!licId) { skippedUnknownSkuCount++; continue; }

          let allocation = db.prepare("SELECT id FROM m365_allocations WHERE company_id = ? AND license_id = ?").get(person.company_id, licId);
          if (!allocation) {
            const info = insertAlloc.run(person.company_id, licId, currentPeriod);
            allocation = { id: info.lastInsertRowid };
          }

          insertAllocUser.run(allocation.id, person.id, lastActivityDate, mailActive, teamsActive);
          matchedUsersCount++;
        }
      }
    }

    db.prepare('UPDATE m365_allocations SET quantity = (SELECT COUNT(*) FROM m365_allocation_users WHERE m365_allocation_users.allocation_id = m365_allocations.id)').run();

    if (skippedNoLicenseCount > 0) {
      console.warn(`M365 sync: ${skippedNoLicenseCount} eşleşen personel için Azure'dan lisans bilgisi alınamadı (assignedLicenses boş/erişilemez — cross-tenant/guest hesap olabilir).`);
    }
    if (skippedUnknownSkuCount > 0) {
      console.warn(`M365 sync: ${skippedUnknownSkuCount} lisans ataması bilinmeyen SKU nedeniyle atlandı.`);
    }

    let message = "Microsoft Graph (Entra ID) üzerinden gerçek senkronizasyon başarıyla tamamlandı.";
    if (skippedNoLicenseCount > 0) {
      message += ` ${skippedNoLicenseCount} eşleşen personelin lisans bilgisi Azure'dan okunamadı (bkz. sunucu logu).`;
    }

    return {
      success: true,
      message,
      details: { licensesSynced: Object.keys(idMap).length, usersSynced: matchedUsersCount, skippedNoLicenseCount, skippedUnknownSkuCount }
    };
  }

  async runSimulatedPersonnelSync(allowedDomains, domainCompanyMap = {}) {
    const settings = await this.getSettings();
    const domains = Array.isArray(allowedDomains) && allowedDomains.length > 0
      ? allowedDomains
      : ['talay.com'];

    // Mock users from Graph API format
    const mockGraphUsers = [
      { id: 'azure-guid-1', displayName: 'Ahmet Yılmaz', givenName: 'Ahmet', surname: 'Yılmaz', mail: 'ahmet.yilmaz@talay.com', userPrincipalName: 'ahmet.yilmaz@talay.com', jobTitle: 'IT Director', department: 'IT', companyName: 'Talay Holding', accountEnabled: true, employeeId: '1001', mobilePhone: '05321111111' },
      { id: 'azure-guid-2', displayName: 'Mehmet Demir', givenName: 'Mehmet', surname: 'Demir', mail: 'mehmet.demir@talay.com', userPrincipalName: 'mehmet.demir@talay.com', jobTitle: 'System Administrator', department: 'IT', companyName: 'Talay Holding', accountEnabled: true, employeeId: '1002', mobilePhone: '05322222222' },
      { id: 'azure-guid-3', displayName: 'Ayşe Kaya', givenName: 'Ayşe', surname: 'Kaya', mail: 'ayse.kaya@talay.com', userPrincipalName: 'ayse.kaya@talay.com', jobTitle: 'HR Specialist', department: 'HR', companyName: 'Talay Lojistik', accountEnabled: true, employeeId: '1003', mobilePhone: '05323333333' },
      { id: 'azure-guid-4', displayName: 'Fatma Çelik', givenName: 'Fatma', surname: 'Çelik', mail: 'fatma.celik@talay.com', userPrincipalName: 'fatma.celik@talay.com', jobTitle: 'Accountant', department: 'Finance', companyName: 'Talay Lojistik', accountEnabled: true, employeeId: '1004', mobilePhone: '05324444444' },
      { id: 'azure-guid-5', displayName: 'Ali Öztürk', givenName: 'Ali', surname: 'Öztürk', mail: 'ali.ozturk@partner.com', userPrincipalName: 'ali.ozturk@partner.com', jobTitle: 'External Consultant', department: 'Consulting', companyName: 'Partner Corp', accountEnabled: true, employeeId: '2001', mobilePhone: '05325555555' }
    ];

    // Filter by allowed domains
    const filteredUsers = mockGraphUsers.filter(u => {
      const email = u.mail || u.userPrincipalName || '';
      const domain = email.split('@')[1];
      return domains.includes(domain);
    });

    // Execute synchronization matching logic
    const existingPersonnel = db.prepare("SELECT * FROM personnel").all();
    const existingByEmail = {};
    existingPersonnel.forEach(p => {
      if (p.email) existingByEmail[p.email.toLowerCase()] = p;
    });

    const toUpdate = [];
    const toInsert = [];
    const matchedPersonnelIds = new Set();

    for (const azureUser of filteredUsers) {
      const email = azureUser.mail.toLowerCase();
      let existing = db.prepare("SELECT * FROM personnel WHERE entra_id = ?").get(azureUser.id) || existingByEmail[email];

      if (existing) {
        toUpdate.push({ azureUser, existingPerson: existing });
        matchedPersonnelIds.add(existing.id);
      } else {
        toInsert.push(azureUser);
      }
    }

    const unmatchedPersonnel = existingPersonnel.filter(p => !matchedPersonnelIds.has(p.id) && p.source === 'azure');

    // Domain → şirket önce eşleşme haritasından bak, yoksa Azure companyName kullan
    const getOrCreateCompany = (companyName) => {
      if (!companyName) return null;
      let co = db.prepare("SELECT id FROM companies WHERE name LIKE ?").get(companyName);
      if (!co) {
        const result = db.prepare("INSERT INTO companies (name) VALUES (?)").run(companyName);
        co = { id: result.lastInsertRowid };
      }
      return co.id;
    };

    // Şirket bilgisi Azure'dan her kullanıcı için ayrı ayrı okunur (companyName alanı).
    // Aynı domain birden fazla şirketi barındırabilir; domain bazında eşleştirme yapmayız.

    const getOrCreateDepartment = (deptName) => {
      if (!deptName) return null;
      let dept = db.prepare("SELECT id FROM departments WHERE name LIKE ?").get(deptName);
      if (!dept) {
        const result = db.prepare("INSERT INTO departments (name) VALUES (?)").run(deptName);
        dept = { id: result.lastInsertRowid };
      }
      return dept.id;
    };

    const lastRow = db.prepare("SELECT MAX(employee_id) as max_id FROM personnel").get();
    let nextEmpId = Math.max(lastRow.max_id || 999, 999) + 1;

    const getCleanEmployeeId = (azureEmpId) => {
      if (azureEmpId) {
        const parsed = parseInt(azureEmpId);
        if (!isNaN(parsed)) {
          const taken = db.prepare("SELECT id FROM personnel WHERE employee_id = ?").get(parsed);
          if (!taken) return parsed;
        }
      }
      return nextEmpId++;
    };

    const syncTransaction = db.transaction(() => {
      const updateStmt = db.prepare(`
        UPDATE personnel SET 
          first_name = ?, last_name = ?, email = ?, title = ?, title_en = ?, title_tr = ?,
          phone = COALESCE(?, phone),
          company_id = COALESCE(?, company_id), department_id = COALESCE(?, department_id),
          status = ?, source = 'azure', entra_id = ?,
          employee_id = COALESCE(employee_id, ?)
        WHERE id = ?
      `);

      for (const { azureUser, existingPerson } of toUpdate) {
        const companyId = getOrCreateCompany(azureUser.companyName);
        const deptId = getOrCreateDepartment(azureUser.department);
        const resolvedEmpId = getCleanEmployeeId(azureUser.employeeId);
        const statusVal = azureUser.accountEnabled === false ? 'passive' : 'active';
        updateStmt.run(
          azureUser.givenName, azureUser.surname, azureUser.mail,
          azureUser.jobTitle || null, azureUser.jobTitle || null, azureUser.jobTitle || null,
          azureUser.mobilePhone || null,
          companyId, deptId,
          statusVal,
          azureUser.id,
          resolvedEmpId,
          existingPerson.id
        );
      }

      const insertStmt = db.prepare(`
        INSERT INTO personnel (employee_id, first_name, last_name, email, title, title_en, title_tr, phone, company_id, department_id, status, source, entra_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'azure', ?)
      `);

      for (const azureUser of toInsert) {
        const companyId = getOrCreateCompany(azureUser.companyName);
        const deptId = getOrCreateDepartment(azureUser.department);
        const resolvedEmpId = getCleanEmployeeId(azureUser.employeeId);
        const statusVal = azureUser.accountEnabled === false ? 'passive' : 'active';
        insertStmt.run(
          resolvedEmpId,
          azureUser.givenName, azureUser.surname, azureUser.mail,
          azureUser.jobTitle || null, azureUser.jobTitle || null, azureUser.jobTitle || null,
          azureUser.mobilePhone || null,
          companyId, deptId, statusVal, azureUser.id
        );
      }

      if (unmatchedPersonnel.length > 0) {
        const legacyStmt = db.prepare("UPDATE personnel SET source = 'legacy' WHERE id = ?");
        for (const p of unmatchedPersonnel) {
          legacyStmt.run(p.id);
        }
      }
    });

    syncTransaction();

    // allowed_domains ve domain_company_map'i güncelle
    db.prepare("UPDATE entra_settings SET allowed_domains = ?, domain_company_map = ?, last_sync = CURRENT_TIMESTAMP WHERE id = ?")
      .run(JSON.stringify(domains), JSON.stringify(domainCompanyMap || {}), settings.id);

    const total = db.prepare("SELECT COUNT(*) as c FROM personnel").get().c;

    return {
      success: true,
      message: `Personel Azure senkronizasyonu (Simüle) tamamlandı. ${toUpdate.length} güncellendi, ${toInsert.length} yeni eklendi.`,
      details: {
        updated: toUpdate.length,
        inserted: toInsert.length,
        legacy: unmatchedPersonnel.length,
        total,
        domains
      }
    };
  }
}

module.exports = new MicrosoftGraphService();
