import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { ProfessionalService } from './professional.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import { NotFoundError } from '../../shared/errors.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import type { ProfessionalDocument } from '../../infra/database/entities/professional-document.entity.js';
import type { ProfessionalExperience } from '../../infra/database/entities/professional-experience.entity.js';
import type { ProfessionalEducation } from '../../infra/database/entities/professional-education.entity.js';
import type { ProfessionalCertification } from '../../infra/database/entities/professional-certification.entity.js';
import type { ProfessionalServiceArea } from '../../infra/database/entities/professional-service-area.entity.js';
import type { ProfessionalCategory } from '../../infra/database/entities/professional-category.entity.js';
import type { ProfessionalTag } from '../../infra/database/entities/professional-tag.entity.js';
import type { ServiceCategory } from '../../infra/database/entities/service-category.entity.js';
import type { ServiceTag } from '../../infra/database/entities/service-tag.entity.js';

describe('ProfessionalService', () => {
  let profiles: ReturnType<typeof mockRepo<ProfessionalProfile>>;
  let documents: ReturnType<typeof mockRepo<ProfessionalDocument>>;
  let experiences: ReturnType<typeof mockRepo<ProfessionalExperience>>;
  let education: ReturnType<typeof mockRepo<ProfessionalEducation>>;
  let certifications: ReturnType<typeof mockRepo<ProfessionalCertification>>;
  let serviceAreas: ReturnType<typeof mockRepo<ProfessionalServiceArea>>;
  let categories: ReturnType<typeof mockRepo<ProfessionalCategory>>;
  let tags: ReturnType<typeof mockRepo<ProfessionalTag>>;
  let serviceCategories: ReturnType<typeof mockRepo<ServiceCategory>>;
  let serviceTags: ReturnType<typeof mockRepo<ServiceTag>>;
  let service: ProfessionalService;

  beforeEach(() => {
    profiles = mockRepo<ProfessionalProfile>();
    documents = mockRepo<ProfessionalDocument>();
    experiences = mockRepo<ProfessionalExperience>();
    education = mockRepo<ProfessionalEducation>();
    certifications = mockRepo<ProfessionalCertification>();
    serviceAreas = mockRepo<ProfessionalServiceArea>();
    categories = mockRepo<ProfessionalCategory>();
    tags = mockRepo<ProfessionalTag>();
    serviceCategories = mockRepo<ServiceCategory>();
    serviceTags = mockRepo<ServiceTag>();
    service = new ProfessionalService({
      profiles: profiles as unknown as Repository<ProfessionalProfile>,
      documents: documents as unknown as Repository<ProfessionalDocument>,
      experiences: experiences as unknown as Repository<ProfessionalExperience>,
      education: education as unknown as Repository<ProfessionalEducation>,
      certifications: certifications as unknown as Repository<ProfessionalCertification>,
      serviceAreas: serviceAreas as unknown as Repository<ProfessionalServiceArea>,
      categories: categories as unknown as Repository<ProfessionalCategory>,
      tags: tags as unknown as Repository<ProfessionalTag>,
      serviceCategories: serviceCategories as unknown as Repository<ServiceCategory>,
      serviceTags: serviceTags as unknown as Repository<ServiceTag>,
    });
  });

  describe('upsertProfile', () => {
    it('cria perfil quando ausente e converte DECIMAL para number', async () => {
      profiles.findOne.mockResolvedValueOnce(null);
      profiles.save.mockResolvedValueOnce({
        id: 'pro-1',
        user_id: 'user-1',
        headline: 'Eletricista',
        bio: null,
        years_experience: 10,
        hourly_rate: '120.00',
        service_radius_km: 30,
        rating_average: '4.80',
        rating_count: 42,
        is_available: true,
        verified_at: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as ProfessionalProfile);

      const result = await service.upsertProfile('user-1', {
        headline: 'Eletricista',
        bio: null,
        yearsExperience: 10,
        hourlyRate: 120,
        serviceRadiusKm: 30,
      });

      expect(result.hourlyRate).toBe(120);
      expect(typeof result.hourlyRate).toBe('number');
      expect(result.ratingAverage).toBe(4.8);
      expect(typeof result.ratingAverage).toBe('number');
    });

    it('atualiza perfil existente mantendo hourlyRate nulo quando enviado null', async () => {
      profiles.findOne.mockResolvedValueOnce({
        id: 'pro-1',
        user_id: 'user-1',
        headline: 'Antigo',
        bio: null,
        years_experience: null,
        hourly_rate: null,
        service_radius_km: null,
        rating_average: '0.00',
        rating_count: 0,
        is_available: true,
        verified_at: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as ProfessionalProfile);
      profiles.save.mockImplementationOnce(async (value: ProfessionalProfile) => value);

      const result = await service.upsertProfile('user-1', {
        headline: 'Novo',
        bio: 'bio',
        yearsExperience: 5,
        hourlyRate: null,
        serviceRadiusKm: null,
      });

      expect(result.headline).toBe('Novo');
      expect(result.hourlyRate).toBeNull();
      expect(result.bio).toBe('bio');
      expect(result.yearsExperience).toBe(5);
    });
  });

  describe('getMyProfile', () => {
    it('retorna 404 quando usuario nao tem perfil', async () => {
      profiles.findOne.mockResolvedValueOnce(null);
      await expect(service.getMyProfile('user-x')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('retorna o perfil convertido quando existe', async () => {
      profiles.findOne.mockResolvedValueOnce({
        id: 'pro-1',
        user_id: 'user-1',
        headline: 'Eletricista',
        bio: null,
        years_experience: 10,
        hourly_rate: '120.00',
        service_radius_km: 30,
        rating_average: '4.80',
        rating_count: 42,
        is_available: true,
        verified_at: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as ProfessionalProfile);

      const result = await service.getMyProfile('user-1');

      expect(result.id).toBe('pro-1');
      expect(result.hourlyRate).toBe(120);
    });
  });

  describe('resolveProfileId', () => {
    it('lanca 404 quando usuario nao tem perfil', async () => {
      profiles.findOne.mockResolvedValueOnce(null);
      await expect(service.resolveProfileId('user-x')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('retorna o id do perfil quando existe', async () => {
      profiles.findOne.mockResolvedValueOnce({ id: 'pro-1', user_id: 'user-1' } as ProfessionalProfile);
      await expect(service.resolveProfileId('user-1')).resolves.toBe('pro-1');
    });
  });

  describe('getPublicProfile', () => {
    it('lanca 404 quando perfil nao existe', async () => {
      profiles.findOne.mockResolvedValueOnce(null);
      await expect(service.getPublicProfile('pro-x')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('monta perfil publico com experiencias, educacao, certificacoes, areas e categorias', async () => {
      profiles.findOne.mockResolvedValueOnce({
        id: 'pro-1',
        user_id: 'user-1',
        headline: 'Eletricista',
        bio: 'bio',
        years_experience: 10,
        hourly_rate: '120.00',
        service_radius_km: 30,
        rating_average: '4.80',
        rating_count: 42,
        is_available: true,
        verified_at: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as ProfessionalProfile);
      experiences.find.mockResolvedValueOnce([
        {
          id: 'exp-1',
          professional_id: 'pro-1',
          title: 'Eletricista',
          company: 'Eletrica ABC',
          description: null,
          start_date: '2015-01-01',
          end_date: null,
          is_current: true,
          created_at: new Date('2026-07-01T12:00:00Z'),
        },
      ] as ProfessionalExperience[]);
      education.find.mockResolvedValueOnce([
        {
          id: 'edu-1',
          professional_id: 'pro-1',
          institution: 'SENAI',
          degree: 'Tecnico',
          field_of_study: null,
          start_date: null,
          end_date: null,
          created_at: new Date('2026-07-01T12:00:00Z'),
        },
      ] as ProfessionalEducation[]);
      certifications.find.mockResolvedValueOnce([
        {
          id: 'cert-1',
          professional_id: 'pro-1',
          name: 'NR-10',
          issuer: 'SENAI',
          issued_at: null,
          expires_at: null,
          credential_url: null,
          created_at: new Date('2026-07-01T12:00:00Z'),
        },
      ] as ProfessionalCertification[]);
      serviceAreas.find.mockResolvedValueOnce([
        {
          id: 'area-1',
          professional_id: 'pro-1',
          city: 'Porto Alegre',
          state: 'RS',
          radius_km: 20,
          created_at: new Date('2026-07-01T12:00:00Z'),
        },
      ] as ProfessionalServiceArea[]);
      categories.find.mockResolvedValueOnce([
        { id: 'link-1', professional_id: 'pro-1', category_id: 'cat-1', created_at: new Date() },
      ] as ProfessionalCategory[]);
      serviceCategories.find.mockResolvedValueOnce([
        { id: 'cat-1', name: 'Eletrica', slug: 'eletrica' } as ServiceCategory,
      ]);

      const result = await service.getPublicProfile('pro-1');

      expect(result.experiences).toHaveLength(1);
      expect(result.experiences[0]?.title).toBe('Eletricista');
      expect(result.education).toHaveLength(1);
      expect(result.certifications).toHaveLength(1);
      expect(result.serviceAreas).toHaveLength(1);
      expect(result.serviceAreas[0]?.city).toBe('Porto Alegre');
      expect(result.categories).toEqual([{ id: 'cat-1', name: 'Eletrica', slug: 'eletrica' }]);
      expect(result.hourlyRate).toBe(120);
    });

    it('nao consulta categorias quando profissional nao possui associacoes', async () => {
      profiles.findOne.mockResolvedValueOnce({
        id: 'pro-1',
        user_id: 'user-1',
        headline: 'Eletricista',
        bio: null,
        years_experience: null,
        hourly_rate: null,
        service_radius_km: null,
        rating_average: '0.00',
        rating_count: 0,
        is_available: true,
        verified_at: null,
        created_at: new Date('2026-07-01T12:00:00Z'),
      } as ProfessionalProfile);
      categories.find.mockResolvedValueOnce([]);

      const result = await service.getPublicProfile('pro-1');

      expect(result.categories).toEqual([]);
      expect(serviceCategories.find).not.toHaveBeenCalled();
    });
  });

  describe('setCategories', () => {
    it('substitui associacoes removendo antigas e criando novas validas', async () => {
      profiles.findOne.mockResolvedValueOnce({ id: 'pro-1', user_id: 'user-1' } as ProfessionalProfile);
      serviceCategories.find.mockResolvedValueOnce([{ id: 'cat-1' }, { id: 'cat-2' }] as ServiceCategory[]);

      await service.setCategories('user-1', ['cat-1', 'cat-2']);

      expect(categories.delete).toHaveBeenCalledWith({ professional_id: 'pro-1' });
      expect(categories.save).toHaveBeenCalledTimes(2);
    });

    it('lanca 404 se alguma categoria nao existe', async () => {
      profiles.findOne.mockResolvedValueOnce({ id: 'pro-1', user_id: 'user-1' } as ProfessionalProfile);
      serviceCategories.find.mockResolvedValueOnce([{ id: 'cat-1' }] as ServiceCategory[]);

      await expect(service.setCategories('user-1', ['cat-1', 'cat-2'])).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it('lanca 404 quando usuario nao tem perfil', async () => {
      profiles.findOne.mockResolvedValueOnce(null);
      await expect(service.setCategories('user-x', ['cat-1'])).rejects.toBeInstanceOf(NotFoundError);
    });

    it('limpa associacoes sem consultar categorias quando lista vazia', async () => {
      profiles.findOne.mockResolvedValueOnce({ id: 'pro-1', user_id: 'user-1' } as ProfessionalProfile);

      await service.setCategories('user-1', []);

      expect(serviceCategories.find).not.toHaveBeenCalled();
      expect(categories.delete).toHaveBeenCalledWith({ professional_id: 'pro-1' });
      expect(categories.save).not.toHaveBeenCalled();
    });
  });

  describe('setTags', () => {
    it('substitui associacoes removendo antigas e criando novas validas', async () => {
      profiles.findOne.mockResolvedValueOnce({ id: 'pro-1', user_id: 'user-1' } as ProfessionalProfile);
      serviceTags.find.mockResolvedValueOnce([{ id: 'tag-1' }] as ServiceTag[]);

      await service.setTags('user-1', ['tag-1']);

      expect(tags.delete).toHaveBeenCalledWith({ professional_id: 'pro-1' });
      expect(tags.save).toHaveBeenCalledTimes(1);
    });

    it('lanca 404 se alguma tag nao existe', async () => {
      profiles.findOne.mockResolvedValueOnce({ id: 'pro-1', user_id: 'user-1' } as ProfessionalProfile);
      serviceTags.find.mockResolvedValueOnce([]);

      await expect(service.setTags('user-1', ['tag-1'])).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('addExperience / removeExperience', () => {
    it('adiciona e remove experiencia do proprio profissional', async () => {
      profiles.findOne.mockResolvedValue({ id: 'pro-1', user_id: 'user-1' } as ProfessionalProfile);
      experiences.save.mockResolvedValueOnce({
        id: 'exp-1',
        professional_id: 'pro-1',
        title: 'Eletricista',
        company: 'Eletrica ABC',
        description: null,
        start_date: '2020-01-01',
        end_date: null,
        is_current: true,
      } as ProfessionalExperience);

      const created = await service.addExperience('user-1', {
        title: 'Eletricista',
        company: 'Eletrica ABC',
        description: null,
        startDate: '2020-01-01',
        endDate: null,
        isCurrent: true,
      });

      expect(created.id).toBe('exp-1');
      expect(experiences.create).toHaveBeenCalledWith(
        expect.objectContaining({ professional_id: 'pro-1', title: 'Eletricista' }),
      );

      experiences.findOne.mockResolvedValueOnce({
        id: 'exp-1',
        professional_id: 'pro-1',
      } as ProfessionalExperience);
      await service.removeExperience('user-1', 'exp-1');
      expect(experiences.delete).toHaveBeenCalledWith({ id: 'exp-1' });
    });

    it('rejeita remover experiencia de outro profissional', async () => {
      profiles.findOne.mockResolvedValue({ id: 'pro-1', user_id: 'user-1' } as ProfessionalProfile);
      experiences.findOne.mockResolvedValueOnce({
        id: 'exp-9',
        professional_id: 'pro-OUTRO',
      } as ProfessionalExperience);

      await expect(service.removeExperience('user-1', 'exp-9')).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(experiences.delete).not.toHaveBeenCalled();
    });
  });

  describe('addEducation / addCertification', () => {
    it('adiciona formacao e certificacao', async () => {
      profiles.findOne.mockResolvedValue({ id: 'pro-1', user_id: 'user-1' } as ProfessionalProfile);
      education.save.mockResolvedValueOnce({
        id: 'edu-1',
        professional_id: 'pro-1',
        institution: 'SENAI',
        degree: 'Tecnico',
        field_of_study: null,
        start_date: null,
        end_date: null,
      } as ProfessionalEducation);

      const edu = await service.addEducation('user-1', {
        institution: 'SENAI',
        degree: 'Tecnico',
        fieldOfStudy: null,
        startDate: null,
        endDate: null,
      });
      expect(edu.id).toBe('edu-1');

      certifications.save.mockResolvedValueOnce({
        id: 'cert-1',
        professional_id: 'pro-1',
        name: 'NR-10',
        issuer: 'SENAI',
        issued_at: null,
        expires_at: null,
        credential_url: null,
      } as ProfessionalCertification);

      const cert = await service.addCertification('user-1', {
        name: 'NR-10',
        issuer: 'SENAI',
        issuedAt: null,
        expiresAt: null,
        credentialUrl: null,
      });
      expect(cert.id).toBe('cert-1');
    });
  });

  describe('addServiceArea', () => {
    it('adiciona area de atendimento e rejeita duplicata de cidade/UF', async () => {
      profiles.findOne.mockResolvedValue({ id: 'pro-1', user_id: 'user-1' } as ProfessionalProfile);
      serviceAreas.findOne.mockResolvedValueOnce(null);
      serviceAreas.save.mockResolvedValueOnce({
        id: 'area-1',
        professional_id: 'pro-1',
        city: 'Porto Alegre',
        state: 'RS',
        radius_km: 20,
      } as ProfessionalServiceArea);

      const area = await service.addServiceArea('user-1', {
        city: 'Porto Alegre',
        state: 'RS',
        radiusKm: 20,
      });
      expect(area.id).toBe('area-1');

      serviceAreas.findOne.mockResolvedValueOnce({ id: 'area-1' } as ProfessionalServiceArea);
      await expect(
        service.addServiceArea('user-1', { city: 'Porto Alegre', state: 'RS', radiusKm: 20 }),
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('addDocument / listDocuments', () => {
    it('adiciona e lista documentos', async () => {
      profiles.findOne.mockResolvedValue({ id: 'pro-1', user_id: 'user-1' } as ProfessionalProfile);
      documents.save.mockResolvedValueOnce({
        id: 'doc-1',
        professional_id: 'pro-1',
        type: 'rg',
        file_url: 'https://cdn.app/rg.pdf',
        status: 'pending',
        reviewed_at: null,
      } as ProfessionalDocument);

      const created = await service.addDocument('user-1', {
        type: 'rg',
        fileUrl: 'https://cdn.app/rg.pdf',
      });
      expect(created.status).toBe('pending');

      documents.find.mockResolvedValueOnce([
        {
          id: 'doc-1',
          professional_id: 'pro-1',
          type: 'rg',
          file_url: 'https://cdn.app/rg.pdf',
          status: 'pending',
          reviewed_at: null,
        },
      ] as ProfessionalDocument[]);
      const list = await service.listDocuments('user-1');
      expect(list).toHaveLength(1);
      expect(list[0]?.fileUrl).toBe('https://cdn.app/rg.pdf');
    });
  });
});
