/**
 * Purchasing System — Google Apps Script Data Backend Service
 * Handles reading & writing for Suppliers, RMItems, QC Sampling Matrix, Receiving Records & QC Issue Logs
 */

/**
 * Get All Master & Transaction Data for Purchasing Module
 * Each section is wrapped in its own try/catch for resilience.
 * Returns _meta with source info for frontend debugging.
 */
function getPurchasingInitialData() {
  const errors = [];
  let suppliers = [];
  let rmItems = [];
  let defectMatrix = {};
  let formattedReceiving = [];
  let formattedIssues = [];

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Auto-setup if essential sheet is missing
    if (!ss.getSheetByName('DB_Suppliers') || !ss.getSheetByName('DB_DefectMatrix')) {
      setupPurchasingDatabase();
    }

    // --- Suppliers ---
    try {
      const rawSuppliers = getSheetDataAsObjects(ss, 'DB_Suppliers') || [];
      suppliers = rawSuppliers.map((s) => {
        let p = s.phone != null ? String(s.phone).trim() : '';
        if (p && /^[1-9]/.test(p)) {
          p = '0' + p;
        }
        return { ...s, phone: p };
      });
    } catch (e) {
      errors.push('Suppliers: ' + e.toString());
    }

    // --- RM Items ---
    try {
      const rawRms = getSheetDataAsObjects(ss, 'DB_RMItems') || [];
      rmItems = rawRms.map((rm) => {
        let parsedSupplierIds = [rm.supplierId || ''];
        if (typeof rm.supplierIds === 'string' && rm.supplierIds.trim() !== '') {
          try {
            parsedSupplierIds = JSON.parse(rm.supplierIds);
          } catch (e2) {
            parsedSupplierIds = rm.supplierIds.split(',').map(s => s.trim()).filter(s => s !== '');
          }
        } else if (Array.isArray(rm.supplierIds)) {
          parsedSupplierIds = rm.supplierIds;
        }
        return {
          id: rm.id || '',
          code: rm.code != null ? String(rm.code) : '',
          name: rm.name || '',
          category: rm.category != null ? String(rm.category).trim() : '',
          categoryLabel: rm.categoryLabel != null ? String(rm.categoryLabel).trim() : '',
          unit: rm.unit || '',
          supplierId: rm.supplierId || '',
          supplierName: rm.supplierName || '',
          supplierIds: parsedSupplierIds,
        };
      });
    } catch (e) {
      errors.push('RMItems: ' + e.toString());
    }

    // --- Defect Matrix ---
    try {
      const rawMatrix = getSheetDataAsObjects(ss, 'DB_DefectMatrix') || [];
      rawMatrix.forEach((rule) => {
        const cat = rule.category;
        if (!defectMatrix[cat]) defectMatrix[cat] = [];
        defectMatrix[cat].push({
          minQty: Number(rule.minQty),
          maxQty: Number(rule.maxQty),
          sampleQty: Number(rule.sampleQty),
          acceptMaxDefectQty: Number(rule.acceptMaxDefectQty),
          acceptMaxDefectPercent: Number(rule.acceptMaxDefectPercent),
        });
      });
    } catch (e) {
      errors.push('DefectMatrix: ' + e.toString());
    }

    // --- Receiving Records ---
    try {
      const receivingRecords = getSheetDataAsObjects(ss, 'DB_ReceivingRecords') || [];
      formattedReceiving = receivingRecords.map((r) => ({
        ...r,
        receiveQty: Number(r.receiveQty),
        sampleQty: Number(r.sampleQty),
        defectQty: Number(r.defectQty),
        defectPercent: Number(r.defectPercent),
        isPass: String(r.isPass).toLowerCase() === 'true' || r.isPass === true,
        hasIssueLog: String(r.hasIssueLog).toLowerCase() === 'true' || r.hasIssueLog === true,
        postProductionDefectQty: r.postProductionDefectQty !== undefined && r.postProductionDefectQty !== '' ? Number(r.postProductionDefectQty) : undefined,
        postProductionRemark: r.postProductionRemark || '',
        postProductionDate: r.postProductionDate || '',
      }));
    } catch (e) {
      errors.push('ReceivingRecords: ' + e.toString());
    }

    // --- Issue Logs ---
    try {
      const issueLogs = getSheetDataAsObjects(ss, 'DB_IssueLogs') || [];
      formattedIssues = issueLogs.map((i) => ({
        ...i,
        problemQty: Number(i.problemQty),
      }));
    } catch (e) {
      errors.push('IssueLogs: ' + e.toString());
    }

    const payload = {
      status: 'success',
      _meta: {
        source: 'google_sheet',
        timestamp: new Date().toISOString(),
        counts: {
          suppliers: suppliers.length,
          rmItems: rmItems.length,
          defectMatrixCategories: Object.keys(defectMatrix).length,
          receivingRecords: formattedReceiving.length,
          issueLogs: formattedIssues.length,
        },
        errors: errors.length > 0 ? errors : undefined,
      },
      data: {
        suppliers: suppliers,
        rmItems: rmItems,
        defectMatrix: defectMatrix,
        receivingRecords: formattedReceiving,
        issueLogs: formattedIssues,
      },
    };

    // PURE JSON SANITIZATION to guarantee google.script.run never fails to serialize
    const cleanJsonString = JSON.stringify(payload, function(key, val) {
      if (typeof val === 'number' && (isNaN(val) || !isFinite(val))) {
        return 0;
      }
      return val;
    });

    return JSON.parse(cleanJsonString);
  } catch (err) {
    return { status: 'error', message: err.toString(), errors: errors };
  }
}

