import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  ZoomIn,
  CheckCircle2,
  FileText,
  AlertCircle,
  Download,
  Plus,
  ExternalLink,
  HardDrive,
} from 'lucide-react';
import {
  ReceivingRecord,
  ReceivingAttachmentItem,
  normalizeAttachmentItem,
} from '@/services/DefectMatrixService';
import { compressImageFile } from '@/utils/imageCompressor';
import { PurchasingGasService } from '@/services/PurchasingGasService';
import { motion, AnimatePresence } from 'framer-motion';

interface RMReceivingAttachmentModalProps {
  record: ReceivingRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveAttachments: (recordId: string, attachments: ReceivingAttachmentItem[]) => void;
}

export const RMReceivingAttachmentModal: React.FC<RMReceivingAttachmentModalProps> = ({
  record,
  isOpen,
  onClose,
  onSaveAttachments,
}) => {
  const [attachments, setAttachments] = useState<ReceivingAttachmentItem[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<ReceivingAttachmentItem | null>(null);
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // Sync state when record changes
  useEffect(() => {
    if (record) {
      const normalized = (record.attachments || []).map(normalizeAttachmentItem);
      setAttachments(normalized);
      setErrorMessage(null);
      setSaveSuccessNotice(false);
    }
  }, [record, isOpen]);

  // Handle global paste event (e.g. Ctrl+V screenshot)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        await handleProcessFiles(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, attachments, record]);

  if (!isOpen || !record) return null;

  // Process files through compression and Google Drive upload
  const handleProcessFiles = async (files: File[] | FileList) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setErrorMessage('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WEBP)');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgressText('กำลังบีบอัดรูปภาพ...');

    try {
      const newItems: ReceivingAttachmentItem[] = [];

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgressText(`กำลังอัปโหลดรูปที่ ${i + 1}/${validFiles.length} เข้า Google Drive...`);

        const base64 = await compressImageFile(file, {
          maxDimension: 1400,
          quality: 0.8,
        });

        const uploadedItem = await PurchasingGasService.uploadAttachment(
          record.id,
          record.billNo,
          base64,
          file.name
        );

        newItems.push(uploadedItem);
      }

      const updated = [...attachments, ...newItems];
      setAttachments(updated);
      onSaveAttachments(record.id, updated);
      triggerSuccessFlash();
    } catch (err) {
      console.error('Failed to process/upload image:', err);
      setErrorMessage('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพเข้า Google Drive');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Replace specific image
  const handleTriggerReplace = (index: number) => {
    setReplaceTargetIndex(index);
    if (replaceInputRef.current) {
      replaceInputRef.current.value = '';
      replaceInputRef.current.click();
    }
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || replaceTargetIndex === null) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setUploadProgressText('กำลังอัปโหลดรูปใหม่เข้า Google Drive...');

    try {
      const oldItem = attachments[replaceTargetIndex];
      if (oldItem && oldItem.id) {
        PurchasingGasService.deleteAttachmentFile(oldItem.id);
      }

      const base64 = await compressImageFile(file, {
        maxDimension: 1400,
        quality: 0.8,
      });

      const uploaded = await PurchasingGasService.uploadAttachment(
        record.id,
        record.billNo,
        base64,
        file.name
      );

      const updated = [...attachments];
      updated[replaceTargetIndex] = uploaded;
      setAttachments(updated);
      onSaveAttachments(record.id, updated);
      triggerSuccessFlash();
    } catch (err) {
      console.error('Failed to replace image:', err);
      setErrorMessage('ไม่สามารถเปลี่ยนรูปภาพได้');
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      setReplaceTargetIndex(null);
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  // Handle Delete specific image
  const handleDeleteImage = (index: number) => {
    const targetItem = attachments[index];
    if (targetItem && targetItem.id) {
      PurchasingGasService.deleteAttachmentFile(targetItem.id);
    }
    const updated = attachments.filter((_, i) => i !== index);
    setAttachments(updated);
    onSaveAttachments(record.id, updated);
    triggerSuccessFlash();
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleProcessFiles(e.dataTransfer.files);
    }
  };

  const triggerSuccessFlash = () => {
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        className="relative bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden z-10"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-50 via-white to-slate-50 border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 border border-sky-200 text-sky-700 flex items-center justify-center shadow-xs shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-tight">
                  จัดการรูปภาพแนบการรับเข้าวัตถุดิบ (Google Drive)
                </h3>
                {attachments.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                    {attachments.length} รูป
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>บิล: <strong className="text-slate-700 font-mono">{record.billNo}</strong></span>
                <span className="text-slate-300">•</span>
                <span>RM: <strong className="text-slate-700">{record.rmName}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Supplier: <strong className="text-slate-700">{record.supplierName}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveSuccessNotice && (
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                บันทึกลง Google Drive & Sheet แล้ว
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer active:scale-95"
              title="ปิดหน้าต่าง"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Error Notice */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-sky-500 bg-sky-50/80 scale-[0.99]'
                : 'border-slate-300 hover:border-sky-400 bg-slate-50/60 hover:bg-sky-50/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleProcessFiles(e.target.files);
                }
              }}
            />

            {/* Hidden Input for Single Image Replacement */}
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleReplaceFileChange}
            />

            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-sky-600">
                {isUploading ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                ) : (
                  <Upload className="w-6 h-6" />
                )}
              </div>
              <div className="mt-1">
                <p className="text-sm font-semibold text-slate-800">
                  {isUploading
                    ? uploadProgressText || 'กำลังประมวลผลและอัปโหลดเข้า Google Drive...'
                    : 'คลิกเพื่อเลือกไฟล์ หรือลากรูปภาพมาวางที่นี่'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  รูปจะถูกเก็บเข้าโฟลเดอร์ <span className="font-semibold text-slate-700">RM_Receiving_Attachments</span> บน Google Drive พร้อมลิงก์เปิดดูใน Google Sheet ทันที (หรือกด <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-mono shadow-2xs">Ctrl + V</kbd> เพื่อวางภาพที่แคปไว้)
                </p>
              </div>
            </div>
          </div>

          {/* Attached Images Gallery Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                รูปภาพที่แนบไว้ ({attachments.length} รายการ)
              </h4>
              {attachments.length > 0 && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่มรูปอีก
                </button>
              )}
            </div>

            {attachments.length === 0 ? (
              <div className="py-12 bg-slate-50/50 rounded-xl border border-slate-200 border-dashed text-center flex flex-col items-center justify-center">
                <ImageIcon className="w-10 h-10 text-slate-300 mb-2 stroke-[1.5]" />
                <p className="text-sm font-medium text-slate-500">ยังไม่มีรูปภาพแนบสำหรับรายการนี้</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  ท่านสามารถแนบรูปถ่ายสินค้า, ใบส่งของ, หรือสภาพตำหนิต่างๆ ได้ที่นี่
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {attachments.map((item, idx) => (
                  <motion.div
                    key={item.id || idx}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="group relative bg-slate-900 rounded-xl overflow-hidden border border-slate-200 shadow-sm aspect-square flex flex-col justify-between"
                  >
                    {/* Thumbnail Image */}
                    <img
                      src={item.url}
                      alt={item.name || `แนบรูปที่ ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />

                    {/* Image Number & Drive Badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900/75 backdrop-blur-xs text-[11px] font-medium text-white shadow-xs">
                        #{idx + 1}
                      </span>
                      {item.driveViewUrl && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-600/80 backdrop-blur-xs text-[10px] font-semibold text-white shadow-xs flex items-center gap-0.5">
                          <HardDrive className="w-2.5 h-2.5" />
                          Drive
                        </span>
                      )}
                    </div>

                    {/* Hover Overlay Controls */}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-2">
                      <div className="flex items-center gap-1.5">
                        {/* Zoom Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewItem(item);
                          }}
                          className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
                          title="ดูภาพขยายเต็มจอ"
                        >
                          <ZoomIn className="w-4 h-4" />
                        </button>

                        {/* Replace Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerReplace(idx);
                          }}
                          className="w-8 h-8 rounded-lg bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
                          title="เปลี่ยนรูปภาพนี้"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteImage(idx);
                          }}
                          className="w-8 h-8 rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer"
                          title="ลบรูปภาพนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Open in Google Drive button */}
                      {item.driveViewUrl && (
                        <a
                          href={item.driveViewUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-slate-800/90 hover:bg-slate-700 px-2 py-1 rounded-md border border-slate-600 shadow-xs transition-colors"
                          title="เปิดไฟล์ใน Google Drive"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Google Drive</span>
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex items-center justify-between rounded-b-2xl shrink-0">
          <div className="text-xs text-slate-500">
            {attachments.length > 0 ? (
              <span className="text-slate-600">
                รูปภาพถูกจัดเก็บใน Google Drive และบันทึกลิงก์ลง Google Sheet แล้ว
              </span>
            ) : (
              <span>สามารถปิดหน้าต่างได้เมื่อเสร็จสิ้น</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-5 bg-slate-900 hover:bg-black text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
            >
              เสร็จสิ้น / ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </motion.div>

      {/* -------------------------------------------------------------
          FULLSCREEN IMAGE LIGHTBOX
      ------------------------------------------------------------- */}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in">
            <button
              type="button"
              onClick={() => setPreviewItem(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer z-10"
              title="ปิดการดูรูปภาพ"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Action buttons on top left */}
            <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
              <a
                href={previewItem.url}
                download={previewItem.name || `RM-Receiving-${record.billNo}-${Date.now()}.jpg`}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium backdrop-blur-xs transition-colors"
                title="ดาวน์โหลดรูปภาพ"
              >
                <Download className="w-4 h-4" />
                <span>ดาวน์โหลดรูปภาพ</span>
              </a>

              {previewItem.driveViewUrl && (
                <a
                  href={previewItem.driveViewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-medium backdrop-blur-xs transition-colors"
                  title="เปิดดูใน Google Drive"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดใน Google Drive</span>
                </a>
              )}
            </div>

            <div
              className="max-w-4xl max-h-[85vh] flex items-center justify-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewItem.url}
                alt={previewItem.name || 'รูปภาพขนาดเต็ม'}
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
