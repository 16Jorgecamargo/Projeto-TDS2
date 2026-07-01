import { describe, it, expect, beforeEach } from 'vitest';
import type { Repository } from 'typeorm';
import { PortfolioService } from './portfolio.service.js';
import { mockRepo } from '../../test/mocks/index.js';
import type { ProfessionalProfile } from '../../infra/database/entities/professional-profile.entity.js';
import type { PortfolioItem } from '../../infra/database/entities/portfolio-item.entity.js';
import type { PortfolioImage } from '../../infra/database/entities/portfolio-image.entity.js';

describe('PortfolioService', () => {
  let profiles: ReturnType<typeof mockRepo<ProfessionalProfile>>;
  let items: ReturnType<typeof mockRepo<PortfolioItem>>;
  let images: ReturnType<typeof mockRepo<PortfolioImage>>;
  let service: PortfolioService;

  beforeEach(() => {
    profiles = mockRepo<ProfessionalProfile>();
    items = mockRepo<PortfolioItem>();
    images = mockRepo<PortfolioImage>();
    service = new PortfolioService({
      profiles: profiles as unknown as Repository<ProfessionalProfile>,
      items: items as unknown as Repository<PortfolioItem>,
      images: images as unknown as Repository<PortfolioImage>,
    });
  });

  it('cria item de portfolio', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    items.create.mockImplementation((v) => v as PortfolioItem);
    items.save.mockImplementation(async (v) => ({ id: 'item-1', ...v }) as PortfolioItem);

    const created = await service.createItem('user-1', {
      categoryId: null,
      title: 'Reforma',
      description: null,
      completedAt: null,
    });
    expect(created.id).toBe('item-1');
    expect(created.images).toEqual([]);
  });

  it('cria item com completedAt em formato YYYY-MM-DD como retornado pelo mysql2 para colunas date', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    items.create.mockImplementation((v) => v as PortfolioItem);
    items.save.mockImplementation(async (v) => ({ id: 'item-2', ...(v as object), completed_at: '2026-05-01' }) as PortfolioItem);

    const created = await service.createItem('user-1', {
      categoryId: null,
      title: 'Pintura',
      description: null,
      completedAt: '2026-05-01',
    });
    expect(created.completedAt).toBe('2026-05-01');
    expect(created.completedAt).not.toMatch(/T\d{2}:\d{2}/);
  });

  it('atualiza apenas campos enviados', async () => {
    items.findOne.mockResolvedValueOnce({
      id: 'item-1',
      professional_id: 'prof-1',
      category_id: null,
      title: 'Antigo',
      description: null,
      completed_at: null,
    } as PortfolioItem);
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    items.save.mockImplementation(async (v) => v as PortfolioItem);
    images.find.mockResolvedValue([]);

    const updated = await service.updateItem('user-1', 'item-1', { title: 'Novo titulo' });
    expect(updated.title).toBe('Novo titulo');
  });

  it('rejeita atualizar item de outro profissional', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    items.findOne.mockResolvedValueOnce({ id: 'item-9', professional_id: 'prof-OUTRO' } as PortfolioItem);
    await expect(service.updateItem('user-1', 'item-9', { title: 'X' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('remove item proprio e rejeita de outro profissional', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    items.findOne.mockResolvedValueOnce({ id: 'item-1', professional_id: 'prof-1' } as PortfolioItem);
    await service.removeItem('user-1', 'item-1');
    expect(items.delete).toHaveBeenCalledWith({ id: 'item-1' });

    items.findOne.mockResolvedValueOnce({ id: 'item-2', professional_id: 'prof-OUTRO' } as PortfolioItem);
    await expect(service.removeItem('user-1', 'item-2')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lista itens com imagens aninhadas ordenadas por posicao', async () => {
    items.find.mockResolvedValue([
      {
        id: 'item-1',
        professional_id: 'prof-1',
        category_id: null,
        title: 'Reforma',
        description: null,
        completed_at: '2026-05-01',
      } as PortfolioItem,
    ]);
    images.find.mockResolvedValue([
      { id: 'img-2', portfolio_item_id: 'item-1', image_url: 'https://cdn.app/img2.jpg', position: 1 } as PortfolioImage,
      { id: 'img-1', portfolio_item_id: 'item-1', image_url: 'https://cdn.app/img1.jpg', position: 0 } as PortfolioImage,
    ]);

    const list = await service.listItems('prof-1');
    expect(list).toHaveLength(1);
    expect(list[0]?.images).toHaveLength(2);
    expect(list[0]?.images[0]?.imageUrl).toBe('https://cdn.app/img1.jpg');
    expect(list[0]?.images[1]?.imageUrl).toBe('https://cdn.app/img2.jpg');
    expect(list[0]?.completedAt).toBe('2026-05-01');
  });

  it('adiciona e remove imagem de um item proprio', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    items.findOne.mockResolvedValue({ id: 'item-1', professional_id: 'prof-1' } as PortfolioItem);
    images.create.mockImplementation((v) => v as PortfolioImage);
    images.save.mockImplementation(async (v) => ({ id: 'img-1', ...v }) as PortfolioImage);

    const created = await service.addImage('user-1', 'item-1', { imageUrl: 'https://cdn.app/img.jpg', position: 0 });
    expect(created.id).toBe('img-1');

    images.findOne.mockResolvedValue({ id: 'img-1', portfolio_item_id: 'item-1' } as PortfolioImage);
    await service.removeImage('user-1', 'img-1');
    expect(images.delete).toHaveBeenCalledWith({ id: 'img-1' });
  });

  it('rejeita remover imagem de item de outro profissional', async () => {
    profiles.findOne.mockResolvedValue({ id: 'prof-1', user_id: 'user-1' } as ProfessionalProfile);
    images.findOne.mockResolvedValue({ id: 'img-9', portfolio_item_id: 'item-9' } as PortfolioImage);
    items.findOne.mockResolvedValue({ id: 'item-9', professional_id: 'prof-OUTRO' } as PortfolioItem);
    await expect(service.removeImage('user-1', 'img-9')).rejects.toMatchObject({ statusCode: 404 });
  });
});