/**
 * Diagnostic: Test RM Items reading from Sheet.
 * Run this from the GAS Script Editor to verify data.
 */
function testPurchasingRMItems() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DB_RMItems');
  if (!sheet) {
    Logger.log('❌ Sheet DB_RMItems not found');
    return;
  }
  const data = sheet.getDataRange().getValues();
  Logger.log('Headers: ' + JSON.stringify(data[0]));
  Logger.log('Total rows (incl header): ' + data.length);

  for (let i = 1; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    const obj = {};
    for (let j = 0; j < data[0].length; j++) {
      obj[data[0][j]] = row[j];
    }
    Logger.log('Row ' + (i+1) + ': ' + JSON.stringify(obj));
  }

  // Show last 5 rows
  if (data.length > 10) {
    Logger.log('--- Last 5 rows ---');
    for (let i = Math.max(data.length - 5, 1); i < data.length; i++) {
      const row = data[i];
      const obj = {};
      for (let j = 0; j < data[0].length; j++) {
        obj[data[0][j]] = row[j];
      }
      Logger.log('Row ' + (i+1) + ': ' + JSON.stringify(obj));
    }
  }

  // Test getPurchasingInitialData
  Logger.log('--- Full API Response _meta ---');
  const result = getPurchasingInitialData();
  Logger.log('Status: ' + result.status);
  if (result._meta) {
    Logger.log('Meta: ' + JSON.stringify(result._meta));
  }
  if (result.data && result.data.rmItems) {
    const lastItems = result.data.rmItems.slice(-5);
    lastItems.forEach((rm, idx) => {
      Logger.log('RM[' + (result.data.rmItems.length - 5 + idx) + ']: id=' + rm.id + ' name=' + rm.name + ' category=' + rm.category + ' categoryLabel=' + rm.categoryLabel);
    });
  }
}

/**
 * Save New or Edit Receiving Record
 */
