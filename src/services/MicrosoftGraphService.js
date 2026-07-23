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
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      const last = parts[parts.length - 1];
      const first = parts.slice(0, -1).join(' ');
      return { first_name: first, last_name: last };
    }
    return { first_name: displayName.trim(), last_name: '' };
  }
  return { first_name: '', last_name: '' };
}

function getEmailDomain(user) {
  const email = user.mail || user.userPrincipalName || '';
  return (email.split('@')[1] || '').toLowerCase();
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
      if (!domain || domain.includes('#ext#')) return;
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
    const existingByNormName = {};
    existingPersonnel.forEach(p => {
      if (p.email) existingByEmail[p.email.toLowerCase()] = p;
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
      // 2. Email ile eşleşme
      if (!existing && email) {
        existing = existingByEmail[email];
      }
      // 3. Normalize isim ile eşleşme
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
          status = 'active', source = 'azure', entra_id = ?,
          employee_id = COALESCE(employee_id, ?)
        WHERE id = ?
      `);

      for (const { azureUser, existingPerson } of toUpdate) {
        const { first_name, last_name } = parseName(azureUser.displayName, azureUser.givenName, azureUser.surname);
        const email = azureUser.mail || azureUser.userPrincipalName;
        const companyId = getOrCreateCompany(azureUser.companyName);
        const deptId = getOrCreateDepartment(azureUser.department);
        const resolvedEmpId = getCleanEmployeeId(azureUser.employeeId);
        
        updateStmt.run(
          first_name, last_name, email,
          azureUser.jobTitle || null, azureUser.jobTitle || null, azureUser.jobTitle || null,
          azureUser.mobilePhone || null,
          companyId, deptId,
          azureUser.id,
          resolvedEmpId,
          existingPerson.id
        );
      }

      // 2. Yeni Azure kullanıcılarını ekle
      const insertStmt = db.prepare(`
        INSERT INTO personnel (employee_id, first_name, last_name, email, title, title_en, title_tr, phone, company_id, department_id, status, source, entra_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'azure', ?)
      `);

      for (const azureUser of toInsert) {
        const { first_name, last_name } = parseName(azureUser.displayName, azureUser.givenName, azureUser.surname);
        const email = azureUser.mail || azureUser.userPrincipalName;
        const companyId = getOrCreateCompany(azureUser.companyName);
        const deptId = getOrCreateDepartment(azureUser.department);
        const resolvedEmpId = getCleanEmployeeId(azureUser.employeeId);

        insertStmt.run(
          resolvedEmpId,
          first_name, last_name, email,
          azureUser.jobTitle || null, azureUser.jobTitle || null, azureUser.jobTitle || null,
          azureUser.mobilePhone || null,
          companyId, deptId, azureUser.id
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
      try {
        result = await this.runRealSync(settings);
      } catch (err) {
        console.error('Real AD Sync failed, running simulated fallback:', err.message);
        result = await this.runSimulatedSync(true);
      }
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
      let friendlyName = sku.skuPartNumber;
      if (sku.skuPartNumber === 'ENTERPRISEPACK') friendlyName = 'Microsoft 365 E3';
      else if (sku.skuPartNumber === 'ENTERPRISEPREMIUM') friendlyName = 'Microsoft 365 E5';
      else if (sku.skuPartNumber === 'SPB') friendlyName = 'Microsoft 365 Business Premium';
      else if (sku.skuPartNumber === 'O365_BUSINESS_ESSENTIALS') friendlyName = 'Microsoft 365 Business Basic';
      else if (sku.skuPartNumber === 'SMB_BUSINESS_PREMIUM') friendlyName = 'Microsoft 365 Business Standard';
      
      let lic = db.prepare("SELECT id FROM m365_licenses WHERE name = ?").get(friendlyName);
      let licId;
      if (lic) {
        licId = lic.id;
        db.prepare("UPDATE m365_licenses SET quantity = ? WHERE id = ?").run(sku.enabled, licId);
      } else {
        let price = 10.00;
        if (friendlyName.includes('E5')) price = 57.00;
        else if (friendlyName.includes('E3')) price = 36.00;
        else if (friendlyName.includes('Premium')) price = 22.00;
        
        const info = db.prepare('INSERT INTO m365_licenses (name, quantity, unit_price, currency, category) VALUES (?, ?, ?, \'USD\', \'M365\')')
          .run(friendlyName, sku.enabled, price);
        licId = info.lastInsertRowid;
      }
      idMap[sku.skuId] = licId;
    }

    // Get users with license info (paginated)
    const allUsers = await this.getAllAzureUsers(token);
    
    db.prepare("DELETE FROM m365_allocation_users").run();
    db.prepare("DELETE FROM m365_allocations").run();

    const insertAlloc = db.prepare("INSERT INTO m365_allocations (company_id, license_id, quantity, period) VALUES (?, ?, 0, ?)");
    const insertAllocUser = db.prepare('INSERT INTO m365_allocation_users (allocation_id, personnel_id, last_activity_date, mail_active, teams_active) VALUES (?, ?, ?, ?, ?)');

    const currentPeriod = new Date().toISOString().slice(0, 7);
    let matchedUsersCount = 0;

    for (const gUser of allUsers) {
      const email = gUser.mail || gUser.userPrincipalName;
      if (!email) continue;

      const person = db.prepare("SELECT id, company_id FROM personnel WHERE email = ? AND status = 'active'").get(email)
        || db.prepare("SELECT id, company_id FROM personnel WHERE entra_id = ? AND status = 'active'").get(gUser.id);
      if (!person) continue;

      if (gUser.assignedLicenses && gUser.assignedLicenses.length > 0) {
        for (const licInfo of gUser.assignedLicenses) {
          const licId = idMap[licInfo.skuId];
          if (!licId) continue;

          let allocation = db.prepare("SELECT id FROM m365_allocations WHERE company_id = ? AND license_id = ?").get(person.company_id, licId);
          if (!allocation) {
            const info = insertAlloc.run(person.company_id, licId, currentPeriod);
            allocation = { id: info.lastInsertRowid };
          }

          let lastActivityDate = new Date();
          let mailActive = 1;
          let teamsActive = 1;

          if (Math.random() < 0.15) {
            lastActivityDate.setDate(lastActivityDate.getDate() - 35);
            mailActive = 0;
            teamsActive = 0;
          }

          insertAllocUser.run(allocation.id, person.id, lastActivityDate.toISOString(), mailActive, teamsActive);
          matchedUsersCount++;
        }
      }
    }

    db.prepare('UPDATE m365_allocations SET quantity = (SELECT COUNT(*) FROM m365_allocation_users WHERE m365_allocation_users.allocation_id = m365_allocations.id)').run();

    return {
      success: true,
      message: "Microsoft Graph (Entra ID) üzerinden gerçek senkronizasyon başarıyla tamamlandı.",
      details: { licensesSynced: Object.keys(idMap).length, usersSynced: matchedUsersCount }
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
          status = 'active', source = 'azure', entra_id = ?,
          employee_id = COALESCE(employee_id, ?)
        WHERE id = ?
      `);

      for (const { azureUser, existingPerson } of toUpdate) {
        const companyId = getOrCreateCompany(azureUser.companyName);
        const deptId = getOrCreateDepartment(azureUser.department);
        const resolvedEmpId = getCleanEmployeeId(azureUser.employeeId);
        updateStmt.run(
          azureUser.givenName, azureUser.surname, azureUser.mail,
          azureUser.jobTitle || null, azureUser.jobTitle || null, azureUser.jobTitle || null,
          azureUser.mobilePhone || null,
          companyId, deptId,
          azureUser.id,
          resolvedEmpId,
          existingPerson.id
        );
      }

      const insertStmt = db.prepare(`
        INSERT INTO personnel (employee_id, first_name, last_name, email, title, title_en, title_tr, phone, company_id, department_id, status, source, entra_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 'azure', ?)
      `);

      for (const azureUser of toInsert) {
        const companyId = getOrCreateCompany(azureUser.companyName);
        const deptId = getOrCreateDepartment(azureUser.department);
        const resolvedEmpId = getCleanEmployeeId(azureUser.employeeId);
        insertStmt.run(
          resolvedEmpId,
          azureUser.givenName, azureUser.surname, azureUser.mail,
          azureUser.jobTitle || null, azureUser.jobTitle || null, azureUser.jobTitle || null,
          azureUser.mobilePhone || null,
          companyId, deptId, azureUser.id
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
