import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http } from '../../lib/http';
import { uploadImage } from './api';

vi.mock('../../lib/http', () => ({ http: { post: vi.fn() } }));

describe('uploadImage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('envia o arquivo como multipart/form-data e retorna o resultado', async () => {
    vi.mocked(http.post).mockResolvedValue({
      data: { url: '/uploads/abc.jpg', filename: 'abc.jpg', size: 1024 },
    } as never);

    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
    const result = await uploadImage(file);

    expect(result).toEqual({ url: '/uploads/abc.jpg', filename: 'abc.jpg', size: 1024 });
    expect(http.post).toHaveBeenCalledWith('/uploads/images', expect.any(FormData));
  });

  it('propaga o erro quando a requisicao falha', async () => {
    vi.mocked(http.post).mockRejectedValue(new Error('network error'));

    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });

    await expect(uploadImage(file)).rejects.toThrow('network error');
  });
});
