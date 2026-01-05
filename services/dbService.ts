
import { Document } from "../types";

const getHeaders = () => {
  const config = (window as any)._APP_CONFIG || {};
  const key = config.supabaseKey || process.env.SUPABASE_ANON_KEY || "";
  return {
    "Content-Type": "application/json",
    "apikey": key,
    "Authorization": `Bearer ${key}`
  };
};

const getUrl = () => {
  const config = (window as any)._APP_CONFIG || {};
  return config.supabaseUrl || process.env.SUPABASE_URL || "";
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
      
      if (response.status === 404) {
        console.error("LỖI: Bảng 'documents' chưa được tạo trong Supabase. Vui lòng chạy SQL script.");
        return [];
      }
      
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
    if (!url) return { success: false, message: "Thiếu URL Supabase" };
    
    try {
      const response = await fetch(`${url}/rest/v1/documents`, {
        method: "POST",
        headers: {
            ...getHeaders(),
            "Prefer": "return=minimal"
        },
        body: JSON.stringify({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          content: doc.content,
          uploadDate: new Date().toISOString(),
          isGlobal: true,
          author: doc.author || "Thành viên"
        })
      });

      if (response.status === 404) {
        return { success: false, message: "Bảng 'documents' không tồn tại. Bạn đã chạy SQL trong Supabase chưa?" };
      }

      if (!response.ok) {
        const err = await response.json();
        return { success: false, message: err.message || "Lỗi lưu dữ liệu" };
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
