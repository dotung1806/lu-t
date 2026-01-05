
import { Document } from "../types";

const getHeaders = () => {
  const config = (window as any)._APP_CONFIG || {};
  const key = config.supabaseKey || localStorage.getItem('SB_KEY') || "";
  return {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": `Bearer ${key}`
  };
};

const getUrl = () => {
  const config = (window as any)._APP_CONFIG || {};
  return config.supabaseUrl || localStorage.getItem('SB_URL') || "";
};

export const dbService = {
  async fetchGlobalDocuments(): Promise<Document[]> {
    const url = getUrl();
    if (!url) return [];
    
    try {
      const response = await fetch(`${url}/rest/v1/documents?select=*&order=uploadDate.desc`, {
        method: "GET",
        headers: getHeaders()
      });
      
      if (!response.ok) {
        const err = await response.json();
        console.error("Supabase Fetch Error:", err);
        return [];
      }
      
      return await response.json();
    } catch (error) {
      console.error("Database connection failed:", error);
      return [];
    }
  },

  async saveDocument(doc: Document): Promise<{success: boolean, message?: string}> {
    const url = getUrl();
    if (!url) return { success: false, message: "Thiếu thông tin kết nối máy chủ." };
    
    try {
      // Dữ liệu gửi lên khớp chính xác với lệnh SQL: isGlobal, author
      const payload = {
        id: doc.id,
        name: doc.name,
        type: doc.type,
        content: doc.content,
        uploadDate: new Date().toISOString(),
        isGlobal: true, // Khớp với cột "isGlobal" trong SQL
        author: doc.author || "Đ.T.Tùng" // Khớp với cột "author" trong SQL
      };

      const response = await fetch(`${url}/rest/v1/documents`, {
        method: "POST",
        headers: {
            ...getHeaders(),
            "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        // Trả về lỗi chi tiết từ Supabase
        return { success: false, message: err.message || JSON.stringify(err) };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  async deleteDocument(id: string): Promise<boolean> {
    const url = getUrl();
    if (!url) return false;
    try {
      const response = await fetch(`${url}/rest/v1/documents?id=eq.${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
};
