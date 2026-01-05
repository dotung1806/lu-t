
export interface Document {
  id: string;
  name: string;
  type: string;
  content: string;
  uploadDate: string;
  isGlobal?: boolean; // Nếu true, văn bản sẽ hiển thị cho mọi người dùng
  author?: string;    // Tên người đăng (ví dụ: Đ.T.Tùng)
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: Date;
}

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR'
}
