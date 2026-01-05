
import { Document } from "../types";

// Các biến này được lấy từ Environment Variables trên nền tảng Deploy (Vercel/Netlify)
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

// Kiểm tra cấu hình khi ứng dụng chạy
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("CẢNH BÁO: Chưa cấu hình SUPABASE_URL hoặc SUPABASE_ANON_KEY trong biến môi trường.");
}

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
};

export const dbService = {
  /**
   * Lấy toàn bộ danh sách văn bản từ Cloud
   */
  async fetchGlobalDocuments(): Promise<Document[]> {
    if (!SUPABASE_URL) return [];
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?select=*&isGlobal=eq.true`, {
        method: "GET",
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Supabase Fetch Error:", errorData);
        return [];
      }
      return await response.json();
    } catch (error) {
      console.error("Lỗi kết nối Database Cloud:", error);
      return [];
    }
  },

  /**
   * Lưu một văn bản mới lên Cloud
   */
  async saveDocument(doc: Document): Promise<boolean> {
    if (!SUPABASE_URL) {
      alert("Hệ thống chưa kết nối Database Cloud. Không thể lưu.");
      return false;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: doc.id,
          name: doc.name,
          type: doc.type,
          content: doc.content,
          uploadDate: doc.uploadDate,
          isGlobal: true,
          author: "Admin"
        })
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("Save Error Details:", err);
      }

      return response.ok;
    } catch (error) {
      console.error("Lỗi khi lưu lên Cloud:", error);
      return false;
    }
  },

  /**
   * Xóa văn bản khỏi Cloud
   */
  async deleteDocument(id: string): Promise<boolean> {
    if (!SUPABASE_URL) return false;

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${id}`, {
        method: "DELETE",
        headers
      });

      return response.ok;
    } catch (error) {
      console.error("Lỗi khi xóa tài liệu trên Cloud:", error);
      return false;
    }
  }
};
