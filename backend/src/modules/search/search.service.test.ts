import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { SearchService } from './search.service.js';
import { mockRepo, mockQueryBuilder } from '../../test/mocks/index.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import type { ProfessionalCategory } from '../../infra/database/entities/professional-category.entity.js';
import type { ProfessionalServiceArea } from '../../infra/database/entities/professional-service-area.entity.js';

describe('SearchService', () => {
  let profiles: ReturnType<typeof mockRepo<ProfessionalProfile>>;
  let categoryLinks: ReturnType<typeof mockRepo<ProfessionalCategory>>;
  let serviceAreas: ReturnType<typeof mockRepo<ProfessionalServiceArea>>;
  let service: SearchService;

  beforeEach(() => {
    profiles = mockRepo<ProfessionalProfile>();
    categoryLinks = mockRepo<ProfessionalCategory>();
    serviceAreas = mockRepo<ProfessionalServiceArea>();
    service = new SearchService({
      profiles: profiles as unknown as Repository<ProfessionalProfile>,
      categoryLinks: categoryLinks as unknown as Repository<ProfessionalCategory>,
      serviceAreas: serviceAreas as unknown as Repository<ProfessionalServiceArea>,
    });
  });

  it('busca profissionais paginados sem filtros', async () => {
    const qb = mockQueryBuilder();
    qb.getManyAndCount.mockResolvedValue([
      [{ id: 'prof-1', headline: 'Eletricista', bio: null, hourly_rate: '120.00', rating_average: '4.80', rating_count: 3, is_available: true }],
      1,
    ]);
    profiles.createQueryBuilder.mockReturnValue(qb);

    const result = await service.searchProfessionals({ page: 1, limit: 20 });
    expect(result.total).toBe(1);
    expect(result.items[0]?.hourlyRate).toBe(120);
    expect(result.items[0]?.ratingAverage).toBe(4.8);
  });

  it('aplica filtro de categoria, cidade, uf e texto', async () => {
    const qb = mockQueryBuilder();
    qb.getManyAndCount.mockResolvedValue([[], 0]);
    profiles.createQueryBuilder.mockReturnValue(qb);

    await service.searchProfessionals({
      page: 1,
      limit: 20,
      categoryId: 'cat-1',
      city: 'Porto Alegre',
      state: 'RS',
      q: 'eletric',
    });

    expect(qb.andWhere).toHaveBeenCalled();
  });

  it('anexa nomes de categorias dos profissionais retornados', async () => {
    const qb = mockQueryBuilder();
    qb.getManyAndCount.mockResolvedValue([
      [{ id: 'prof-1', headline: 'Eletricista', bio: null, hourly_rate: null, rating_average: '0', rating_count: 0, is_available: true }],
      1,
    ]);
    profiles.createQueryBuilder.mockReturnValue(qb);
    categoryLinks.find.mockResolvedValue([
      { professional_id: 'prof-1', category: { name: 'Eletricista' } },
    ]);

    const result = await service.searchProfessionals({ page: 1, limit: 20 });

    expect(result.items[0]?.categories).toEqual(['Eletricista']);
  });

  it('lista cidades e estados distintos das areas de atendimento', async () => {
    const qb = mockQueryBuilder();
    qb.getRawMany.mockResolvedValue([{ city: 'Porto Alegre', state: 'RS' }]);
    serviceAreas.createQueryBuilder.mockReturnValue(qb);

    const result = await service.listLocations();

    expect(result).toEqual([{ city: 'Porto Alegre', state: 'RS' }]);
  });
});
