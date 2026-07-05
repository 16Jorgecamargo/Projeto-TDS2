import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Mail, MailCheck } from 'lucide-react';
import { forgotPasswordSchema, type ForgotPasswordForm } from '../schemas';
import { useForgotPassword } from '../queries';
import { AuthField } from '../components/AuthField';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { fadeVariants } from '../../../lib/motion';

export default function ForgotPasswordPage(): JSX.Element {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit((values) => forgot.mutate(values.email));

  return (
    <AuthLayout title="Esqueceu sua senha?" description="Enviamos um link de redefinição para seu e-mail.">
      <AnimatePresence mode="wait">
        {forgot.isSuccess ? (
          <motion.div key="success" initial="hidden" animate="visible" exit="hidden" variants={fadeVariants}>
            <EmptyState
              icon={<MailCheck size={32} />}
              title="Verifique seu e-mail"
              description="Se o e-mail existir em nossa base, enviamos as instruções de redefinição."
            />
            <Link to="/login" className="mt-6 block text-center text-sm text-primary underline">
              Voltar ao login
            </Link>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={fadeVariants}
            onSubmit={onSubmit}
            noValidate
            className="flex flex-col gap-4"
          >
            <h2 className="text-h4 font-semibold text-ink">Recuperar senha</h2>
            <AuthField
              label="E-mail"
              type="email"
              icon={<Mail size={16} />}
              {...register('email')}
              error={errors.email?.message}
            />
            <Button type="submit" disabled={forgot.isPending} className="w-full">
              {forgot.isPending ? 'Enviando...' : 'Enviar'}
            </Button>
            <Link to="/login" className="text-center text-sm text-primary underline">
              Voltar ao login
            </Link>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
