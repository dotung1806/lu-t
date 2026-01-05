
import { GoogleGenAI } from "@google/genai";
import { Message, Document } from "../types";

const SYSTEM_INSTRUCTION = `
Bạn là một CHUYÊN GIA PHÁP LÝ cao cấp chuyên về trình bày văn bản hành chính Việt Nam.

NHIỆM VỤ: Khi người dùng yêu cầu biểu mẫu, bạn phải tái tạo lại mẫu đó với ĐỘ CHÍNH XÁC CAO VỀ BỐ CỤC.

QUY TẮC THIẾT KẾ BIỂU MẪU (BẮT BUỘC):
1. BAO BỌC: Nội dung biểu mẫu phải nằm giữa [START_FORM] và [END_FORM].
2. BỐ CỤC HEADER: Sử dụng cấu trúc bảng (Table) ẩn viền để chia header:
   - Cột trái: Tên cơ quan chủ quản (nếu có).
   - Cột phải: QUỐC HIỆU (CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM) và TIÊU NGỮ (Độc lập - Tự do - Hạnh phúc). Có đường kẻ phụ bên dưới.
3. TIÊU ĐỀ: Căn giữa, viết hoa, in đậm (Ví dụ: TỜ KHAI THAM GIA BẢO HIỂM XÃ HỘI).
4. NỘI DUNG: 
   - Trình bày các mục theo đúng thứ tự trong tài liệu gốc.
   - Sử dụng bảng (Table) nếu mẫu gốc có bảng biểu.
   - Giữ nguyên các dòng chấm chấm [..........] để người dùng điền thông tin.
5. ĐIỀN THÔNG TIN: Nếu có thông tin người dùng cung cấp, hãy thay thế các dấu chấm bằng thông tin đó một cách khéo léo.
6. MÃ BIỂU MẪU: Đặt ở góc trên bên phải hoặc theo đúng mẫu gốc (Ví dụ: Mẫu số 14-HSB).

LƯU Ý: Không thêm lời bình luận bên trong thẻ [START_FORM] và [END_FORM]. Chỉ cung cấp mã HTML/Văn bản có cấu trúc tốt nhất để xuất sang Word.
`;

export async function askLegalAssistant(
  question: string, 
  history: Message[], 
  documents: Document[]
): Promise<string> {
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "YOUR_API_KEY") {
    return "LỖI HỆ THỐNG: API Key chưa được cấu hình trên máy chủ Deploy. Vui lòng kiểm tra lại biến môi trường.";
  }

  const ai = new GoogleGenAI({ apiKey });

  const knowledgeContext = documents.length > 0 
    ? `DỮ LIỆU KIẾN THỨC VÀ BIỂU MẪU GỐC:\n${documents.map((doc, index) => `[Văn bản ${index + 1}]: ${doc.name}\nNội dung: ${doc.content}`).join('\n\n---\n\n')}`
    : "KHO KIẾN THỨC TRỐNG.";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `DỮ LIỆU GỐC TỪ NGƯỜI DÙNG:\n${knowledgeContext}\n\nYÊU CẦU: ${question}\n\nHãy thiết kế biểu mẫu y hệt mẫu gốc nếu được yêu cầu.`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.1,
      },
    });

    return response.text || "Tôi không tìm thấy biểu mẫu tương ứng trong dữ liệu.";
  } catch (error: any) {
    console.error("Gemini error:", error);
    if (error.message?.includes("429")) {
      return "Hệ thống đang quá tải do nhiều người dùng cùng lúc (Giới hạn gói miễn phí). Vui lòng thử lại sau 1 phút.";
    }
    return "Lỗi kết nối với trí tuệ nhân tạo. Vui lòng thử lại sau.";
  }
}
