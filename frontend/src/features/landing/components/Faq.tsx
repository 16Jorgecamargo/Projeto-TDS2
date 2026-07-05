import { useState, type JSX } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { duration } from '../../../lib/motion';
import { cn } from '../../../lib/utils';

const FAQ_ITEMS = [
  {
    question: 'Como funciona o pagamento?',
    answer: 'O pagamento fica retido na plataforma até a confirmação do serviço, garantindo segurança para as duas partes.',
  },
  {
    question: 'Os profissionais são verificados?',
    answer: 'Sim, cada profissional passa por verificação de identidade antes de poder oferecer serviços.',
  },
  {
    question: 'Posso cancelar um contrato?',
    answer: 'Sim, cancelamentos seguem a política de reembolso descrita nos termos de cada contrato.',
  },
  {
    question: 'É grátis para clientes?',
    answer: 'Sim, buscar e contratar profissionais é gratuito para quem publica demandas.',
  },
  {
    question: 'Como avalio um profissional?',
    answer: 'Após a conclusão do contrato, você pode deixar uma avaliação com nota e comentário.',
  },
];

export function Faq(): JSX.Element {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h2 className="mb-6 text-h2 font-bold text-ink">Perguntas frequentes</h2>
      <div className="flex flex-col gap-3">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          const answerId = `faq-answer-${index}`;
          return (
            <Card key={item.question} variant="flat" noPadding className="bg-surface">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="text-sm font-semibold text-ink">{item.question}</span>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className={cn('text-muted transition-transform', isOpen && 'rotate-180')}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen ? (
                  <motion.div
                    id={answerId}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: duration.fast }}
                    className="overflow-hidden px-4"
                  >
                    <p className="pb-4 text-body-sm text-muted">{item.answer}</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
