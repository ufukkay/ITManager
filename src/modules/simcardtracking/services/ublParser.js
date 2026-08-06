const { XMLParser } = require('fast-xml-parser');

function getInvoiceObject(xmlBuffer) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });
  const xmlObj = parser.parse(xmlBuffer.toString('utf-8'));
  return xmlObj.Invoice || xmlObj['@_Invoice'] || xmlObj;
}

function getNoteTexts(invoice) {
  let notes = invoice['cbc:Note'] || [];
  if (!Array.isArray(notes)) notes = [notes];
  return notes.map(note => (typeof note === 'object' ? note['#text'] || '' : note).toString());
}

/**
 * Turkcell UBL-XML faturasını ayrıştırır.
 * Fatura satırları "F2-" ile başlayan cbc:Note alanlarında saklanıyor.
 */
function parseTurkcellNotes(noteTexts) {
  const extractedRecords = [];

  for (const text of noteTexts) {
    if (!text.startsWith('F2-')) continue;

    const parts = text.substring(3).split(/[?#$+!]/);
    if (parts.length >= 6) {
      const phoneNo = parts[0].trim().slice(-10);
      const amount = parseFloat(parts[2].replace(',', '.')) || 0;
      const tax_kdv = parseFloat(parts[4].replace(',', '.')) || 0;
      const tax_oiv = parseFloat(parts[5].replace(',', '.')) || 0;
      const total_amount = parseFloat((amount + tax_kdv + tax_oiv).toFixed(2));

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

  return extractedRecords;
}

/**
 * Vodafone UBL-XML faturasını ayrıştırır.
 * Fatura satırları "ST20|telefon|tarife|tarih|toplam|kdv|_|_|öiv" formatında cbc:Note alanlarında saklanıyor.
 */
function parseVodafoneNotes(noteTexts) {
  const extractedRecords = [];

  for (const text of noteTexts) {
    if (!text.startsWith('ST20|')) continue;

    const parts = text.split('|');
    if (parts.length < 9) continue;

    const phoneNo = '0' + parts[1].trim().slice(-10);
    const tariff = parts[2].trim();
    const total_amount = parseFloat(parts[4].replace(',', '.')) || 0;
    const tax_kdv = parseFloat(parts[5].replace(',', '.')) || 0;
    const tax_oiv = parseFloat(parts[8].replace(',', '.')) || 0;

    if (!total_amount) continue;

    const amount = parseFloat((total_amount - tax_kdv - tax_oiv).toFixed(2));

    extractedRecords.push({
      phoneNo,
      amount,
      tax_kdv,
      tax_oiv,
      total_amount,
      tariff
    });
  }

  return extractedRecords;
}

/**
 * Fatura tedarikçisinin adından operatörü tespit eder (Turkcell / Vodafone).
 * Dosya adı güvenilir olmadığında (ör. e-arşiv seri no'suyla adlandırılmış dosyalar) kullanılır.
 */
function detectXmlOperator(xmlBuffer) {
  try {
    const invoice = getInvoiceObject(xmlBuffer);
    const supplier = JSON.stringify(invoice['cac:AccountingSupplierParty'] || '');
    if (/vodafone/i.test(supplier)) return 'Vodafone';
    if (/turkcell/i.test(supplier)) return 'Turkcell';
  } catch (err) {
    // Sessizce yoksay, dosya adı/seçilen operatöre geri düşülecek.
  }
  return null;
}

/**
 * Parses a given XML buffer and extracts invoice lines.
 * Not içeriğindeki satır formatına göre Turkcell ya da Vodafone ayrıştırıcısına yönlendirir.
 * Returns an array of records: { phoneNo, amount, tax_kdv, tax_oiv, total_amount, tariff }
 */
async function parseInvoiceXML(xmlBuffer) {
  const invoice = getInvoiceObject(xmlBuffer);
  const noteTexts = getNoteTexts(invoice);

  if (noteTexts.some(t => t.startsWith('ST20|'))) {
    return parseVodafoneNotes(noteTexts);
  }
  if (noteTexts.some(t => t.startsWith('F2-'))) {
    return parseTurkcellNotes(noteTexts);
  }
  return [];
}

module.exports = { parseInvoiceXML, detectXmlOperator };
