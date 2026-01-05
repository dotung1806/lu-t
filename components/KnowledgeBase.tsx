
import React, { useState, useRef, useEffect } from 'react';
import { Document } from '../types';

// Declare external libraries from CDN
declare const pdfjsLib: any;
declare const mammoth: any;
declare const XLSX: any;
declare const JSZip: any;

interface KnowledgeBaseProps {
  documents: Document[];
  onAddDocument: (doc: Document) => void;
  onRemoveDocument: (id: string) => void;
}

const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ documents, onAddDocument, onRemoveDocument }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingCount, setProcessingCount] = useState(0);
  const [manualText, setManualText] = useState('');
  const [docName, setDocName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize PDF.js worker
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }, []);

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

  const extractPptxText = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const zip = await JSZip.loadAsync(arrayBuffer);
    let text = "";
    const slideFiles = Object.keys(zip.files).filter(name => 
      name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
    ).sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''));
        const numB = parseInt(b.replace(/[^0-9]/g, ''));
        return numA - numB;
    });

    for (const name of slideFiles) {
      const content = await zip.files[name].async("string");
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(content, "text/xml");
      const texts = xmlDoc.getElementsByTagName("a:t");
      let slideText = "";
      for (let i = 0; i < texts.length; i++) {
        slideText += texts[i].textContent + " ";
      }
      if (slideText.trim()) {
        text += `[Slide ${slideFiles.indexOf(name) + 1}]\n${slideText}\n\n`;
      }
    }
    return text;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessingCount(files.length);
    
    // Fix: Cast Array.from(files) to File[] to resolve type errors on line 96, 99, 122, 129, 130, and 137
    const fileArray: File[] = Array.from(files);
    
    for (const file of fileArray) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      try {
        let content = "";
        const arrayBuffer = await file.arrayBuffer();

        switch (extension) {
          case 'pdf':
            content = await extractPdfText(arrayBuffer);
            break;
          case 'docx':
          case 'doc':
            content = await extractDocxText(arrayBuffer);
            break;
          case 'xlsx':
          case 'xls':
            content = await extractXlsxText(arrayBuffer);
            break;
          case 'pptx':
          case 'ppt':
            content = await extractPptxText(arrayBuffer);
            break;
          case 'txt':
          case 'json':
            content = new TextDecoder().decode(arrayBuffer);
            break;
          default:
            console.warn(`Định dạng file ${file.name} không hỗ trợ!`);
            continue;
        }

        if (content.trim()) {
          const newDoc: Document = {
            id: Math.random().toString(36).substr(2, 9),
            name: file.name,
            type: file.type || 'application/octet-stream',
            content: content,
            uploadDate: new Date().toLocaleDateString('vi-VN')
          };
          onAddDocument(newDoc);
        }
      } catch (error) {
        console.error(`Lỗi xử lý file ${file.name}:`, error);
      }
    }

    setIsProcessing(false);
    setProcessingCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualAdd = () => {
    if (!manualText.trim() || !docName.trim()) return;

    const newDoc: Document = {
      id: Math.random().toString(36).substr(2, 9),
      name: docName,
      type: 'manual/entry',
      content: manualText,
      uploadDate: new Date().toLocaleDateString('vi-VN')
    };
    onAddDocument(newDoc);
    setManualText('');
    setDocName('');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
        <h2 className="font-bold text-slate-800 flex items-center gap-2">
          <i className="fa-solid fa-book-bookmark text-blue-600"></i>
          Kho Kiến Thức Pháp Luật
        </h2>
        <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
          {documents.length} Văn bản
        </span>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Manual Input Section */}
        <div className="space-y-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Thêm kiến thức nhanh</p>
          <input 
            type="text" 
            placeholder="Tên văn bản (VD: Luật BHXH 2014)"
            className="w-full p-2 text-sm border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
          />
          <textarea 
            placeholder="Dán nội dung điều luật, nghị định hoặc thông tư tại đây..."
            className="w-full p-2 text-sm border border-slate-200 rounded h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-900"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
          />
          <button 
            onClick={handleManualAdd}
            disabled={!manualText.trim() || !docName.trim()}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            Thêm Văn Bản
          </button>
        </div>

        {/* File Upload Hidden Input */}
        <div className="relative">
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.json"
            multiple
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className={`w-full py-4 border-2 border-dashed ${isProcessing ? 'border-blue-300 bg-blue-50' : 'border-slate-300'} text-slate-500 rounded-lg text-sm hover:border-blue-400 hover:text-blue-500 transition-all flex flex-col items-center gap-2`}
          >
            {isProcessing ? (
              <>
                <i className="fa-solid fa-spinner fa-spin text-blue-500 text-xl"></i>
                <span className="text-blue-600 font-medium">Đang xử lý {processingCount} tệp...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-file-export text-xl text-blue-500"></i>
                <div className="text-center px-2">
                    <p className="font-semibold text-slate-700">Tải lên tài liệu pháp luật</p>
                    <p className="text-[10px] opacity-70">Chọn một hoặc nhiều: PDF, Word, Excel, Slide, TXT</p>
                </div>
              </>
            )}
          </button>
        </div>

        {/* Documents List */}
        <div className="space-y-2 mt-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Danh sách hiện có</p>
          {documents.length === 0 ? (
            <div className="text-center py-10 opacity-40">
              <i className="fa-solid fa-folder-open text-3xl mb-2"></i>
              <p className="text-sm">Chưa có dữ liệu kiến thức</p>
            </div>
          ) : (
            documents.map(doc => (
              <div key={doc.id} className="group relative bg-white border border-slate-200 p-3 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start pr-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <FileIcon type={doc.name.split('.').pop() || ''} />
                        <p className="text-sm font-semibold text-slate-800 truncate" title={doc.name}>{doc.name}</p>
                    </div>
                    <p className="text-[10px] text-slate-400">{doc.uploadDate} • {doc.content.length.toLocaleString()} ký tự</p>
                  </div>
                  <button 
                    onClick={() => onRemoveDocument(doc.id)}
                    className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <i className="fa-solid fa-trash-can text-sm"></i>
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 line-clamp-2 italic">
                  "{doc.content.substring(0, 150).trim()}..."
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="p-3 bg-amber-50 border-t border-amber-100">
        <p className="text-[10px] text-amber-700 leading-tight">
          <i className="fa-solid fa-triangle-exclamation mr-1"></i>
          Dữ liệu được lưu trữ an toàn trong trình duyệt của bạn.
        </p>
      </div>
    </div>
  );
};

const FileIcon: React.FC<{type: string}> = ({ type }) => {
    const t = type.toLowerCase();
    if (['pdf'].includes(t)) return <i className="fa-solid fa-file-pdf text-red-500"></i>;
    if (['docx', 'doc'].includes(t)) return <i className="fa-solid fa-file-word text-blue-500"></i>;
    if (['xlsx', 'xls'].includes(t)) return <i className="fa-solid fa-file-excel text-emerald-500"></i>;
    if (['pptx', 'ppt'].includes(t)) return <i className="fa-solid fa-file-powerpoint text-orange-500"></i>;
    return <i className="fa-solid fa-file-lines text-slate-400"></i>;
}

export default KnowledgeBase;
