
import { GoogleGenAI } from "@google/genai";
import { Message, Document } from "../types";

const SYSTEM_INSTRUCTION = `
Bạn là một CHUYÊN GIA PHÁP LÝ cao cấp chuyên về trình bày văn bản hành chính Việt Nam.
NHIỆM VỤ: Khi người dùng yêu cầu biểu mẫu, bạn phải tái tạo lại mẫu đó với ĐỘ CHÍNH XÁC CAO VỀ BỐ CỤC.

QUY TẮC THIẾT KẾ BIỂU MẪU:
1. BAO BỌC: Nội dung biểu mẫu phải nằm giữa [START_FORM] và [END_FORM].
2. BỐ CỤC HEADER: Sử dụng bảng ẩn viền cho Quốc hiệu, Tiêu ngữ và Tên cơ quan.
3. NỘI DUNG: Trình bày chuyên nghiệp, sử dụng font Times New Roman (trong file Word), giữ các dòng chấm chấm.
`;

export async function askLegalAssistant(
  question: string, 
  history: Message[], 
  documents: Document[]
): Promise<string> {
  // Kiểm tra API Key từ môi trường
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey.trim() === "") {
    return "LỖI HỆ THỐNG: API Key chưa được nhận diện.\n\nLƯU Ý: Nếu bạn vừa mới thêm Key trên Vercel, hãy vào tab 'Deployments' và nhấn 'Redeploy' để hệ thống cập nhật cấu hình mới.";
  }

  const ai = new GoogleGenAI({ apiKey });

  const knowledgeContext = documents.length > 0 
    ? `DỮ LIỆU KIẾN THỨC:\n${documents.map((doc, index) => `[Văn bản ${index + 1}]: ${doc.name}\nNội dung: ${doc.content}`).join('\n\n')}`
    : "KHO KIẾN THỨC TRỐNG.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `DỮ LIỆU:\n${knowledgeContext}\n\nYÊU CẦU: ${question}`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      },
    });

    return response.text || "AI không thể tạo câu trả lời.";
  } catch (error: any) {
    console.error("Gemini error:", error);
    return `Lỗi kết nối AI: ${error.message || "Không xác định"}. Hãy đảm bảo API Key của bạn còn hạn mức sử dụng.`;
  }
}
