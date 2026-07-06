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
import { ConflictError, NotFoundError } from '../../shared/errors.js';
import type {
  UpsertProfileInput,
  ProfileResponse,
  PublicProfileResponse,
  ExperienceInput,
  ExperienceResponse,
  EducationInput,
  EducationResponse,
  CertificationInput,
  CertificationResponse,
  ServiceAreaInput,
  ServiceAreaResponse,
  DocumentInput,
  DocumentResponse,
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
    const existing = await this.deps.profiles.findOne({ where: { user_id: userId }, relations: ['user'] });
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
    const withUser = await this.deps.profiles.findOne({ where: { id: created.id }, relations: ['user'] });
    return this.toProfile(withUser ?? created);
  }

  private async getOrCreateProfile(userId: string): Promise<ProfessionalProfile> {
    const existing = await this.deps.profiles.findOne({ where: { user_id: userId }, relations: ['user'] });
    if (existing) return existing;
    const created = await this.deps.profiles.save(
      this.deps.profiles.create({
        user_id: userId,
        headline: '',
        bio: null,
        years_experience: null,
        hourly_rate: null,
        service_radius_km: null,
        rating_average: '0.00',
        rating_count: 0,
        is_available: true,
        verified_at: null,
      }),
    );
    const withUser = await this.deps.profiles.findOne({ where: { id: created.id }, relations: ['user'] });
    return withUser ?? created;
  }

  async getMyProfile(userId: string): Promise<ProfileResponse> {
    const profile = await this.getOrCreateProfile(userId);
    return this.toProfile(profile);
  }

  async resolveProfileId(userId: string): Promise<string> {
    const profile = await this.getOrCreateProfile(userId);
    return profile.id;
  }

  async getPublicProfile(profileId: string): Promise<PublicProfileResponse> {
    const profile = await this.deps.profiles.findOne({ where: { id: profileId }, relations: ['user'] });
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

  async addExperience(userId: string, input: ExperienceInput): Promise<ExperienceResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.experiences.save(
      this.deps.experiences.create({
        professional_id: professionalId,
        title: input.title,
        company: input.company,
        description: input.description,
        start_date: input.startDate,
        end_date: input.endDate,
        is_current: input.isCurrent,
      }),
    );
    return this.toExperience(saved);
  }

  async removeExperience(userId: string, id: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const experience = await this.deps.experiences.findOne({ where: { id } });
    if (!experience || experience.professional_id !== professionalId) {
      throw new NotFoundError('Experiência não encontrada');
    }
    await this.deps.experiences.delete({ id });
  }

  async addEducation(userId: string, input: EducationInput): Promise<EducationResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.education.save(
      this.deps.education.create({
        professional_id: professionalId,
        institution: input.institution,
        degree: input.degree,
        field_of_study: input.fieldOfStudy,
        start_date: input.startDate,
        end_date: input.endDate,
      }),
    );
    return this.toEducation(saved);
  }

  async removeEducation(userId: string, id: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const education = await this.deps.education.findOne({ where: { id } });
    if (!education || education.professional_id !== professionalId) {
      throw new NotFoundError('Formação não encontrada');
    }
    await this.deps.education.delete({ id });
  }

  async addCertification(userId: string, input: CertificationInput): Promise<CertificationResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.certifications.save(
      this.deps.certifications.create({
        professional_id: professionalId,
        name: input.name,
        issuer: input.issuer,
        issued_at: input.issuedAt,
        expires_at: input.expiresAt,
        credential_url: input.credentialUrl,
      }),
    );
    return this.toCertification(saved);
  }

  async removeCertification(userId: string, id: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const certification = await this.deps.certifications.findOne({ where: { id } });
    if (!certification || certification.professional_id !== professionalId) {
      throw new NotFoundError('Certificação não encontrada');
    }
    await this.deps.certifications.delete({ id });
  }

  async addServiceArea(userId: string, input: ServiceAreaInput): Promise<ServiceAreaResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const existing = await this.deps.serviceAreas.findOne({
      where: { professional_id: professionalId, city: input.city, state: input.state },
    });
    if (existing) {
      throw new ConflictError('Área de atendimento já cadastrada para esta cidade/UF');
    }
    const saved = await this.deps.serviceAreas.save(
      this.deps.serviceAreas.create({
        professional_id: professionalId,
        city: input.city,
        state: input.state,
        radius_km: input.radiusKm,
      }),
    );
    return this.toServiceArea(saved);
  }

  async removeServiceArea(userId: string, id: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const area = await this.deps.serviceAreas.findOne({ where: { id } });
    if (!area || area.professional_id !== professionalId) {
      throw new NotFoundError('Área de atendimento não encontrada');
    }
    await this.deps.serviceAreas.delete({ id });
  }

  async addDocument(userId: string, input: DocumentInput): Promise<DocumentResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.documents.save(
      this.deps.documents.create({
        professional_id: professionalId,
        type: input.type,
        file_url: input.fileUrl,
        status: 'pending',
        reviewed_at: null,
      }),
    );
    return this.toDocument(saved);
  }

  async listDocuments(userId: string): Promise<DocumentResponse[]> {
    const professionalId = await this.resolveProfileId(userId);
    const rows = await this.deps.documents.find({ where: { professional_id: professionalId } });
    return rows.map((row) => this.toDocument(row));
  }

  private toProfile(profile: ProfessionalProfile): ProfileResponse {
    return {
      id: profile.id,
      userId: profile.user_id,
      fullName: profile.user.full_name,
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

  private toDocument(document: ProfessionalDocument): DocumentResponse {
    return {
      id: document.id,
      type: document.type,
      fileUrl: document.file_url,
      status: document.status,
      reviewedAt: document.reviewed_at ? document.reviewed_at.toISOString() : null,
    };
  }
}
