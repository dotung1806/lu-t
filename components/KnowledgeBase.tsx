
import React, { useState, useRef, useEffect } from 'react';
import { Document } from '../types';

declare const pdfjsLib: any;
declare const mammoth: any;
declare const XLSX: any;
declare const JSZip: any;

interface KnowledgeBaseProps {
  documents: Document[];
  onAddDocument: (doc: Document) => void;
  onRemoveDocument: (id: string) => void;
  onBulkImport?: (docs: Document[]) => void;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ documents, onAddDocument, onRemoveDocument, onBulkImport }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [manualText, setManualText] = useState('');
  const [docName, setDocName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importJsonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }, []);

  // ... (Các hàm extract văn bản giữ nguyên như cũ)
  const extractPdfText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += `[Trang ${i}]\n${pageText}\n\n`;
    }
    return fullText;
  };

  const extractDocxText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractXlsxText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let text = "";
    workbook.SheetNames.forEach((sheetName: string) => {
      text += `--- Trang tính: ${sheetName} ---\n`;
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
      text += csv + "\n\n";
    });
    return text;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setProcessingCount(files.length);
    const fileArray: File[] = Array.from(files);
    for (const file of fileArray) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      try {
        let content = "";
        const arrayBuffer = await file.arrayBuffer();
        if (extension === 'pdf') content = await extractPdfText(arrayBuffer);
        else if (extension === 'docx') content = await extractDocxText(arrayBuffer);
        else if (extension === 'xlsx') content = await extractXlsxText(arrayBuffer);
        else if (['txt', 'json'].includes(extension || '')) content = new TextDecoder().decode(arrayBuffer);
        
        if (content.trim()) {
          onAddDocument({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type,
            content: content,
            uploadDate: new Date().toLocaleDateString('vi-VN')
          });
        }
      } catch (error) {}
    }
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualAdd = () => {
    if (!manualText.trim() || !docName.trim()) return;
    onAddDocument({
      id: Math.random().toString(36).substr(2, 9),
      name: docName,
      type: 'manual/entry',
      content: manualText,
      uploadDate: new Date().toLocaleDateString('vi-VN')
    });
    setManualText(''); setDocName('');
  };

  const exportData = () => {
    const dataStr = JSON.stringify(documents, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Kho_Kien_Thuc_BHXH.json`;
    link.click();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-book-bookmark text-blue-600"></i>
            Kho Kiến Thức
          </h2>
          <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
            {documents.length} Mục
          </span>
        </div>
        
        <div className="flex gap-2">
          <button onClick={exportData} className="flex-1 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-md text-[10px] font-bold hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
            <i className="fa-solid fa-download"></i> SAO LƯU
          </button>
          <button onClick={() => importJsonRef.current?.click()} className="flex-1 py-1.5 bg-white border border-emerald-200 text-emerald-600 rounded-md text-[10px] font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1.5">
            <i className="fa-solid fa-upload"></i> NHẬP FILE
          </button>
          <input type="file" ref={importJsonRef} onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const docs = JSON.parse(ev.target?.result as string);
                    if (onBulkImport) onBulkImport(docs);
                };
                reader.readAsText(file);
            }
          }} accept=".json" className="hidden" />
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Input */}
        <div className="space-y-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
          <input type="text" placeholder="Tên văn bản..." className="w-full p-2 text-xs border border-slate-200 rounded text-slate-900" value={docName} onChange={(e) => setDocName(e.target.value)} />
          <textarea placeholder="Nội dung..." className="w-full p-2 text-xs border border-slate-200 rounded h-16 resize-none text-slate-900" value={manualText} onChange={(e) => setManualText(e.target.value)} />
          <button onClick={handleManualAdd} className="w-full py-1.5 bg-blue-600 text-white rounded text-xs font-bold transition-colors">THÊM NHANH</button>
        </div>

        {/* Upload */}
        <div className="relative">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
          <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg text-xs hover:border-blue-400 transition-all flex flex-col items-center gap-1">
             <i className="fa-solid fa-cloud-arrow-up text-blue-500"></i>
             <span className="font-bold">TẢI FILE GỐC</span>
          </button>
        </div>

        {/* List */}
        <div className="space-y-2 mt-4">
          {documents.map(doc => (
            <div key={doc.id} className="group relative bg-white border border-slate-200 p-3 rounded-lg hover:border-blue-300 transition-colors">
              <div className="flex items-start gap-2">
                <div className={`w-1.5 h-10 shrink-0 rounded-full ${doc.isGlobal ? 'bg-blue-500' : 'bg-slate-300'}`} title={doc.isGlobal ? 'Dữ liệu hệ thống' : 'Dữ liệu cá nhân'}></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{doc.name}</p>
                    {doc.isGlobal && <i className="fa-solid fa-cloud text-[9px] text-blue-500" title="Đã lưu Cloud"></i>}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${doc.isGlobal ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-slate-50 text-slate-500 border border-slate-100'} uppercase`}>
                        {doc.isGlobal ? 'Hệ thống' : 'Cá nhân'}
                    </span>
                    <span className="text-[9px] text-slate-400">{doc.uploadDate}</span>
                  </div>
                </div>
                <button onClick={() => onRemoveDocument(doc.id)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                  <i className="fa-solid fa-xmark text-xs"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
