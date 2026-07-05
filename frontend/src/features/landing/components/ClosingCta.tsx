import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';

export function ClosingCta(): JSX.Element {
  return (
    <section className="bg-primary px-6 py-16 text-bg">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
        <h2 className="text-h2 font-bold">É profissional? Comece a receber demandas hoje</h2>
        <p className="max-w-xl text-body-md text-bg/80">
          Cadastre-se gratuitamente e conecte-se com clientes procurando pelo seu serviço.
        </p>
        <Button asChild variant="accent">
          <Link to="/register">Cadastrar como profissional</Link>
        </Button>
      </div>
    </section>
  );
}
