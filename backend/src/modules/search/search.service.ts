import type { Repository } from 'typeorm';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { ProfessionalCategory } from '../../infra/database/entities/professional-category.entity.js';
import { ProfessionalServiceArea } from '../../infra/database/entities/professional-service-area.entity.js';
import type { SearchQuery, SearchResultItem } from './search.schemas.js';

interface SearchServiceDeps {
  profiles: Repository<ProfessionalProfile>;
  categoryLinks: Repository<ProfessionalCategory>;
  serviceAreas: Repository<ProfessionalServiceArea>;
}

export interface SearchResult {
  items: SearchResultItem[];
  page: number;
  limit: number;
  total: number;
}

export class SearchService {
  constructor(private readonly deps: SearchServiceDeps) {}

  async searchProfessionals(query: SearchQuery): Promise<SearchResult> {
    const qb = this.deps.profiles
      .createQueryBuilder('profile')
      .where('profile.is_available = :available', { available: true });

    if (query.categoryId) {
      qb.innerJoin(
        ProfessionalCategory,
        'category_link',
        'category_link.professional_id = profile.id AND category_link.category_id = :categoryId',
        { categoryId: query.categoryId },
      );
    }

    if (query.city && query.state) {
      qb.innerJoin(
        ProfessionalServiceArea,
        'area',
        'area.professional_id = profile.id AND area.city = :city AND area.state = :state',
        { city: query.city, state: query.state },
      );
    }

    if (query.q) {
      qb.andWhere('(profile.headline LIKE :q OR profile.bio LIKE :q)', { q: `%${query.q}%` });
    }

    qb.orderBy('profile.rating_average', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();

    return {
      items: rows.map((row) => this.toResultItem(row)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  private toResultItem(profile: ProfessionalProfile): SearchResultItem {
    return {
      id: profile.id,
      headline: profile.headline,
      bio: profile.bio,
      hourlyRate: profile.hourly_rate === null ? null : Number(profile.hourly_rate),
      ratingAverage: Number(profile.rating_average),
      ratingCount: profile.rating_count,
      isAvailable: profile.is_available,
    };
  }
}
