import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { ProfessionalDocument } from '../../infra/database/entities/professional-document.entity.js';
import { ProfessionalExperience } from '../../infra/database/entities/professional-experience.entity.js';
import { ProfessionalEducation } from '../../infra/database/entities/professional-education.entity.js';
import { ProfessionalCertification } from '../../infra/database/entities/professional-certification.entity.js';
import { ProfessionalServiceArea } from '../../infra/database/entities/professional-service-area.entity.js';
import { ProfessionalCategory } from '../../infra/database/entities/professional-category.entity.js';
import { ProfessionalTag } from '../../infra/database/entities/professional-tag.entity.js';
import { ServiceCategory } from '../../infra/database/entities/service-category.entity.js';
import { ServiceTag } from '../../infra/database/entities/service-tag.entity.js';
import { NotFoundError } from '../../shared/errors.js';
import type {
  UpsertProfileInput,
  ProfileResponse,
  PublicProfileResponse,
  ExperienceResponse,
  EducationResponse,
  CertificationResponse,
  ServiceAreaResponse,
} from './professional.schemas.js';

export interface ProfessionalServiceDeps {
  profiles: Repository<ProfessionalProfile>;
  documents: Repository<ProfessionalDocument>;
  experiences: Repository<ProfessionalExperience>;
  education: Repository<ProfessionalEducation>;
  certifications: Repository<ProfessionalCertification>;
  serviceAreas: Repository<ProfessionalServiceArea>;
  categories: Repository<ProfessionalCategory>;
  tags: Repository<ProfessionalTag>;
  serviceCategories: Repository<ServiceCategory>;
  serviceTags: Repository<ServiceTag>;
}

export class ProfessionalService {
  constructor(private readonly deps: ProfessionalServiceDeps) {}

  async upsertProfile(userId: string, input: UpsertProfileInput): Promise<ProfileResponse> {
    const existing = await this.deps.profiles.findOne({ where: { user_id: userId } });
    if (existing) {
      existing.headline = input.headline;
      existing.bio = input.bio;
      existing.years_experience = input.yearsExperience;
      existing.hourly_rate = input.hourlyRate === null ? null : input.hourlyRate.toFixed(2);
      existing.service_radius_km = input.serviceRadiusKm;
      const saved = await this.deps.profiles.save(existing);
      return this.toProfile(saved);
    }
    const created = await this.deps.profiles.save(
      this.deps.profiles.create({
        user_id: userId,
        headline: input.headline,
        bio: input.bio,
        years_experience: input.yearsExperience,
        hourly_rate: input.hourlyRate === null ? null : input.hourlyRate.toFixed(2),
        service_radius_km: input.serviceRadiusKm,
        rating_average: '0.00',
        rating_count: 0,
        is_available: true,
        verified_at: null,
      }),
    );
    return this.toProfile(created);
  }

  async getMyProfile(userId: string): Promise<ProfileResponse> {
    const profile = await this.deps.profiles.findOne({ where: { user_id: userId } });
    if (!profile) throw new NotFoundError('Perfil profissional nao encontrado');
    return this.toProfile(profile);
  }

  async resolveProfileId(userId: string): Promise<string> {
    const profile = await this.deps.profiles.findOne({ where: { user_id: userId } });
    if (!profile) throw new NotFoundError('Perfil profissional nao encontrado');
    return profile.id;
  }

  async getPublicProfile(profileId: string): Promise<PublicProfileResponse> {
    const profile = await this.deps.profiles.findOne({ where: { id: profileId } });
    if (!profile) throw new NotFoundError('Perfil profissional nao encontrado');
    const [experiences, education, certifications, serviceAreas, catLinks] = await Promise.all([
      this.deps.experiences.find({ where: { professional_id: profileId }, order: { start_date: 'DESC' } }),
      this.deps.education.find({ where: { professional_id: profileId } }),
      this.deps.certifications.find({ where: { professional_id: profileId } }),
      this.deps.serviceAreas.find({ where: { professional_id: profileId } }),
      this.deps.categories.find({ where: { professional_id: profileId } }),
    ]);
    const categoryIds = catLinks.map((link) => link.category_id);
    const categoryRows = categoryIds.length
      ? await this.deps.serviceCategories.find({ where: { id: In(categoryIds) } })
      : [];
    return {
      ...this.toProfile(profile),
      categories: categoryRows.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
      })),
      experiences: experiences.map((experience) => this.toExperience(experience)),
      education: education.map((entry) => this.toEducation(entry)),
      certifications: certifications.map((certification) => this.toCertification(certification)),
      serviceAreas: serviceAreas.map((area) => this.toServiceArea(area)),
    };
  }

  async setCategories(userId: string, ids: string[]): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const unique = [...new Set(ids)];
    if (unique.length) {
      const found = await this.deps.serviceCategories.find({ where: { id: In(unique) } });
      if (found.length !== unique.length) throw new NotFoundError('Categoria inexistente');
    }
    await this.deps.categories.delete({ professional_id: professionalId });
    await Promise.all(
      unique.map((categoryId) =>
        this.deps.categories.save(
          this.deps.categories.create({ professional_id: professionalId, category_id: categoryId }),
        ),
      ),
    );
  }

  async setTags(userId: string, ids: string[]): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const unique = [...new Set(ids)];
    if (unique.length) {
      const found = await this.deps.serviceTags.find({ where: { id: In(unique) } });
      if (found.length !== unique.length) throw new NotFoundError('Tag inexistente');
    }
    await this.deps.tags.delete({ professional_id: professionalId });
    await Promise.all(
      unique.map((tagId) =>
        this.deps.tags.save(this.deps.tags.create({ professional_id: professionalId, tag_id: tagId })),
      ),
    );
  }

  private toProfile(profile: ProfessionalProfile): ProfileResponse {
    return {
      id: profile.id,
      userId: profile.user_id,
      headline: profile.headline,
      bio: profile.bio,
      yearsExperience: profile.years_experience,
      hourlyRate: profile.hourly_rate === null ? null : Number(profile.hourly_rate),
      serviceRadiusKm: profile.service_radius_km,
      ratingAverage: Number(profile.rating_average),
      ratingCount: profile.rating_count,
      isAvailable: profile.is_available,
      verifiedAt: profile.verified_at ? profile.verified_at.toISOString() : null,
      createdAt: profile.created_at.toISOString(),
    };
  }

  private toExperience(experience: ProfessionalExperience): ExperienceResponse {
    return {
      id: experience.id,
      title: experience.title,
      company: experience.company,
      description: experience.description,
      startDate: experience.start_date,
      endDate: experience.end_date,
      isCurrent: experience.is_current,
    };
  }

  private toEducation(education: ProfessionalEducation): EducationResponse {
    return {
      id: education.id,
      institution: education.institution,
      degree: education.degree,
      fieldOfStudy: education.field_of_study,
      startDate: education.start_date,
      endDate: education.end_date,
    };
  }

  private toCertification(certification: ProfessionalCertification): CertificationResponse {
    return {
      id: certification.id,
      name: certification.name,
      issuer: certification.issuer,
      issuedAt: certification.issued_at,
      expiresAt: certification.expires_at,
      credentialUrl: certification.credential_url,
    };
  }

  private toServiceArea(area: ProfessionalServiceArea): ServiceAreaResponse {
    return { id: area.id, city: area.city, state: area.state, radiusKm: area.radius_km };
  }
}
