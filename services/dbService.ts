
import { Document } from "../types";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

const headers = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
};

export const dbService = {
  async fetchGlobalDocuments(): Promise<Document[]> {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("Thiếu cấu hình Supabase. Vui lòng Redeploy.");
      return [];
    }
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?select=*&isGlobal=eq.true`, {
        method: "GET",
        headers
      });
      
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error("DB Connection Error:", error);
      return [];
    }
  },

  async saveDocument(doc: Document): Promise<boolean> {
    if (!SUPABASE_URL) return false;
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
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  async deleteDocument(id: string): Promise<boolean> {
    if (!SUPABASE_URL) return false;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/documents?id=eq.${id}`, {
        method: "DELETE",
        headers
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
};
