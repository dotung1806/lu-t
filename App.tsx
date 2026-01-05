
import React, { useState, useCallback, useEffect } from 'react';
import KnowledgeBase from './components/KnowledgeBase';
import ChatInterface from './components/ChatInterface';
import { Document, Message, AppStatus } from './types';
import { askLegalAssistant } from './services/geminiService';
import { dbService } from './services/dbService';

const STORAGE_KEYS = {
  MESSAGES: 'bhxh_chat_history_v2'
};

const ADMIN_PASSWORD_SECRET = "tung123"; 

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [showSettings, setShowSettings] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  
  const [config, setConfig] = useState({
    apiKey: localStorage.getItem('GEMINI_KEY') || '',
    supabaseUrl: localStorage.getItem('SB_URL') || '',
    supabaseKey: localStorage.getItem('SB_KEY') || '',
    adminPass: localStorage.getItem('ADMIN_PASS') || ''
  });

  const isAdmin = config.adminPass === ADMIN_PASSWORD_SECRET;

  useEffect(() => {
    (window as any)._APP_CONFIG = config;
  }, [config]);

  const refreshData = async () => {
    if (!config.supabaseUrl || !config.supabaseKey) {
        setStatus(AppStatus.IDLE);
        return;
    }
    setStatus(AppStatus.SYNCING);
    try {
      const cloudDocs = await dbService.fetchGlobalDocuments();
      setDocuments(cloudDocs);
    } catch (e) {
      console.error("Refresh failed", e);
    }
    setStatus(AppStatus.IDLE);
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    if (!config.supabaseUrl || !config.supabaseKey) {
      setTestResult({ success: false, message: "Vui lòng nhập đầy đủ thông tin máy chủ." });
      return;
    }
    
    try {
      const docs = await dbService.fetchGlobalDocuments();
      setTestResult({ 
        success: true, 
        message: `Kết nối máy chủ thành công! Tìm thấy ${docs.length} văn bản.` 
      });
    } catch (e: any) {
      setTestResult({ success: false, message: `Lỗi kết nối: ${e.message}` });
    }
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
    localStorage.setItem('ADMIN_PASS', config.adminPass);
    setTestResult(null);
    setShowSettings(false);
    refreshData();
  };

  const handleAddDocument = useCallback(async (doc: Document) => {
    if (!isAdmin) {
      alert("Tính năng này chỉ dành cho tài khoản quản trị.");
      return;
    }
    setStatus(AppStatus.SYNCING);
    const result = await dbService.saveDocument({ ...doc, author: "Đ.T.Tùng" });
    if (result.success) {
      await refreshData();
    } else {
      if (result.message?.includes("isGlobal") || result.message?.includes("column")) {
        alert("Lưu ý: Hệ thống đang cập nhật cấu trúc bảng. Vui lòng thử lại sau 1 phút.");
      } else {
        alert(`Lỗi hệ thống: ${result.message}`);
      }
      setStatus(AppStatus.IDLE);
    }
  }, [isAdmin, config]);

  const handleRemoveDocument = useCallback(async (id: string) => {
    if (!isAdmin) return;
    if (!window.confirm("Xác nhận xóa văn bản này khỏi kho dữ liệu chung?")) return;
    setStatus(AppStatus.SYNCING);
    const success = await dbService.deleteDocument(id);
    if (success) await refreshData();
    setStatus(AppStatus.IDLE);
  }, [isAdmin, config]);

  const handleSendMessage = async (text: string) => {
    if (!config.apiKey) {
      alert("Hệ thống chưa được cấu hình AI.");
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
        errorMsg = "⚠️ Hệ thống đang bận do quá nhiều yêu cầu. Vui lòng thử lại sau 30 giây.";
      } else if (error.message === "KEY_MISSING_OR_INVALID") {
        errorMsg = "❌ Cấu hình AI không chính xác. Vui lòng kiểm tra lại cài đặt.";
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
               <i className={`fa-solid fa-circle text-[6px] ${status === AppStatus.SYNCING ? 'animate-pulse text-blue-500' : 'text-emerald-500'}`}></i> 
               {status === AppStatus.SYNCING ? "ĐANG ĐỒNG BỘ..." : "TRỰC TUYẾN - NHÓM CHÂU THÀNH"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
            title="Cài đặt"
          >
            <i className="fa-solid fa-gear text-sm"></i>
          </button>
          <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>
          <div className="text-right hidden sm:block">
             <p className="text-[10px] font-bold text-slate-400 flex items-center justify-end gap-1 uppercase">
               {isAdmin && <i className="fa-solid fa-shield-halved text-emerald-500"></i>}
               {isAdmin ? "Quản trị viên" : "Nhân viên chuyên môn"}
             </p>
             <p className="text-[11px] font-black text-slate-700">{isAdmin ? "Đ.T.Tùng" : "Đang sử dụng"}</p>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        <div className="w-full md:w-80 lg:w-96 shrink-0 h-[180px] md:h-full">
          <KnowledgeBase 
            documents={documents} 
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
            isAdmin={isAdmin}
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
            {config.supabaseUrl ? 'Cloud Server Online' : 'Server Offline'}
          </span>
          <span>{documents.length} văn bản nghiệp vụ</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="uppercase">Phiên bản Desktop 2.5</span>
          <span className="text-blue-600">BHXH CHÂU THÀNH</span>
        </div>
      </footer>

      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                 <i className="fa-solid fa-server text-blue-600"></i>
                 Cấu hình hệ thống
               </h3>
               <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-red-500 transition-colors"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Mã Xác Thực Quản Trị</label>
                <input 
                  type="password" 
                  className={`w-full p-3 border rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all ${isAdmin ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
                  value={config.adminPass}
                  onChange={(e) => setConfig({...config, adminPass: e.target.value})}
                  placeholder="Nhập mã xác thực để mở khóa tính năng nâng cao"
                />
                {isAdmin && <p className="text-[9px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1"><i className="fa-solid fa-check-circle"></i> Đã xác thực quyền Quản trị viên</p>}
              </div>
              <div className="h-[1px] bg-slate-100 my-2"></div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">1. AI Gateway Key</label>
                <input 
                  type="password" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={config.apiKey}
                  onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                  placeholder="Mã dịch vụ AI"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">2. Database Endpoint</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  value={config.supabaseUrl}
                  onChange={(e) => setConfig({...config, supabaseUrl: e.target.value})}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">3. Access Key</label>
                <input 
                  type="password" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  value={config.supabaseKey}
                  onChange={(e) => setConfig({...config, supabaseKey: e.target.value})}
                  placeholder="Mã truy cập dữ liệu"
                />
              </div>

              {testResult && (
                <div className={`p-3 rounded-xl text-[10px] font-bold animate-in slide-in-from-top-2 duration-300 ${testResult.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                   <i className={`fa-solid ${testResult.success ? 'fa-circle-check' : 'fa-triangle-exclamation'} mr-1`}></i>
                   {testResult.message}
                </div>
              )}
              
              <div className="flex gap-2 mt-4">
                <button 
                  onClick={handleTestConnection}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-[10px] font-black hover:bg-slate-200 transition-all active:scale-95 uppercase tracking-tight"
                >
                  Kiểm tra máy chủ
                </button>
                <button 
                  onClick={saveConfig}
                  className="flex-[2] py-3 bg-blue-700 text-white rounded-xl text-[10px] font-black shadow-lg shadow-blue-100 hover:bg-blue-800 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-tight"
                >
                  <i className="fa-solid fa-save"></i>
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
