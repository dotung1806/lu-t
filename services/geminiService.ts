
import { GoogleGenAI } from "@google/genai";
import { Message, Document } from "../types";

const SYSTEM_INSTRUCTION = `
Bạn là một CHUYÊN GIA PHÁP LÝ cao cấp chuyên về trình bày văn bản hành chính Việt Nam.
NHIỆM VỤ: Khi người dùng yêu cầu biểu mẫu, bạn phải tái tạo lại mẫu đó với ĐỘ CHÍNH XÁC CAO VỀ BỐ CỤC.

QUY TẮC THIẾT KẾ BIỂU MẪU:
1. BAO BỌC: Nội dung biểu mẫu phải nằm giữa [START_FORM] và [END_FORM].
2. BỐ CỤC HEADER: Sử dụng bảng ẩn viền cho Quốc hiệu, Tiêu ngữ và Tên cơ quan.
3. NỘI DUNG: Trình bày chuyên nghiệp, giữ các dòng chấm chấm, sử dụng font Times New Roman khi xuất file.
`;

export async function askLegalAssistant(
  question: string, 
  history: Message[], 
  documents: Document[]
): Promise<string> {
  // Fix: Exclusively use process.env.API_KEY to initialize the GoogleGenAI client.
  // We initialize the client inside the function call to ensure the latest API key from the environment is used.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const knowledgeContext = documents.length > 0 
    ? `DỮ LIỆU KIẾN THỨC TẠI CHỖ:\n${documents.map((doc, index) => `[Văn bản ${index + 1}]: ${doc.name}\nNội dung: ${doc.content}`).join('\n\n')}`
    : "KHO KIẾN THỨC TRỐNG.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `DỮ LIỆU KIẾN THỨC CỦA TÔI:\n${knowledgeContext}\n\nYÊU CẦU NGƯỜI DÙNG: ${question}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1, // High precision for legal text
      },
    });

    // Fix: text is a property of GenerateContentResponse, do not call it as a function.
    return response.text || "AI không thể trả lời. Vui lòng thử lại.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    if (error.message?.includes("API key not valid")) {
      throw new Error("API Key của bạn không hợp lệ hoặc đã hết hạn.");
    }
    
    throw error;
  }
}
