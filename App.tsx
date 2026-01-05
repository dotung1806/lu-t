
import React, { useState, useCallback, useEffect } from 'react';
import KnowledgeBase from './components/KnowledgeBase';
import ChatInterface from './components/ChatInterface';
import { Document, Message, AppStatus } from './types';
import { askLegalAssistant } from './services/geminiService';

const STORAGE_KEYS = {
  DOCUMENTS: 'bhxh_legal_docs',
  MESSAGES: 'bhxh_chat_history'
};

const App: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);

    if (savedDocs) {
      try {
        setDocuments(JSON.parse(savedDocs));
      } catch (e) {
        console.error("Failed to load documents from storage", e);
      }
    }

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages).map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(parsedMessages);
      } catch (e) {
        console.error("Failed to load messages from storage", e);
      }
    }
  }, []);

  // Save documents to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));
  }, [documents]);

  // Save messages to localStorage when they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }, [messages]);

  const handleAddDocument = useCallback((doc: Document) => {
    setDocuments(prev => {
      // Logic lọc trùng lặp: Kiểm tra xem nội dung văn bản đã tồn tại trong kho chưa
      const isDuplicate = prev.some(d => d.content.trim() === doc.content.trim());
      if (isDuplicate) {
        console.warn(`Văn bản "${doc.name}" có nội dung trùng lặp với dữ liệu đã tồn tại. Hệ thống tự động bỏ qua.`);
        return prev;
      }
      return [...prev, doc];
    });
  }, []);

  const handleRemoveDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  }, []);

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
      const responseText = await askLegalAssistant(text, newMessages, documents);
      
      const assistantMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        text: responseText,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setStatus(AppStatus.IDLE);
    } catch (error) {
      console.error("Error in conversation:", error);
      setStatus(AppStatus.ERROR);
      
      const errorMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        role: 'assistant',
        text: "Xin lỗi, đã có lỗi kỹ thuật xảy ra khi kết nối với máy chủ AI. Vui lòng thử lại sau.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const clearHistory = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử trò chuyện?")) {
      setMessages([]);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
             <i className="fa-solid fa-scale-balanced text-lg"></i>
          </div>
          <div>
            <span className="text-sm md:text-base font-black bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent uppercase tracking-tight">
              BHXH Châu Thành An Giang - Đ.T.Tùng
            </span>
            <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Chuyên gia số BHXH 4.0</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={clearHistory}
            className="text-sm font-medium text-slate-600 hover:text-red-600 transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-trash-can"></i> Xóa lịch sử
          </button>
          <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Hướng dẫn</a>
          <button className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-all shadow-sm">
             TRỢ GIÚP
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row p-4 md:p-6 gap-6 overflow-hidden">
        {/* Knowledge Base Section */}
        <div className="w-full md:w-1/3 lg:w-1/4 h-[300px] md:h-full shrink-0">
          <KnowledgeBase 
            documents={documents} 
            onAddDocument={handleAddDocument}
            onRemoveDocument={handleRemoveDocument}
          />
        </div>

        {/* Chat Section */}
        <div className="flex-1 h-full">
          <ChatInterface 
            messages={messages}
            status={status}
            onSendMessage={handleSendMessage}
          />
        </div>
      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2 text-center text-[10px] text-slate-400 flex justify-between items-center">
        <span>Bản quyền &copy; 2024 BHXH cơ sở Châu Thành tỉnh An Giang - Đ.T.Tùng.</span>
        <span className="flex items-center gap-1">
          <i className="fa-solid fa-shield-halved text-emerald-500"></i>
          Dữ liệu được bảo mật cục bộ
        </span>
      </footer>
    </div>
  );
};

export default App;
