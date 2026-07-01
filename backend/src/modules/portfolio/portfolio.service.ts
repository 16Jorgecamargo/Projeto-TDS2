import { In, type Repository } from 'typeorm';
import { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import { PortfolioItem } from '../../infra/database/entities/portfolio-item.entity.js';
import { PortfolioImage } from '../../infra/database/entities/portfolio-image.entity.js';
import { NotFoundError } from '../../shared/errors.js';
import type {
  PortfolioItemInput,
  UpdatePortfolioItemInput,
  PortfolioItemResponse,
  PortfolioImageInput,
  PortfolioImageResponse,
} from './portfolio.schemas.js';

export interface PortfolioServiceDeps {
  profiles: Repository<ProfessionalProfile>;
  items: Repository<PortfolioItem>;
  images: Repository<PortfolioImage>;
}

export class PortfolioService {
  constructor(private readonly deps: PortfolioServiceDeps) {}

  private async resolveProfileId(userId: string): Promise<string> {
    const profile = await this.deps.profiles.findOne({ where: { user_id: userId } });
    if (!profile) throw new NotFoundError('Perfil profissional nao encontrado');
    return profile.id;
  }

  private async loadOwnedItem(userId: string, id: string): Promise<PortfolioItem> {
    const professionalId = await this.resolveProfileId(userId);
    const item = await this.deps.items.findOne({ where: { id } });
    if (!item || item.professional_id !== professionalId) {
      throw new NotFoundError('Item de portfolio nao encontrado');
    }
    return item;
  }

  async createItem(userId: string, input: PortfolioItemInput): Promise<PortfolioItemResponse> {
    const professionalId = await this.resolveProfileId(userId);
    const saved = await this.deps.items.save(
      this.deps.items.create({
        professional_id: professionalId,
        category_id: input.categoryId,
        title: input.title,
        description: input.description,
        completed_at: input.completedAt,
      }),
    );
    return this.toItem(saved, []);
  }

  async updateItem(userId: string, id: string, input: UpdatePortfolioItemInput): Promise<PortfolioItemResponse> {
    const item = await this.loadOwnedItem(userId, id);
    if (input.categoryId !== undefined) item.category_id = input.categoryId;
    if (input.title !== undefined) item.title = input.title;
    if (input.description !== undefined) item.description = input.description;
    if (input.completedAt !== undefined) item.completed_at = input.completedAt;
    const saved = await this.deps.items.save(item);
    const images = await this.deps.images.find({ where: { portfolio_item_id: saved.id } });
    return this.toItem(saved, images);
  }

  async removeItem(userId: string, id: string): Promise<void> {
    const item = await this.loadOwnedItem(userId, id);
    await this.deps.items.delete({ id: item.id });
  }

  async listItems(professionalId: string): Promise<PortfolioItemResponse[]> {
    const items = await this.deps.items.find({ where: { professional_id: professionalId }, order: { completed_at: 'DESC' } });
    if (!items.length) return [];
    const itemIds = items.map((item) => item.id);
    const allImages = await this.deps.images.find({ where: { portfolio_item_id: In(itemIds) } });
    return items.map((item) =>
      this.toItem(
        item,
        allImages.filter((image) => image.portfolio_item_id === item.id),
      ),
    );
  }

  async addImage(userId: string, itemId: string, input: PortfolioImageInput): Promise<PortfolioImageResponse> {
    await this.loadOwnedItem(userId, itemId);
    const saved = await this.deps.images.save(
      this.deps.images.create({
        portfolio_item_id: itemId,
        image_url: input.imageUrl,
        position: input.position,
      }),
    );
    return this.toImage(saved);
  }

  async removeImage(userId: string, imageId: string): Promise<void> {
    const professionalId = await this.resolveProfileId(userId);
    const image = await this.deps.images.findOne({ where: { id: imageId } });
    if (!image) throw new NotFoundError('Imagem nao encontrada');
    const item = await this.deps.items.findOne({ where: { id: image.portfolio_item_id } });
    if (!item || item.professional_id !== professionalId) {
      throw new NotFoundError('Imagem nao encontrada');
    }
    await this.deps.images.delete({ id: imageId });
  }

  private toItem(item: PortfolioItem, images: PortfolioImage[]): PortfolioItemResponse {
    return {
      id: item.id,
      categoryId: item.category_id,
      title: item.title,
      description: item.description,
      completedAt: item.completed_at,
      images: images
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((image) => this.toImage(image)),
    };
  }

  private toImage(image: PortfolioImage): PortfolioImageResponse {
    return { id: image.id, imageUrl: image.image_url, position: image.position };
  }
}
