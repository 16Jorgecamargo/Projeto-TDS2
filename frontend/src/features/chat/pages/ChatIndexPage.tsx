import type { JSX } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';

export function ChatIndexPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 p-6">
      <EmptyState
        title="Nenhuma conversa selecionada"
        description="Abra o chat a partir de um contrato ou de uma conversa iniciada por um profissional/cliente."
      />
    </div>
  );
}

export default ChatIndexPage;
