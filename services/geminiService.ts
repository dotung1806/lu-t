
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
  // Khởi tạo instance ngay tại đây để luôn lấy giá trị API_KEY mới nhất từ process.env
  // Lưu ý: process.env.API_KEY được hệ thống tự động tiêm vào sau khi người dùng chọn Key qua dialog.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const knowledgeContext = documents.length > 0 
    ? `DỮ LIỆU KIẾN THỨC TẠI CHỖ:\n${documents.map((doc, index) => `[Văn bản ${index + 1}]: ${doc.name}\nNội dung: ${doc.content}`).join('\n\n')}`
    : "KHO KIẾN THỨC TRỐNG.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `DỮ LIỆU KIẾN THỨC:\n${knowledgeContext}\n\nYÊU CẦU: ${question}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      },
    });

    // Sử dụng .text (property) thay vì .text() (method) theo SDK mới
    return response.text || "AI không trả về nội dung.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Nếu gặp lỗi do Key chưa được cấp quyền hoặc không tìm thấy dự án
    if (error.message?.includes("Requested entity was not found") || error.message?.includes("API key not valid")) {
       throw new Error("KEY_MISSING_OR_INVALID");
    }
    
    throw error;
  }
}
