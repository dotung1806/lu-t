
import React, { useState, useCallback, useEffect } from 'react';
import KnowledgeBase from './components/KnowledgeBase';
import ChatInterface from './components/ChatInterface';
import { Document, Message, AppStatus } from './types';
import { askLegalAssistant } from './services/geminiService';
import { dbService } from './services/dbService';

const STORAGE_KEYS = {
  MESSAGES: 'bhxh_chat_history_v2'
};

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [showSettings, setShowSettings] = useState(false);
  
  const [config, setConfig] = useState({
    apiKey: localStorage.getItem('GEMINI_KEY') || '',
    supabaseUrl: localStorage.getItem('SB_URL') || '',
    supabaseKey: localStorage.getItem('SB_KEY') || ''
  });

  useEffect(() => {
    (window as any)._APP_CONFIG = config;
  }, [config]);

  const refreshData = async () => {
    if (!config.supabaseUrl || !config.supabaseKey) {
        setStatus(AppStatus.IDLE);
        return;
    }
    setStatus(AppStatus.SYNCING);
    const cloudDocs = await dbService.fetchGlobalDocuments();
    setDocuments(cloudDocs);
    setStatus(AppStatus.IDLE);
  };

  useEffect(() => {
    const initApp = async () => {
      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages).map((m: any) => ({
            ...m, timestamp: new Date(m.timestamp)
          }));
          setMessages(parsed);
        } catch (e) {}
      }
      
      if (!config.apiKey || !config.supabaseUrl) {
          setShowSettings(true);
      } else {
          await refreshData();
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  const saveConfig = () => {
    localStorage.setItem('GEMINI_KEY', config.apiKey);
    localStorage.setItem('SB_URL', config.supabaseUrl);
    localStorage.setItem('SB_KEY', config.supabaseKey);
    setShowSettings(false);
    refreshData();
  };

  const handleAddDocument = useCallback(async (doc: Document) => {
    if (!config.supabaseUrl) {
      setShowSettings(true);
      return;
    }
    setStatus(AppStatus.SYNCING);
    const success = await dbService.saveDocument(doc);
    if (success) await refreshData();
    else {
      alert("Lỗi kết nối Database.");
      setStatus(AppStatus.IDLE);
    }
  }, [documents, config]);

  const handleRemoveDocument = useCallback(async (id: string) => {
    if (!window.confirm("Xóa văn bản này khỏi KHO CHUNG của nhóm?")) return;
    setStatus(AppStatus.SYNCING);
    const success = await dbService.deleteDocument(id);
    if (success) await refreshData();
    setStatus(AppStatus.IDLE);
  }, [config]);

  const handleSendMessage = async (text: string) => {
    if (!config.apiKey) {
      alert("Vui lòng cấu hình API Key trong phần Cài đặt.");
      setShowSettings(true);
      return;
    }

    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      text: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setStatus(AppStatus.LOADING);

    try {
      const responseText = await askLegalAssistant(text, [...messages, userMessage], documents);
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        text: responseText,
        timestamp: new Date()
      }]);
      setStatus(AppStatus.IDLE);
    } catch (error: any) {
      setStatus(AppStatus.ERROR);
      let errorMsg = "Đã xảy ra lỗi không xác định.";
      
      if (error.message === "QUOTA_EXCEEDED") {
        errorMsg = "⚠️ Giới hạn lượt hỏi trong phút của tài khoản miễn phí đã hết. Vui lòng đợi 1 phút và thử lại, hoặc nâng cấp API Key.";
      } else if (error.message === "KEY_MISSING_OR_INVALID") {
        errorMsg = "❌ API Key chưa đúng hoặc không hợp lệ. Vui lòng kiểm tra lại trong phần Cài đặt.";
      } else {
        errorMsg = `Lỗi hệ thống: ${error.message}`;
      }

      setMessages(prev => [...prev, {
        id: 'err',
        role: 'assistant',
        text: errorMsg,
        timestamp: new Date()
      }]);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#f0f2f5] text-slate-900 overflow-hidden font-sans">
      <nav className="bg-white border-b border-slate-200 px-6 py-2.5 flex justify-between items-center shadow-sm select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-700 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-100">
             <i className="fa-solid fa-microchip"></i>
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tighter">BHXH Digital Assistant</h1>
            <p className="text-[9px] font-bold text-blue-500 flex items-center gap-1">
               <i className="fa-solid fa-circle text-[6px] animate-pulse"></i> 
               {status === AppStatus.SYNCING ? "ĐANG ĐỒNG BỘ..." : "TRỰC TUYẾN - NHÓM CHÂU THÀNH"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Cấu hình hệ thống"
          >
            <i className="fa-solid fa-gear text-sm"></i>
          </button>
          <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>
          <div className="text-right hidden sm:block">
             <p className="text-[10px] font-bold text-slate-400">HỆ THỐNG</p>
             <p className="text-[11px] font-black text-slate-700">Đ.T.Tùng</p>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        <div className="w-full md:w-80 lg:w-96 shrink-0 h-[180px] md:h-full">
          <KnowledgeBase 
            documents={documents} 
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
          />
        </div>
        <div className="flex-1 h-full min-w-0">
          <ChatInterface messages={messages} status={status} onSendMessage={handleSendMessage} />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-1.5 flex justify-between items-center text-[9px] font-bold text-slate-400">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <i className={`fa-solid fa-cloud-check ${config.supabaseUrl ? 'text-emerald-500' : 'text-slate-300'}`}></i> 
            {config.supabaseUrl ? 'Cloud Connected' : 'No Connection'}
          </span>
          <span>{documents.length} văn bản dùng chung</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="uppercase">Phiên bản Desktop 2.5</span>
          <span className="text-blue-600">BHXH AN GIANG</span>
        </div>
      </footer>

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                 <i className="fa-solid fa-screwdriver-wrench text-blue-600"></i>
                 Kết nối hệ thống nhóm
               </h3>
               {config.apiKey && (
                 <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>
               )}
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 mb-2">
                <p className="text-[10px] text-blue-700 font-bold leading-tight">
                  <i className="fa-solid fa-info-circle mr-1"></i>
                  Bạn chỉ cần nhập các mã này 1 lần duy nhất. Liên hệ Admin để lấy mã kết nối chung cho cả đơn vị.
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">1. Gemini AI Key</label>
                <input 
                  type="password" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={config.apiKey}
                  onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                  placeholder="Mã AI (dạng AIza...)"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">2. Supabase URL</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  value={config.supabaseUrl}
                  onChange={(e) => setConfig({...config, supabaseUrl: e.target.value})}
                  placeholder="https://xxx.supabase.co"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">3. Supabase Anon Key</label>
                <input 
                  type="password" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  value={config.supabaseKey}
                  onChange={(e) => setConfig({...config, supabaseKey: e.target.value})}
                  placeholder="Mã bảo mật Database"
                />
              </div>
              
              <button 
                onClick={saveConfig}
                className="w-full py-3.5 bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-100 hover:bg-blue-800 transition-all active:scale-95 mt-2 flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-plug-circle-check"></i>
                KẾT NỐI VÀ BẮT ĐẦU
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
