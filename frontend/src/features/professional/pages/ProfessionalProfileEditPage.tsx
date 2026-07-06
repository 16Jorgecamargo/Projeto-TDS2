import { useEffect, useState, type JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  useMyProfile,
  useUpsertProfile,
  useCategories,
  useSetCategories,
  usePublicProfile,
} from '../queries';
import { profileFormSchema, type ProfileForm as ProfileFormValues } from '../schemas';
import { ProfileForm, PROFILE_FORM_ID } from '../components/ProfileForm';
import { PortfolioManager } from '../components/PortfolioManager';
import { AvailabilityManager } from '../components/AvailabilityManager';
import { ServiceAreaManager } from '../components/ServiceAreaManager';
import { BackLink } from '../../../components/ui/BackLink';
import { Button } from '../../../components/ui/Button';

export function ProfessionalProfileEditPage(): JSX.Element {
  const navigate = useNavigate();
  const { data: profile } = useMyProfile();
  const { data: publicProfile } = usePublicProfile(profile?.id);
  const { data: categories } = useCategories();
  const setCategories = useSetCategories();
  const upsert = useUpsertProfile();
  const [categoryId, setCategoryId] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({ resolver: zodResolver(profileFormSchema) });

  useEffect(() => {
    if (profile) {
      reset({
        headline: profile.headline,
        bio: profile.bio,
        yearsExperience: profile.yearsExperience,
        hourlyRate: profile.hourlyRate,
      });
    }
  }, [profile, reset]);

  useEffect(() => {
    const currentCategoryId = publicProfile?.categories[0]?.id;
    if (currentCategoryId) {
      setCategoryId(currentCategoryId);
    }
  }, [publicProfile]);

  const categoryOptions = (categories ?? [])
    .filter((category) => category.isActive)
    .map((category) => ({ value: category.id, label: category.name }));

  function handleCategoryChange(id: string) {
    setCategoryId(id);
    const label = categoryOptions.find((option) => option.value === id)?.label ?? '';
    setValue('headline', label, { shouldValidate: true });
    setCategories.mutate([id]);
  }

  const onSubmit = handleSubmit((values) => {
    upsert.mutate(values, { onSuccess: () => navigate('/professional/dashboard') });
  });

  return (
    <div className="mx-auto flex w-full max-w-app flex-col gap-8 p-6">
      <BackLink />
      <h1 className="text-3xl font-bold text-ink">Editar perfil</h1>
      <ProfileForm
        register={register}
        errors={errors}
        onSubmit={onSubmit}
        categoryOptions={categoryOptions}
        categoryId={categoryId}
        onCategoryChange={handleCategoryChange}
      />
      <PortfolioManager professionalId={profile?.id} />
      <AvailabilityManager professionalId={profile?.id} />
      <ServiceAreaManager />
      <div className="flex flex-col gap-2">
        {upsert.isError && <p className="text-sm text-accent">Não foi possível salvar o perfil</p>}
        <Button type="submit" form={PROFILE_FORM_ID} disabled={upsert.isPending}>
          {upsert.isPending ? 'Salvando...' : 'Salvar perfil'}
        </Button>
      </div>
    </div>
  );
}

export default ProfessionalProfileEditPage;
