
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
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      return [];
    }
  },

  async saveDocument(doc: Document): Promise<boolean> {
    const url = getUrl();
    if (!url) return false;
    try {
      const response = await fetch(`${url}/rest/v1/documents`, {
        method: "POST",
        headers: getHeaders(),
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
      return response.ok;
    } catch (error) {
      return false;
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
