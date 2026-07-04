import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUpload } from './ImageUpload';
import { uploadImage } from '../../features/uploads/api';
import { useToastStore } from './Toast';

vi.mock('../../features/uploads/api', () => ({ uploadImage: vi.fn() }));

describe('ImageUpload', () => {
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    useToastStore.setState({ toasts: [] });

    let counter = 0;
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => `blob:http://localhost/${++counter}`,
      revokeObjectURL,
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renderiza o rotulo', () => {
    render(<ImageUpload onUploaded={vi.fn()} label="Foto da demanda" />);
    expect(screen.getByLabelText('Foto da demanda')).toBeInTheDocument();
  });

  it('envia o arquivo selecionado e chama onUploaded com o resultado', async () => {
    vi.mocked(uploadImage).mockResolvedValue({ url: '/uploads/abc.jpg', filename: 'abc.jpg', size: 1024 });
    const onUploaded = vi.fn();
    const user = userEvent.setup();
    render(<ImageUpload onUploaded={onUploaded} />);

    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Enviar imagem');
    await user.upload(input, file);

    await waitFor(() =>
      expect(onUploaded).toHaveBeenCalledWith({ url: '/uploads/abc.jpg', filename: 'abc.jpg', size: 1024 }),
    );
  });

  it('mostra skeleton enquanto o upload esta em andamento', async () => {
    let resolveUpload: (value: { url: string; filename: string; size: number }) => void = () => {};
    vi.mocked(uploadImage).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpload = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<ImageUpload onUploaded={vi.fn()} />);

    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Enviar imagem');
    await user.upload(input, file);

    expect(screen.getByRole('status', { name: 'Enviando imagem' })).toBeInTheDocument();

    resolveUpload({ url: '/uploads/abc.jpg', filename: 'abc.jpg', size: 1024 });
    await waitFor(() =>
      expect(screen.queryByRole('status', { name: 'Enviando imagem' })).not.toBeInTheDocument(),
    );
  });

  it('mostra toast de erro quando o upload falha', async () => {
    vi.mocked(uploadImage).mockRejectedValue(new Error('falhou'));
    const user = userEvent.setup();
    render(<ImageUpload onUploaded={vi.fn()} />);

    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Enviar imagem');
    await user.upload(input, file);

    await waitFor(() => expect(useToastStore.getState().toasts).toHaveLength(1));
    expect(useToastStore.getState().toasts[0]).toMatchObject({ tone: 'error' });
  });

  it('revoga a URL do preview anterior ao selecionar um novo arquivo', async () => {
    vi.mocked(uploadImage).mockResolvedValue({ url: '/uploads/abc.jpg', filename: 'abc.jpg', size: 1024 });
    const user = userEvent.setup();
    render(<ImageUpload onUploaded={vi.fn()} />);

    const input = screen.getByLabelText('Enviar imagem');
    const firstFile = new File(['conteudo-1'], 'foto1.jpg', { type: 'image/jpeg' });
    await user.upload(input, firstFile);
    await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(1));

    expect(revokeObjectURL).not.toHaveBeenCalled();

    const secondFile = new File(['conteudo-2'], 'foto2.jpg', { type: 'image/jpeg' });
    await user.upload(input, secondFile);
    await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(2));

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/1');
  });

  it('processa arquivo solto via drag-and-drop', async () => {
    vi.mocked(uploadImage).mockResolvedValue({ url: '/uploads/drop.jpg', filename: 'drop.jpg', size: 2048 });
    const onUploaded = vi.fn();
    render(<ImageUpload onUploaded={onUploaded} />);

    const label = screen.getByText('Enviar imagem').closest('label') as HTMLLabelElement;
    const file = new File(['conteudo'], 'drop.jpg', { type: 'image/jpeg' });

    fireEvent.drop(label, { dataTransfer: { files: [file] } });

    await waitFor(() =>
      expect(onUploaded).toHaveBeenCalledWith({ url: '/uploads/drop.jpg', filename: 'drop.jpg', size: 2048 }),
    );
  });
});
