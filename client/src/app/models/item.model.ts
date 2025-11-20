export interface Item {
  id: string;
  name: string;
  type: 'folder' | 'file';
  parentId: string | null;
  path: string;
  x: number;
  y: number;
  size?: number;
  mimeType?: string;
  content?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiResponse<T> {
  status: string;
  data: T;
  message?: string;
}