function saveReceivingRecord(record) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('DB_ReceivingRecords');
    if (!sheet) {
      setupPurchasingDatabase();
      sheet = ss.getSheetByName('DB_ReceivingRecords');
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(record.id)) {
        rowIndex = i + 1;
        break;
      }
    }

    const row = [
      record.id,
      record.billNo,
      record.receiveDate,
      record.supplierId,
      record.supplierName,
      record.rmId,
      record.rmName,
      record.rmCategory,
      record.receiveQty,
      record.sampleQty,
      record.defectQty,
      record.defectPercent,
      record.isPass,
      record.remark || '',
      record.createdAt || getThaiTimestamp(),
      record.hasIssueLog || false,
      record.postProductionDefectQty !== undefined ? record.postProductionDefectQty : '',
      record.postProductionRemark || '',
      record.postProductionDate || ''
    ];

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    SpreadsheetApp.flush();
    return { status: 'success', data: record };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Save New or Edit Issue Log Record
 */
function saveIssueLogRecord(record) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('DB_IssueLogs');
    if (!sheet) {
      setupPurchasingDatabase();
      sheet = ss.getSheetByName('DB_IssueLogs');
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(record.id)) {
        rowIndex = i + 1;
        break;
      }
    }

    const row = [
      record.id,
      record.receivingRecordId || '',
      record.supplierId,
      record.supplierName,
      record.rmId,
      record.rmName,
      record.billNo,
      record.issueDate,
      record.problemQty,
      record.defectCategory,
      record.problemsFound,
      record.correctiveAction || '',
      record.status,
      record.createdAt || getThaiTimestamp(),
    ];

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    // Also update hasIssueLog in DB_ReceivingRecords if applicable
    if (record.receivingRecordId) {
      const recSheet = ss.getSheetByName('DB_ReceivingRecords');
      if (recSheet) {
        const recData = recSheet.getDataRange().getValues();
        for (let j = 1; j < recData.length; j++) {
          if (String(recData[j][0]) === String(record.receivingRecordId)) {
            recSheet.getRange(j + 1, 16).setValue(true); // Column 16: hasIssueLog
            break;
          }
        }
      }
    }

    SpreadsheetApp.flush();
    return { status: 'success', data: record };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function deleteReceivingRecord(id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('DB_ReceivingRecords');
    if (!sheet) return { status: 'error', message: 'Sheet not found' };

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        return { status: 'success' };
      }
    }
    return { status: 'error', message: 'Record not found' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Save or Update Supplier
 */
function saveSupplierRecord(supplier) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('DB_Suppliers');
    if (!sheet) {
      setupPurchasingDatabase();
      sheet = ss.getSheetByName('DB_Suppliers');
    }

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    let duplicateCode = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(supplier.id)) {
        rowIndex = i + 1;
      }
      if (data[i][1] != null && String(data[i][1]).trim().toLowerCase() === String(supplier.code).trim().toLowerCase()) {
        if (String(data[i][0]) !== String(supplier.id)) {
          duplicateCode = true;
        }
      }
    }

    if (duplicateCode) {
      return { status: 'error', message: 'รหัส Supplier นี้มีในระบบแล้ว กรุณาระบุรหัสใหม่' };
    }

    let cleanPhone = supplier.phone ? String(supplier.phone).trim() : '';
    if (cleanPhone && /^[1-9]/.test(cleanPhone)) {
      cleanPhone = `0${cleanPhone}`;
    }

    const row = [
      supplier.id,
      supplier.code,
      supplier.name,
      cleanPhone,
      supplier.contactPerson || '',
      supplier.email || '',
      supplier.address || '',
      supplier.createdAt || getThaiTimestamp(),
    ];

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    // Force phone column to text format so leading zero is preserved
    const lastRow = rowIndex > 0 ? rowIndex : sheet.getLastRow();
    if (cleanPhone) {
      sheet.getRange(lastRow, 4).setNumberFormat('@').setValue(cleanPhone);
    }

    SpreadsheetApp.flush();
    return { status: 'success', data: supplier };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Delete Supplier
 */
