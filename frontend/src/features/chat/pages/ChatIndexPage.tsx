import type { JSX } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import { BackLink } from '../../../components/ui/BackLink';

export function ChatIndexPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-app flex-col gap-4 p-6">
      <BackLink />
      <EmptyState
        title="Nenhuma conversa selecionada"
        description="Abra o chat a partir de um contrato ou de uma conversa iniciada por um profissional/cliente."
      />
    </div>
  );
}

export default ChatIndexPage;
