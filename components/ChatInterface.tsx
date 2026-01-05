
import React, { useState, useEffect, useRef } from 'react';
import { Message, AppStatus } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  status: AppStatus;
  onSendMessage: (text: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, status, onSendMessage }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status === AppStatus.LOADING) return;
    onSendMessage(input);
    setInput('');
  };

  const exportFormOnly = (fullText: string) => {
    const formMatch = fullText.match(/\[START_FORM\]([\s\S]*?)\[END_FORM\]/);
    if (!formMatch || !formMatch[1]) {
      alert("Không tìm thấy biểu mẫu để xuất.");
      return;
    }

    const formContent = formMatch[1].trim();

    // Word Document Template with standard legal formatting for Vietnam
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'>
    <style>
      @page { size: A4; margin: 2cm 2cm 2cm 3cm; }
      body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.3; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      td { vertical-align: top; padding: 2px; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .bold { font-weight: bold; }
      .uppercase { text-transform: uppercase; }
      .italic { font-style: italic; }
      .header-table td { border: none !important; }
      .content-table td, .content-table th { border: 1px solid black; padding: 5px; }
    </style>
    </head><body>`;
    const footer = "</body></html>";
    
    // Convert markdown-like styling to HTML for Word
    let htmlContent = formContent
      .replace(/\n/g, '<br/>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\[ \]/g, '<span style="font-family: DejaVu Sans, sans-serif;">☐</span>')
      .replace(/\[x\]/g, '<span style="font-family: DejaVu Sans, sans-serif;">☑</span>');

    const sourceHTML = header + htmlContent + footer;
    const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bieu_mau_BHXH_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderMessageContent = (msg: Message) => {
    const formRegex = /\[START_FORM\]([\s\S]*?)\[END_FORM\]/g;
    const parts = msg.text.split(formRegex);
    
    if (parts.length === 1) return <div className="whitespace-pre-wrap">{msg.text}</div>;

    return (
      <div className="space-y-4">
        {parts.map((part, index) => {
          if (index % 2 === 1) {
            return (
              <div key={index} className="my-6 border border-slate-300 rounded-lg bg-white overflow-hidden shadow-xl max-w-full">
                <div className="bg-slate-800 text-white px-4 py-2.5 flex justify-between items-center">
                  <span className="text-xs font-bold flex items-center gap-2">
                    <i className="fa-solid fa-file-word text-blue-400"></i>
                    BẢN THIẾT KẾ BIỂU MẪU CHUẨN
                  </span>
                  <button 
                    onClick={() => exportFormOnly(msg.text)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95"
                  >
                    <i className="fa-solid fa-download"></i> TẢI FILE WORD (.DOC)
                  </button>
                </div>
                <div className="p-8 text-[13px] font-serif leading-normal text-black bg-white overflow-x-auto custom-scrollbar shadow-inner" style={{ minHeight: '400px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                  <div className="whitespace-pre-wrap" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                    {part.trim()}
                  </div>
                </div>
                <div className="bg-slate-50 px-4 py-2 text-[10px] text-slate-400 border-t border-slate-200 italic">
                  * Biểu mẫu được tái tạo dựa trên cấu trúc văn bản hành chính gốc.
                </div>
              </div>
            );
          }
          return part.trim() ? <div key={index} className="whitespace-pre-wrap">{part}</div> : null;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-800 to-indigo-900 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20">
            <i className="fa-solid fa-file-pen text-xl"></i>
          </div>
          <div>
            <h1 className="font-bold text-sm md:text-base">Trình Soạn Thảo Biểu Mẫu Pháp Lý</h1>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${status === AppStatus.LOADING ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`}></span>
              <span className="text-[9px] uppercase font-bold tracking-widest opacity-80">
                {status === AppStatus.LOADING ? 'Đang tái tạo bố cục...' : 'Sẵn sàng thiết kế'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-slate-50/30">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto space-y-5 text-slate-400">
            <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-blue-100 flex items-center justify-center text-5xl border border-slate-100 transform -rotate-6">
              📄
            </div>
            <div>
              <p className="font-black text-slate-800 text-xl">Bạn cần biểu mẫu nào?</p>
              <p className="text-sm mt-2 leading-relaxed font-medium">
                Hãy yêu cầu tôi trích xuất bất kỳ mẫu đơn nào từ kho tài liệu. Tôi sẽ thiết kế lại <b>đúng bố cục gốc</b> để bạn tải về và in ấn ngay.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[100%] md:max-w-[90%] rounded-2xl p-4 md:p-5 shadow-sm relative group ${
              msg.role === 'user' 
                ? 'bg-blue-700 text-white rounded-br-none shadow-blue-100' 
                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <i className={`fa-solid ${msg.role === 'user' ? 'fa-circle-user' : 'fa-user-tie'} text-xs opacity-70`}></i>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  {msg.role === 'user' ? 'Yêu cầu soạn thảo' : 'Chuyên gia thiết kế'}
                </span>
              </div>
              
              <div className="text-sm md:text-[15px] leading-relaxed">
                {renderMessageContent(msg)}
              </div>
              
              <div className={`text-[9px] mt-4 opacity-40 flex font-bold ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {status === AppStatus.LOADING && (
          <div className="flex justify-start">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-5 shadow-sm flex items-center gap-4">
              <div className="relative w-5 h-5">
                <div className="absolute w-full h-full border-2 border-blue-200 rounded-full"></div>
                <div className="absolute w-full h-full border-2 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <span className="text-xs font-bold text-slate-500 animate-pulse">ĐANG TRÍCH XUẤT VÀ TÁI TẠO BỐ CỤC...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-3 max-w-5xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              rows={1}
              placeholder="Nhập tên biểu mẫu cần soạn (VD: Soạn mẫu TK1-TS cho tôi...)"
              className="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-2xl text-[15px] text-slate-900 focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none resize-none transition-all shadow-inner"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <div className="absolute right-4 bottom-4 text-[10px] text-slate-400 font-bold hidden md:block">
               ENTER ĐỂ GỬI
            </div>
          </div>
          <button
            type="submit"
            disabled={!input.trim() || status === AppStatus.LOADING}
            className="w-14 h-14 flex items-center justify-center bg-blue-700 hover:bg-blue-800 disabled:bg-slate-200 text-white rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-90 shrink-0"
          >
            <i className="fa-solid fa-wand-magic-sparkles text-xl"></i>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
