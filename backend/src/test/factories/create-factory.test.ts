import { describe, expect, it, vi } from 'vitest';
import type { DataSource } from 'typeorm';
import { createFactory } from './create-factory.js';

type Widget = { id: string; label: string; size: number };

function fakeDataSource() {
  const save = vi.fn((entity: Widget) => Promise.resolve(entity));
  const create = vi.fn((value: Partial<Widget>) => value as Widget);
  const getRepository = vi.fn(() => ({ create, save }));
  return { dataSource: { getRepository } as unknown as DataSource, save, create, getRepository };
}

describe('createFactory', () => {
  it('merges defaults with overrides and persists', async () => {
    const { dataSource, save, create } = fakeDataSource();
    const createWidget = createFactory<Widget>('Widget', () => ({
      id: 'default',
      label: 'default',
      size: 1,
    }));
    const widget = await createWidget(dataSource, { label: 'custom' });
    expect(create).toHaveBeenCalledWith({ id: 'default', label: 'custom', size: 1 });
    expect(save).toHaveBeenCalledWith({ id: 'default', label: 'custom', size: 1 });
    expect(widget).toEqual({ id: 'default', label: 'custom', size: 1 });
  });

  it('calls defaults fresh on every invocation', async () => {
    const { dataSource } = fakeDataSource();
    const defaults = vi.fn(() => ({ id: 'x', label: 'y', size: 0 }));
    const createWidget = createFactory<Widget>('Widget', defaults);
    await createWidget(dataSource);
    await createWidget(dataSource);
    expect(defaults).toHaveBeenCalledTimes(2);
  });
});
