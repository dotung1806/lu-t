
import React, { useState, useRef, useEffect } from 'react';
import { Document } from '../types';

declare const pdfjsLib: any;
declare const mammoth: any;
declare const XLSX: any;

interface KnowledgeBaseProps {
  documents: Document[];
  onAddDocument: (doc: Document) => void;
  onRemoveDocument: (id: string) => void;
  isAdmin: boolean;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ documents, onAddDocument, onRemoveDocument, isAdmin }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    
    for (const file of Array.from(files) as File[]) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      try {
        let content = "";
        const arrayBuffer = await file.arrayBuffer();
        
        if (extension === 'pdf') {
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            content += textContent.items.map((item: any) => item.str).join(" ") + "\n";
          }
        } else if (extension === 'docx') {
          const result = await mammoth.extractRawText({ arrayBuffer });
          content = result.value;
        } else if (['txt', 'json'].includes(extension || '')) {
          content = new TextDecoder().decode(arrayBuffer);
        }
        
        if (content.trim()) {
          onAddDocument({
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type,
            content: content,
            uploadDate: new Date().toISOString(),
            isGlobal: true,
            author: "Đ.T.Tùng"
          });
        }
      } catch (error) {
        console.error("Lỗi đọc file:", file.name, error);
      }
    }
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <i className="fa-solid fa-database text-blue-600"></i>
          Kho Văn Bản Chung
        </h2>
        <p className="text-[10px] text-slate-500 font-medium mt-1">Nơi lưu trữ tài liệu chuẩn của đơn vị.</p>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Nút tải lên - Chỉ hiện cho Admin */}
        {isAdmin && (
          <div className="relative">
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple />
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isProcessing}
              className="w-full py-3 border-2 border-dashed border-blue-200 bg-blue-50/30 text-blue-600 rounded-lg text-xs hover:bg-blue-50 hover:border-blue-300 transition-all flex flex-col items-center gap-1 font-bold"
            >
               {isProcessing ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-cloud-arrow-up"></i>}
               <span>{isProcessing ? "ĐANG TẢI LÊN CLOUD..." : "TẢI VĂN BẢN MỚI LÊN NHÓM"}</span>
            </button>
          </div>
        )}

        {/* Danh sách văn bản */}
        <div className="space-y-2">
          {documents.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <i className="fa-solid fa-folder-open text-3xl mb-2 opacity-20"></i>
              <p className="text-[10px]">Kho dữ liệu chung đang trống.</p>
            </div>
          ) : (
            documents.map(doc => (
              <div key={doc.id} className="bg-white border border-slate-200 p-2.5 rounded-lg hover:border-blue-400 transition-colors shadow-sm">
                <div className="flex items-start gap-2">
                  <i className="fa-solid fa-file-contract text-blue-500 mt-0.5"></i>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 truncate">{doc.name}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[8px] text-slate-400">
                        {new Date(doc.uploadDate).toLocaleDateString('vi-VN')} • Admin {doc.author || "Tùng"}
                      </span>
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => onRemoveDocument(doc.id)} className="text-slate-300 hover:text-red-500 p-1">
                      <i className="fa-solid fa-trash-can text-[10px]"></i>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBase;
