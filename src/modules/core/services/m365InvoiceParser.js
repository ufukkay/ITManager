const xlsx = require('xlsx');

/**
 * Parses a given Microsoft 365 License Excel buffer.
 * Expected columns: 'Email' or 'E-posta', 'Amount' or 'Tutar' / 'Total'
 * Returns an array of records: { email, amount, tariff, personnel_id }
 */
async function parseM365Excel(fileBuffer) {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  const records = [];

  for (const row of data) {
    // Find email column (flexible naming)
    const email = row['Email'] || row['E-posta'] || row['UserPrincipalName'] || row['User Name'];
    const amount = parseFloat(row['Amount'] || row['Tutar'] || row['Total'] || row['Cost'] || 0);
    const licenseName = row['License'] || row['Lisans'] || row['Product'] || 'M365 License';

    if (email && amount > 0) {
      records.push({
        email: email.trim(),
        amount: amount,
        tariff: licenseName,
        total_amount: amount, // simplify for license
        tax_kdv: 0,
        tax_oiv: 0
      });
    }
  }

  return records;
}

module.exports = {
  parseM365Excel
};
