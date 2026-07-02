import type { JSX } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';

export function ChatIndexPage(): JSX.Element {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <EmptyState
        title="Nenhuma conversa selecionada"
        description="Abra o chat a partir de um contrato ou de uma conversa iniciada por um profissional/cliente."
      />
    </div>
  );
}

export default ChatIndexPage;
