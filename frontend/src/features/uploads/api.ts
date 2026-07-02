import { http } from '../../lib/http';

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await http.post<UploadResult>('/uploads/images', formData);
  return data;
}