function deleteSupplierRecord(id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('DB_Suppliers');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        return { status: 'success', id: id };
      }
    }
    return { status: 'error', message: `Supplier not found: ${id}` };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Save or Update RM Item
 */
function saveRMRecord(rmItem) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('DB_RMItems');
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;

    let duplicateCode = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(rmItem.id)) {
        rowIndex = i + 1;
      }
      if (data[i][1] != null && String(data[i][1]).trim().toLowerCase() === String(rmItem.code).trim().toLowerCase()) {
        if (String(data[i][0]) !== String(rmItem.id)) {
          duplicateCode = true;
        }
      }
    }

    if (duplicateCode) {
      return { status: 'error', message: 'รหัส RM นี้มีในระบบแล้ว กรุณาระบุรหัสใหม่' };
    }

    const row = [
      rmItem.id,
      rmItem.code,
      rmItem.name,
      rmItem.category,
      rmItem.categoryLabel,
      rmItem.unit,
      rmItem.supplierId,
      rmItem.supplierName,
      JSON.stringify(rmItem.supplierIds || [rmItem.supplierId]),
    ];

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    SpreadsheetApp.flush();
    return { status: 'success', data: rmItem };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Delete RM Item
 */
function deleteRMRecord(id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('DB_RMItems');
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        return { status: 'success', id: id };
      }
    }
    return { status: 'error', message: `RM Item not found: ${id}` };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Save QC Defect Matrix Rules
 */
function saveDefectMatrixRules(matrix) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('DB_DefectMatrix');
    sheet.clearContents();

    const headers = ['category', 'minQty', 'maxQty', 'sampleQty', 'acceptMaxDefectQty', 'acceptMaxDefectPercent'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    const rows = [];
    Object.keys(matrix).forEach((cat) => {
      const rules = matrix[cat] || [];
      rules.forEach((r) => {
        rows.push([cat, r.minQty, r.maxQty, r.sampleQty, r.acceptMaxDefectQty, r.acceptMaxDefectPercent]);
      });
    });

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }

    SpreadsheetApp.flush();
    return { status: 'success', data: matrix };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Delete Issue Log Record (Also resets hasIssueLog in DB_ReceivingRecords if applicable)
 */
function deleteIssueLogRecord(id) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('DB_IssueLogs');
    if (!sheet) return { status: 'error', message: 'DB_IssueLogs not found' };
    
    const data = sheet.getDataRange().getValues();
    let deletedReceivingId = null;
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        deletedReceivingId = data[i][1]; // Column 2 (index 1) is receivingRecordId
        sheet.deleteRow(i + 1);
        
        // Reset hasIssueLog in DB_ReceivingRecords
        if (deletedReceivingId) {
          const recSheet = ss.getSheetByName('DB_ReceivingRecords');
          if (recSheet) {
            const recData = recSheet.getDataRange().getValues();
            for (let j = 1; j < recData.length; j++) {
              if (String(recData[j][0]) === String(deletedReceivingId)) {
                recSheet.getRange(j + 1, 16).setValue(false); // Column 16: hasIssueLog
                break;
              }
            }
          }
        }
        
        SpreadsheetApp.flush();
        return { status: 'success', id: id };
      }
    }
    return { status: 'error', message: `Issue Log not found: ${id}` };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

/**
 * Helper: Convert Sheet to Array of JSON Objects with serialization safety
 */
function getSheetDataAsObjects(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const results = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    // Skip empty rows
    let isEmpty = true;
    for (let k = 0; k < row.length; k++) {
      if (row[k] !== '' && row[k] != null) {
        isEmpty = false;
        break;
      }
    }
    if (isEmpty) continue;

    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      const headerName = String(headers[j]).trim();
      if (!headerName) continue;
      
      let val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, "Asia/Bangkok", "yyyy-MM-dd'T'HH:mm:ss'+07:00'");
      } else if (val === null || val === undefined) {
        val = '';
      }
      obj[headerName] = val;
    }
    results.push(obj);
  }

  return results;
}
