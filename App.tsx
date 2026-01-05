
import React, { useState, useCallback, useEffect } from 'react';
import KnowledgeBase from './components/KnowledgeBase';
import ChatInterface from './components/ChatInterface';
import { Document, Message, AppStatus } from './types';
import { askLegalAssistant } from './services/geminiService';
import { dbService } from './services/dbService';

// Note: Removed the redundant declare global for window.aistudio to resolve conflicts with pre-defined environment types.

const STORAGE_KEYS = {
  DOCUMENTS: 'bhxh_legal_docs_local',
  MESSAGES: 'bhxh_chat_history'
};

const App: React.FC = () => {
  const [localDocuments, setLocalDocuments] = useState<Document[]>([]);
  const [globalDocuments, setGlobalDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  const allDocuments = [...globalDocuments, ...localDocuments];

  useEffect(() => {
    const initData = async () => {
      setStatus(AppStatus.SYNCING);
      
      // Fix: Access window.aistudio through casting to avoid TypeScript conflicts while utilizing the environment-provided interface
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        const selected = await aiStudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }

      const savedDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (savedDocs) {
        try { setLocalDocuments(JSON.parse(savedDocs)); } catch (e) {}
      }

      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (savedMessages) {
        try {
          const parsedMessages = JSON.parse(savedMessages).map((m: any) => ({
            ...m, timestamp: new Date(m.timestamp)
          }));
          setMessages(parsedMessages);
        } catch (e) {}
      }

      const cloudDocs = await dbService.fetchGlobalDocuments();
      setGlobalDocuments(cloudDocs);
      
      setStatus(AppStatus.IDLE);
    };

    initData();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(localDocuments));
  }, [localDocuments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  const handleConnectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      await aiStudio.openSelectKey();
      // As per guidelines, assume successful key selection after triggering openSelectKey
      setHasApiKey(true);
      window.location.reload(); 
    }
  };

  const handleAddDocument = useCallback(async (doc: Document) => {
    const isDuplicate = allDocuments.some(d => d.content.trim() === doc.content.trim());
    if (isDuplicate) {
      alert(`Văn bản "${doc.name}" đã tồn tại.`);
      return;
    }

    const saveToCloud = window.confirm("Lưu lên ĐÁM MÂY (Hệ thống) hay CÁ NHÂN?\n\nOK = Hệ thống | Cancel = Cá nhân");

    if (saveToCloud) {
      setStatus(AppStatus.SYNCING);
      const success = await dbService.saveDocument(doc);
      if (success) {
        setGlobalDocuments(prev => [...prev, { ...doc, isGlobal: true }]);
      } else {
        alert("Lỗi lưu Cloud. Đã lưu tạm vào máy này.");
        setLocalDocuments(prev => [...prev, doc]);
      }
      setStatus(AppStatus.IDLE);
    } else {
      setLocalDocuments(prev => [...prev, doc]);
    }
  }, [allDocuments]);

  const handleRemoveDocument = useCallback(async (id: string, isGlobal?: boolean) => {
    if (isGlobal) {
      if (!window.confirm("Xóa văn bản HỆ THỐNG?")) return;
      setStatus(AppStatus.SYNCING);
      const success = await dbService.deleteDocument(id);
      if (success) {
        setGlobalDocuments(prev => prev.filter(d => d.id !== id));
      }
      setStatus(AppStatus.IDLE);
    } else {
      setLocalDocuments(prev => prev.filter(d => d.id !== id));
    }
  }, []);

  const handleBulkImport = useCallback((importedDocs: Document[]) => {
    setLocalDocuments(prev => {
      const newDocs = [...prev];
      importedDocs.forEach(doc => {
        const isDuplicate = allDocuments.some(d => d.content.trim() === doc.content.trim());
        if (!isDuplicate) newDocs.push(doc);
      });
      return newDocs;
    });
  }, [allDocuments]);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      text: text,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setStatus(AppStatus.LOADING);

    try {
      const responseText = await askLegalAssistant(text, newMessages, allDocuments);
      
      const assistantMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        text: responseText,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setStatus(AppStatus.IDLE);
    } catch (error: any) {
      console.error("Error in conversation:", error);
      
      // Fix: Follow guidelines to reset key selection state if "Requested entity was not found" error occurs
      if (error.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
      }

      setStatus(AppStatus.ERROR);
      setMessages(prev => [...prev, {
        id: 'err',
        role: 'assistant',
        text: "Không thể kết nối AI. Vui lòng kiểm tra lại API Key.",
        timestamp: new Date()
      }]);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Banner cảnh báo thiếu Key */}
      {!hasApiKey && (
        <div className="bg-amber-500 text-white px-6 py-2 flex justify-between items-center animate-in fade-in slide-in-from-top duration-500">
          <div className="flex items-center gap-2 text-sm font-bold">
            <i className="fa-solid fa-triangle-exclamation"></i>
            Hệ thống chưa nhận diện được API Key. Bạn cần kết nối để sử dụng AI.
          </div>
          <button 
            onClick={handleConnectKey}
            className="bg-white text-amber-600 px-4 py-1 rounded-full text-xs font-black hover:bg-slate-100 transition-colors shadow-sm"
          >
            KẾT NỐI NGAY
          </button>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200 relative">
             <i className="fa-solid fa-scale-balanced text-lg"></i>
             {status === AppStatus.SYNCING && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
                    <i className="fa-solid fa-rotate text-[8px] animate-spin"></i>
                </div>
             )}
          </div>
          <div>
            <span className="text-sm md:text-base font-black bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent uppercase tracking-tight">
              BHXH Châu Thành An Giang - Đ.T.Tùng
            </span>
            <div className="flex items-center gap-2">
                <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Chuyên gia số BHXH 4.0</p>
                <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                <span className={`text-[9px] font-bold flex items-center gap-1 ${hasApiKey ? 'text-blue-500' : 'text-amber-500'}`}>
                    <i className={`fa-solid ${hasApiKey ? 'fa-cloud' : 'fa-circle-xmark'}`}></i> 
                    {hasApiKey ? 'Đã kết nối Cloud AI' : 'Chưa có API Key'}
                </span>
            </div>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => { if(window.confirm("Xóa lịch sử?")) setMessages([]) }}
            className="text-sm font-medium text-slate-600 hover:text-red-600 transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-trash-can"></i> Xóa lịch sử
          </button>
          <button 
            onClick={handleConnectKey}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2"
          >
             <i className="fa-solid fa-key"></i> ĐỔI API KEY
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row p-4 md:p-6 gap-6 overflow-hidden">
        <div className="w-full md:w-1/3 lg:w-1/4 h-[300px] md:h-full shrink-0">
          <KnowledgeBase 
            documents={allDocuments} 
            onAddDocument={handleAddDocument}
            onRemoveDocument={(id) => {
                const doc = allDocuments.find(d => d.id === id);
                handleRemoveDocument(id, doc?.isGlobal);
            }}
            onBulkImport={handleBulkImport}
          />
        </div>

        <div className="flex-1 h-full">
          <ChatInterface 
            messages={messages}
            status={status}
            onSendMessage={handleSendMessage}
          />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-2 text-center text-[10px] text-slate-400 flex justify-between items-center">
        <span>Bản quyền &copy; 2024 BHXH cơ sở Châu Thành tỉnh An Giang - Đ.T.Tùng.</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-database text-blue-500"></i>
            {globalDocuments.length} Hệ thống
          </span>
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-hard-drive text-slate-400"></i>
            {localDocuments.length} Cá nhân
          </span>
          <span className="flex items-center gap-1">
            <i className="fa-solid fa-shield-halved text-emerald-500"></i>
            SSL 256-bit Encrypted
          </span>
        </span>
      </footer>
    </div>
  );
};

export default App;
