
import React, { useState, useCallback, useEffect } from 'react';
import KnowledgeBase from './components/KnowledgeBase';
import ChatInterface from './components/ChatInterface';
import { Document, Message, AppStatus } from './types';
import { askLegalAssistant } from './services/geminiService';
import { dbService } from './services/dbService';

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

  // Kiểm tra trạng thái Key khi khởi động
  useEffect(() => {
    const checkKey = async () => {
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        const selected = await aiStudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else {
        // Fallback kiểm tra biến môi trường nếu không chạy trong iframe aistudio
        const envKey = process.env.API_KEY;
        setHasApiKey(!!envKey && envKey !== "undefined" && envKey !== "");
      }
    };

    const initData = async () => {
      setStatus(AppStatus.SYNCING);
      await checkKey();

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

  // Hàm xử lý mở trình chọn Key
  const handleConnectKey = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      await aiStudio.openSelectKey();
      // Quy tắc: Giả định thành công ngay sau khi mở dialog để tránh Race condition
      setHasApiKey(true);
      // Không cần reload, SDK sẽ tự nhận key mới trong lần gọi tiếp theo
    } else {
      alert("Để sử dụng tính năng này trên web trực tiếp, hãy đảm bảo bạn đã thêm API_KEY vào Environment Variables trên Vercel và nhấn 'Redeploy'.\n\nKhuyên dùng: Mở ứng dụng này từ giao diện Google AI Studio.");
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
      if (success) setGlobalDocuments(prev => [...prev, { ...doc, isGlobal: true }]);
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
      if (success) setGlobalDocuments(prev => prev.filter(d => d.id !== id));
      setStatus(AppStatus.IDLE);
    } else {
      setLocalDocuments(prev => prev.filter(d => d.id !== id));
    }
  }, []);

  const handleSendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      text: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setStatus(AppStatus.LOADING);

    try {
      const responseText = await askLegalAssistant(text, [...messages, userMessage], allDocuments);
      const assistantMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setStatus(AppStatus.IDLE);
    } catch (error: any) {
      console.error("Chat Error:", error);
      
      // Nếu lỗi do Key, reset trạng thái để hiện banner yêu cầu kết nối lại
      if (error.message === "KEY_MISSING_OR_INVALID") {
        setHasApiKey(false);
        setMessages(prev => [...prev, {
          id: 'err-key',
          role: 'assistant',
          text: "LỖI: API Key không hợp lệ hoặc chưa được chọn. Vui lòng nhấn nút 'KẾT NỐI NGAY' ở banner phía trên.",
          timestamp: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: 'err-gen',
          role: 'assistant',
          text: `Lỗi kết nối AI: ${error.message || "Không xác định"}`,
          timestamp: new Date()
        }]);
      }
      setStatus(AppStatus.ERROR);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Banner cảnh báo Key */}
      {!hasApiKey && (
        <div className="bg-amber-500 text-white px-6 py-2 flex justify-between items-center z-50 shadow-md">
          <div className="flex items-center gap-2 text-xs font-bold">
            <i className="fa-solid fa-triangle-exclamation animate-bounce"></i>
            Hệ thống chưa nhận diện được API Key. Bạn cần kết nối để sử dụng AI.
          </div>
          <button 
            onClick={handleConnectKey}
            className="bg-white text-amber-600 px-4 py-1 rounded-full text-[10px] font-black hover:scale-105 transition-all shadow-sm active:bg-slate-100"
          >
            KẾT NỐI NGAY
          </button>
        </div>
      )}

      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
             <i className="fa-solid fa-scale-balanced text-lg"></i>
          </div>
          <div>
            <span className="text-sm md:text-base font-black bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent uppercase tracking-tight">
              BHXH Châu Thành An Giang - Đ.T.Tùng
            </span>
            <div className="flex items-center gap-2">
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Chuyên gia số BHXH 4.0</p>
                <span className={`text-[9px] font-bold ${hasApiKey ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {hasApiKey ? '● Đã sẵn sàng' : '○ Chờ kết nối Key'}
                </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleConnectKey}
            className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all flex items-center gap-2 ${
              hasApiKey ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white shadow-lg'
            }`}
          >
             <i className="fa-solid fa-key"></i> {hasApiKey ? 'ĐỔI API KEY' : 'THIẾT LẬP KEY'}
          </button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col md:flex-row p-4 md:p-6 gap-6 overflow-hidden">
        <div className="w-full md:w-1/3 lg:w-1/4 h-[250px] md:h-full shrink-0">
          <KnowledgeBase 
            documents={allDocuments} 
            onAddDocument={handleAddDocument}
            onRemoveDocument={(id) => {
                const doc = allDocuments.find(d => d.id === id);
                handleRemoveDocument(id, doc?.isGlobal);
            }}
          />
        </div>
        <div className="flex-1 h-full">
          <ChatInterface messages={messages} status={status} onSendMessage={handleSendMessage} />
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 px-6 py-2 text-center text-[10px] text-slate-400 flex justify-between items-center">
        <span>&copy; 2024 BHXH cơ sở Châu Thành - Đ.T.Tùng</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><i className="fa-solid fa-shield-check text-blue-500"></i> AI Protected</span>
          <span className="flex items-center gap-1"><i className="fa-solid fa-server text-slate-400"></i> Vercel Edge</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
