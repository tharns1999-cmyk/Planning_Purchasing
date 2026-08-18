import {
  Supplier,
  RMItem,
  DefectRule,
  ReceivingRecord,
  IssueLogRecord,
  DefectCategoryItem,
  ReceivingAttachmentItem,
  normalizeAttachmentItem,
  formatPhoneNumber,
  MOCK_SUPPLIERS,
  MOCK_RM_ITEMS,
} from './DefectMatrixService';
import { AuditService } from './AuditService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const google: any;

const LOCAL_STORAGE_PURCHASING_KEY = 'purchasing_system_db_v1';

export interface PurchasingDbData {
  suppliers: Supplier[];
  rmItems: RMItem[];
  defectMatrix: Record<string, DefectRule[]>;
  defectCategories: DefectCategoryItem[];
  receivingRecords: ReceivingRecord[];
  issueLogs: IssueLogRecord[];
}

export class PurchasingGasService {
  private static get isGoogleAvailable(): boolean {
    try {
      return typeof google !== 'undefined' && typeof google.script !== 'undefined' && typeof google.script.run !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * Load all purchasing data (from GAS Google Sheet if available, else LocalStorage)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static _lastMeta: any = null;

  static async loadPurchasingData(forceRefresh = false): Promise<PurchasingDbData> {
    if (this.isGoogleAvailable) {
      console.log('[PurchasingGasService] google.script.run is available — fetching from GAS...', { forceRefresh });
      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          console.warn('[PurchasingGasService] ⏰ GAS fetch TIMED OUT after 10s, falling back to LocalStorage');
          this._lastMeta = { source: 'localStorage_timeout' };
          resolve(this.loadFromLocalStorage());
        }, 10000);

        google.script.run
          .withSuccessHandler((response: unknown) => {
            clearTimeout(timeoutId);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const res = response as { status?: string; _meta?: any; data?: Partial<PurchasingDbData> };
            
            console.log('[PurchasingGasService] GAS Response status:', res?.status);
            if (res?._meta) {
              console.log('[PurchasingGasService] GAS _meta:', JSON.stringify(res._meta));
              this._lastMeta = res._meta;
            }

            if (res && res.status === 'success' && res.data) {
              const rawSuppliers: Supplier[] = res.data.suppliers || [];
              const formattedSuppliers = rawSuppliers.map((s) => ({
                ...s,
                phone: formatPhoneNumber(s.phone) === '-' ? '' : formatPhoneNumber(s.phone),
              }));

              const rawReceivingGas: ReceivingRecord[] = res.data.receivingRecords || [];
              const seenGasIds = new Set<string>();
              const cleanReceivingGas: ReceivingRecord[] = [];
              rawReceivingGas.forEach((r) => {
                if (r && r.id && !seenGasIds.has(r.id)) {
                  seenGasIds.add(r.id);
                  let rawList: (string | ReceivingAttachmentItem)[] = [];
                  if (Array.isArray(r.attachments)) {
                    rawList = r.attachments;
                  } else if (typeof r.attachments === 'string' && r.attachments.trim() !== '') {
                    try {
                      const parsed = JSON.parse(r.attachments);
                      if (Array.isArray(parsed)) rawList = parsed;
                      else if (typeof parsed === 'string' || typeof parsed === 'object') rawList = [parsed];
                    } catch {
                      rawList = [];
                    }
                  }
                  cleanReceivingGas.push({
                    ...r,
                    attachments: rawList.map(normalizeAttachmentItem),
                  });
                }
              });

              const data: PurchasingDbData = {
                suppliers: formattedSuppliers,
                rmItems: res.data.rmItems || [],
                defectMatrix: (res.data.defectMatrix as Record<string, DefectRule[]>) || {},
                defectCategories: res.data.defectCategories || [],
                receivingRecords: cleanReceivingGas,
                issueLogs: res.data.issueLogs || [],
              };
              
              console.log('[PurchasingGasService] ✅ Data loaded from GAS Google Sheet:',
                'suppliers=', data.suppliers.length,
                'rmItems=', data.rmItems.length,
                'receivingRecords=', data.receivingRecords.length
              );
              
              // Log last 3 RM items for debugging
              if (data.rmItems.length > 0) {
                const lastItems = data.rmItems.slice(-3);
                lastItems.forEach((rm, i) => {
                  console.log(`[PurchasingGasService] RM[${data.rmItems.length - 3 + i}]:`, 
                    'id=', rm.id, 'name=', rm.name, 
                    'category=', JSON.stringify(rm.category), 
                    'categoryLabel=', JSON.stringify(rm.categoryLabel)
                  );
                });
              }

              this.saveToLocalStorage(data);
              resolve(data);
            } else {
              console.warn('[PurchasingGasService] ❌ Invalid/error response from GAS:', JSON.stringify(response));
              this._lastMeta = { source: 'localStorage_gas_error', gasResponse: res?.status };
              resolve(this.loadFromLocalStorage());
            }
          })
          .withFailureHandler((err: unknown) => {
            clearTimeout(timeoutId);
            console.error('[PurchasingGasService] ❌ GAS withFailureHandler:', err);
            this._lastMeta = { source: 'localStorage_gas_failure', error: String(err) };
            resolve(this.loadFromLocalStorage());
          })
          .getPurchasingInitialData(forceRefresh);
      });
    }

    console.log('[PurchasingGasService] google.script.run NOT available — using LocalStorage/Mock data');
    this._lastMeta = { source: 'localStorage_no_gas' };
    return this.loadFromLocalStorage();
  }

  // --- Local Storage Backup Helpers ---

  static loadFromLocalStorage(): PurchasingDbData {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_PURCHASING_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const rawSuppliers: Supplier[] = parsed.suppliers || [];
        const formattedSuppliers = (rawSuppliers.length > 0 ? rawSuppliers : MOCK_SUPPLIERS).map((s) => ({
          ...s,
          phone: formatPhoneNumber(s.phone) === '-' ? '' : formatPhoneNumber(s.phone),
        }));

        const rawRmItems: RMItem[] = parsed.rmItems || [];
        const rawDefectCats: DefectCategoryItem[] = parsed.defectCategories || [];

        const rawReceiving: ReceivingRecord[] = parsed.receivingRecords || [];
        const seenRecIds = new Set<string>();
        const cleanReceiving: ReceivingRecord[] = [];
        rawReceiving.forEach((r) => {
          if (r && r.id && !seenRecIds.has(r.id)) {
            seenRecIds.add(r.id);
            let rawList: (string | ReceivingAttachmentItem)[] = [];
            if (Array.isArray(r.attachments)) {
              rawList = r.attachments;
            } else if (typeof r.attachments === 'string' && r.attachments.trim() !== '') {
              try {
                const parsedAttachment = JSON.parse(r.attachments);
                if (Array.isArray(parsedAttachment)) rawList = parsedAttachment;
                else if (typeof parsedAttachment === 'string' || typeof parsedAttachment === 'object') rawList = [parsedAttachment];
              } catch {
                rawList = [];
              }
            }
            cleanReceiving.push({
              ...r,
              attachments: rawList.map(normalizeAttachmentItem),
            });
          }
        });

        return {
          suppliers: formattedSuppliers,
          rmItems: rawRmItems.length > 0 ? rawRmItems : MOCK_RM_ITEMS,
          defectMatrix: parsed.defectMatrix || {},
          defectCategories: rawDefectCats,
          receivingRecords: cleanReceiving,
          issueLogs: parsed.issueLogs || [],
        };
      }
    } catch (e) {
      console.error('Failed to parse purchasing data from LocalStorage:', e);
    }
    return {
      suppliers: MOCK_SUPPLIERS,
      rmItems: MOCK_RM_ITEMS,
      defectMatrix: {},
      defectCategories: [],
      receivingRecords: [],
      issueLogs: [],
    };
  }

  static saveToLocalStorage(data: Partial<PurchasingDbData>): void {
    try {
      const current = this.loadFromLocalStorage();
      const updated = { ...current, ...data };
      localStorage.setItem(LOCAL_STORAGE_PURCHASING_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save purchasing data to LocalStorage:', e);
    }
  }

  // --- Persistence Methods ---

  static async saveSupplier(supplier: Supplier): Promise<void> {
    const current = this.loadFromLocalStorage();
    const exists = current.suppliers.some((s) => s.id === supplier.id);
    const updatedSuppliers = exists
      ? current.suppliers.map((s) => (s.id === supplier.id ? supplier : s))
      : [...current.suppliers, supplier];
    this.saveToLocalStorage({ suppliers: updatedSuppliers });

    if (this.isGoogleAvailable) {
      const clientMeta = await AuditService.getClientMetadata();
      google.script.run
        .withSuccessHandler(() => console.log('Supplier saved to GAS'))
        .withFailureHandler((err: unknown) => console.error('saveSupplierRecord failed:', err))
        .saveSupplierRecord(supplier, clientMeta);
    }
  }

  static async deleteSupplier(id: string): Promise<void> {
    const current = this.loadFromLocalStorage();
    const updatedSuppliers = current.suppliers.filter((s) => s.id !== id);
    this.saveToLocalStorage({ suppliers: updatedSuppliers });

    if (this.isGoogleAvailable) {
      const clientMeta = await AuditService.getClientMetadata();
      google.script.run
        .withSuccessHandler(() => console.log('Supplier deleted from GAS'))
        .withFailureHandler((err: unknown) => console.error('deleteSupplierRecord failed:', err))
        .deleteSupplierRecord(id, clientMeta);
    }
  }

  static async saveRMItem(rmItem: RMItem): Promise<void> {
    const current = this.loadFromLocalStorage();
    const exists = current.rmItems.some((r) => r.id === rmItem.id);
    const updatedRms = exists
      ? current.rmItems.map((r) => (r.id === rmItem.id ? rmItem : r))
      : [...current.rmItems, rmItem];
    this.saveToLocalStorage({ rmItems: updatedRms });

    if (this.isGoogleAvailable) {
      const clientMeta = await AuditService.getClientMetadata();
      google.script.run
        .withSuccessHandler(() => console.log('RMItem saved to GAS'))
        .withFailureHandler((err: unknown) => console.error('saveRMRecord failed:', err))
        .saveRMRecord(rmItem, clientMeta);
    }
  }

  static async deleteRMItem(id: string): Promise<void> {
    const current = this.loadFromLocalStorage();
    const updatedRms = current.rmItems.filter((r) => r.id !== id);
    this.saveToLocalStorage({ rmItems: updatedRms });

    if (this.isGoogleAvailable) {
      const clientMeta = await AuditService.getClientMetadata();
      google.script.run
        .withSuccessHandler(() => console.log('RMItem deleted from GAS'))
        .withFailureHandler((err: unknown) => console.error('deleteRMRecord failed:', err))
        .deleteRMRecord(id, clientMeta);
    }
  }

  static async mergeRMItems(
    targetRM: RMItem,
    mergedRmIds: string[],
    updatedReceivingRecords: ReceivingRecord[],
    updatedIssueLogs: IssueLogRecord[]
  ): Promise<void> {
    const current = this.loadFromLocalStorage();
    
    const updatedRmItems = current.rmItems
      .filter((r) => !mergedRmIds.includes(r.id) || r.id === targetRM.id)
      .map((r) => (r.id === targetRM.id ? targetRM : r));

    this.saveToLocalStorage({
      rmItems: updatedRmItems,
      receivingRecords: updatedReceivingRecords,
      issueLogs: updatedIssueLogs,
    });

    await this.saveRMItem(targetRM);

    for (const mergedId of mergedRmIds) {
      if (mergedId !== targetRM.id) {
        await this.deleteRMItem(mergedId);
      }
    }

    for (const rec of updatedReceivingRecords) {
      if (mergedRmIds.includes(rec.rmId)) {
        await this.saveReceivingRecord(rec);
      }
    }

    for (const issue of updatedIssueLogs) {
      if (mergedRmIds.includes(issue.rmId)) {
        await this.saveIssueLogRecord(issue);
      }
    }
  }

  static async saveReceivingRecord(record: ReceivingRecord): Promise<void> {
    const current = this.loadFromLocalStorage();
    const exists = current.receivingRecords.some((r) => r.id === record.id);
    const updated = exists
      ? current.receivingRecords.map((r) => (r.id === record.id ? record : r))
      : [record, ...current.receivingRecords];
    this.saveToLocalStorage({ receivingRecords: updated });

    if (this.isGoogleAvailable) {
      const clientMeta = await AuditService.getClientMetadata();
      google.script.run
        .withSuccessHandler(() => console.log('Receiving record saved to GAS'))
        .withFailureHandler((err: unknown) => console.error('saveReceivingRecord failed:', err))
        .saveReceivingRecord(record, clientMeta);
    }
  }

  static async saveReceivingRecordsBatch(records: ReceivingRecord[]): Promise<void> {
    if (!records || records.length === 0) return;
    
    const current = this.loadFromLocalStorage();
    const batchMap = new Map<string, ReceivingRecord>();
    records.forEach((r) => batchMap.set(r.id, r));

    const updated = [...records];
    current.receivingRecords.forEach((r) => {
      if (!batchMap.has(r.id)) {
        updated.push(r);
      }
    });

    this.saveToLocalStorage({ receivingRecords: updated });

    if (this.isGoogleAvailable) {
      const clientMeta = await AuditService.getClientMetadata();
      google.script.run
        .withSuccessHandler(() => console.log('Receiving records batch saved to GAS'))
        .withFailureHandler((err: unknown) => console.error('saveReceivingRecordsBatch failed:', err))
        .saveReceivingRecordsBatch(records, clientMeta);
    }
  }

  static async deleteReceivingRecord(id: string): Promise<void> {
    const current = this.loadFromLocalStorage();
    const updated = current.receivingRecords.filter((r) => r.id !== id);
    this.saveToLocalStorage({ receivingRecords: updated });

    if (this.isGoogleAvailable) {
      const clientMeta = await AuditService.getClientMetadata();
      google.script.run
        .withSuccessHandler(() => console.log('Receiving record deleted from GAS'))
        .withFailureHandler((err: unknown) => console.error('deleteReceivingRecord failed:', err))
        .deleteReceivingRecord(id, clientMeta);
    }
  }

  static async saveIssueLogRecord(record: IssueLogRecord): Promise<void> {
    const current = this.loadFromLocalStorage();
    const exists = current.issueLogs.some((i) => i.id === record.id);
    const updatedIssues = exists
      ? current.issueLogs.map((i) => (i.id === record.id ? record : i))
      : [record, ...current.issueLogs];

    // If receivingRecordId exists, update receivingRecords.hasIssueLog
    let updatedReceiving = current.receivingRecords;
    if (record.receivingRecordId) {
      updatedReceiving = current.receivingRecords.map((r) =>
        r.id === record.receivingRecordId ? { ...r, hasIssueLog: true } : r
      );
    }

    this.saveToLocalStorage({ issueLogs: updatedIssues, receivingRecords: updatedReceiving });

    if (this.isGoogleAvailable) {
      const clientMeta = await AuditService.getClientMetadata();
      google.script.run
        .withSuccessHandler(() => console.log('Issue log record saved to GAS'))
        .withFailureHandler((err: unknown) => console.error('saveIssueLogRecord failed:', err))
        .saveIssueLogRecord(record, clientMeta);
    }
  }

  static async deleteIssueLogRecord(id: string): Promise<void> {
    const current = this.loadFromLocalStorage();
    const issueToDelete = current.issueLogs.find(i => i.id === id);
    const updatedIssues = current.issueLogs.filter((i) => i.id !== id);

    let updatedReceiving = current.receivingRecords;
    if (issueToDelete && issueToDelete.receivingRecordId) {
      updatedReceiving = current.receivingRecords.map((r) =>
        r.id === issueToDelete.receivingRecordId ? { ...r, hasIssueLog: false } : r
      );
    }

    this.saveToLocalStorage({ issueLogs: updatedIssues, receivingRecords: updatedReceiving });

    if (this.isGoogleAvailable) {
      const clientMeta = await AuditService.getClientMetadata();
      google.script.run
        .withSuccessHandler(() => console.log('Issue log record deleted from GAS'))
        .withFailureHandler((err: unknown) => console.error('deleteIssueLogRecord failed:', err))
        .deleteIssueLogRecord(id, clientMeta);
    }
  }

  static async saveDefectMatrix(matrix: Record<string, DefectRule[]>): Promise<void> {
    this.saveToLocalStorage({ defectMatrix: matrix });

    if (this.isGoogleAvailable) {
      const clientMeta = await AuditService.getClientMetadata();
      google.script.run
        .withSuccessHandler(() => console.log('Defect matrix rules saved to GAS'))
        .withFailureHandler((err: unknown) => console.error('saveDefectMatrixRules failed:', err))
        .saveDefectMatrixRules(matrix, clientMeta);
    }
  }

  static async saveDefectCategory(category: DefectCategoryItem): Promise<void> {
    const current = this.loadFromLocalStorage();
    const exists = current.defectCategories.some((c) => c.id === category.id);
    const updatedCats = exists
      ? current.defectCategories.map((c) => (c.id === category.id ? category : c))
      : [...current.defectCategories, category];

    this.saveToLocalStorage({ defectCategories: updatedCats });

    if (this.isGoogleAvailable) {
      const clientMeta = await AuditService.getClientMetadata();
      google.script.run
        .withSuccessHandler(() => console.log('Defect category saved to GAS'))
        .withFailureHandler((err: unknown) => console.error('saveDefectCategory failed:', err))
        .saveDefectCategory(category, clientMeta);
    }
  }

  static async deleteDefectCategory(id: string): Promise<void> {
    const current = this.loadFromLocalStorage();
    const updatedCats = current.defectCategories.filter((c) => c.id !== id);
    this.saveToLocalStorage({ defectCategories: updatedCats });

    if (this.isGoogleAvailable) {
      const clientMeta = await AuditService.getClientMetadata();
      google.script.run
        .withSuccessHandler(() => console.log('Defect category deleted from GAS'))
        .withFailureHandler((err: unknown) => console.error('deleteDefectCategory failed:', err))
        .deleteDefectCategory(id, clientMeta);
    }
  }

  // --- Attachment / Google Drive Methods ---

  static async uploadAttachment(
    recordId: string,
    billNo: string,
    base64Data: string,
    fileName?: string
  ): Promise<ReceivingAttachmentItem> {
    if (this.isGoogleAvailable) {
      return new Promise((resolve) => {
        google.script.run
          .withSuccessHandler((res: { status: string; data?: ReceivingAttachmentItem; message?: string }) => {
            if (res && res.status === 'success' && res.data) {
              console.log('[PurchasingGasService] ✅ File uploaded to Google Drive:', res.data.name, res.data.driveViewUrl);
              resolve(res.data);
            } else {
              console.warn('[PurchasingGasService] uploadReceivingAttachmentToDrive failed, using local base64:', res?.message);
              resolve(normalizeAttachmentItem(base64Data));
            }
          })
          .withFailureHandler((err: unknown) => {
            console.error('[PurchasingGasService] uploadReceivingAttachmentToDrive error:', err);
            resolve(normalizeAttachmentItem(base64Data));
          })
          .uploadReceivingAttachmentToDrive(recordId, billNo, base64Data, 'image/jpeg', fileName);
      });
    }

    // Local dev mode fallback
    return normalizeAttachmentItem(base64Data);
  }

  static async deleteAttachmentFile(fileId: string): Promise<void> {
    if (!fileId || fileId.startsWith('att-')) return;
    if (this.isGoogleAvailable) {
      google.script.run
        .withSuccessHandler(() => console.log('[PurchasingGasService] Deleted file from Google Drive:', fileId))
        .withFailureHandler((err: unknown) => console.error('deleteReceivingAttachmentFromDrive error:', err))
        .deleteReceivingAttachmentFromDrive(fileId);
    }
  }
}
