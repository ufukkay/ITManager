const { XMLParser } = require('fast-xml-parser');

/**
 * Turkcell UBL-XML faturasını ayrıştırır.
 * @param {Buffer} xmlBuffer 
 * @returns {Promise<Array>} Ayrıştırılmış fatura kayıtları
 */
async function parseInvoiceXML(xmlBuffer) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  
  const xmlObj = parser.parse(xmlBuffer.toString('utf-8'));
  const invoice = xmlObj.Invoice || xmlObj['@_Invoice'] || xmlObj;
  
  // Notlar alanını bul (Turkcell verileri Note içinde saklıyor)
  let notes = invoice['cbc:Note'] || [];
  if (!Array.isArray(notes)) notes = [notes];

  const extractedRecords = [];

  // F2- ile başlayan fatura satırlarını işle
  for (const note of notes) {
    const text = typeof note === 'object' ? note['#text'] || '' : note;
    
    if (text.startsWith('F2-')) {
      const parts = text.substring(3).split(/[?#$+!]/);
      if (parts.length >= 6) {
        const phoneNo = parts[0].trim().slice(-10); 
        const amount = parseFloat(parts[2].replace(',', '.')) || 0;
        const total_amount = parseFloat(parts[3].replace(',', '.')) || 0;
        const tax_kdv = parseFloat(parts[4].replace(',', '.')) || 0;
        const tax_oiv = parseFloat(parts[5].replace(',', '.')) || 0;

        extractedRecords.push({
          phoneNo: '0' + phoneNo, 
          amount: amount,
          tax_kdv: tax_kdv,
          tax_oiv: tax_oiv,
          total_amount: total_amount,
          tariff: parts[1].trim()
        });
      }
    }
  }

  return extractedRecords;
}

module.exports = { parseInvoiceXML };
