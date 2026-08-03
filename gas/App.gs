function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  return template.evaluate()
    .setTitle('ระบบวางแผนการผลิตรายสัปดาห์ & ระบบจัดซื้อ (Weekly Planner & Purchasing)')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Utility function to get current timestamp in ISO 8601 format but in Thai timezone (+07:00).
 * If a Date object is provided, it formats that date.
 */
function getThaiTimestamp(date) {
  const d = date || new Date();
  return Utilities.formatDate(d, "Asia/Bangkok", "yyyy-MM-dd'T'HH:mm:ss'+07:00'");
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🚀 ระบบวางแผนการผลิต')
    .addItem('⚙️ ตั้งค่าฐานข้อมูลการผลิต (Setup Production DB)', 'setupDatabase')
    .addItem('🔄 ล้างและซิงค์หัวตาราง (Sync Production Headers)', 'syncAndSanitizeAllSheets')
    .addToUi();

  ui.createMenu('🛒 ระบบจัดซื้อ & QC')
    .addItem('⚙️ ตั้งค่าฐานข้อมูลจัดซื้อ (Setup Purchasing DB)', 'setupPurchasingDatabase')
    .addItem('🔄 ล้างและซิงค์หัวตาราง (Sync Purchasing Headers)', 'syncAndSanitizePurchasingSheets')
    .addToUi();
}

/**
 * Auto-generate ID and createdAt when user manually adds data to Purchasing Module sheets.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const startRow = e.range.getRow();
  const numRows = e.range.getNumRows();
  
  if (startRow <= 1 && numRows === 1) return; // Ignore single header edit
  
  // Purchasing module configurations
  const purchasingSheets = {
    'DB_Suppliers': { idPrefix: 'sup-', length: 4, idCol: 1, createdCol: 8 },
    'DB_RMItems': { idPrefix: 'rm-', length: 4, idCol: 1, createdCol: null },
    'DB_ReceivingRecords': { idPrefix: 'REC-', length: 6, idCol: 1, createdCol: 15 },
    'DB_IssueLogs': { idPrefix: 'ISS-', length: 6, idCol: 1, createdCol: 14 }
  };
  
  const config = purchasingSheets[sheetName];
  if (!config) return;

  const tsBase = new Date().getTime();
  const currentIso = getThaiTimestamp();
  let changesMade = false;

  for (let i = 0; i < numRows; i++) {
    const row = startRow + i;
    if (row <= 1) continue; // Skip header row

    // Only generate if there is data in some columns (to avoid generating IDs for empty rows)
    const hasData = sheet.getRange(row, 2, 1, 3).getValues()[0].some(val => val !== "");
    if (!hasData) continue;

    const idRange = sheet.getRange(row, config.idCol);
    if (!idRange.getValue()) {
      // Create a unique ID using timestamp + row offset to guarantee uniqueness in bulk edits
      const uniqueSuffix = (tsBase + i).toString().slice(-config.length);
      const newId = config.idPrefix + uniqueSuffix;
      idRange.setValue(newId);
      changesMade = true;
    }
    
    if (config.createdCol) {
      const createdRange = sheet.getRange(row, config.createdCol);
      if (!createdRange.getValue()) {
        createdRange.setValue(currentIso);
        changesMade = true;
      }
    }
  }

  if (changesMade) {
    SpreadsheetApp.flush();
  }
}
