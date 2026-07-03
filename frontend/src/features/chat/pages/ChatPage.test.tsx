import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChatPage } from './ChatPage';

vi.mock('../components/ChatWindow', () => ({
  ChatWindow: ({ roomId }: { roomId: string }) => <div>chat-window-{roomId}</div>,
}));

describe('ChatPage', () => {
  it('mostra o titulo e a janela de chat para a sala da rota', () => {
    render(
      <MemoryRouter initialEntries={['/chat/r1']}>
        <Routes>
          <Route path="/chat/:roomId" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Conversa' })).toBeInTheDocument();
    expect(screen.getByText('chat-window-r1')).toBeInTheDocument();
  });

  it('mostra mensagem para selecionar conversa quando nao ha roomId', () => {
    render(
      <MemoryRouter initialEntries={['/chat']}>
        <Routes>
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Selecione uma conversa.')).toBeInTheDocument();
  });
});
