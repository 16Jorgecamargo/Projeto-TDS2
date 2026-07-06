import { useState, type JSX } from 'react';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useTags,
  useCreateTag,
} from '../queries';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

const inputClass = 'rounded-sm border border-surface px-3 py-2 text-ink';

export function CatalogManager(): JSX.Element {
  const categories = useCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const tags = useTags();
  const createTag = useCreateTag();

  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [tagName, setTagName] = useState('');
  const [tagSlug, setTagSlug] = useState('');

  function submitCategory() {
    if (categoryName.trim().length < 2 || categorySlug.trim().length < 2) return;
    createCategory.mutate({
      parentId: null,
      name: categoryName,
      slug: categorySlug,
      icon: null,
      description: null,
    });
    setCategoryName('');
    setCategorySlug('');
  }

  function submitTag() {
    if (tagName.trim().length < 2 || tagSlug.trim().length < 2) return;
    createTag.mutate({ name: tagName, slug: tagSlug });
    setTagName('');
    setTagSlug('');
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Categorias</h3>
        {categories.isLoading || !categories.data ? (
          <p className="text-sm text-muted">Carregando categorias...</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-2">Nome</th>
                <th className="py-2">Slug</th>
                <th className="py-2">Status</th>
                <th className="py-2">Ação</th>
              </tr>
            </thead>
            <tbody>
              {categories.data.map((category) => (
                <tr key={category.id} className="border-t border-surface">
                  <td className="py-2 text-ink">{category.name}</td>
                  <td className="py-2 text-ink">{category.slug}</td>
                  <td className="py-2">
                    <Badge tone={category.isActive ? 'neutral' : 'accent'}>
                      {category.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td className="py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={updateCategory.isPending}
                      onClick={() =>
                        updateCategory.mutate({ id: category.id, input: { isActive: !category.isActive } })
                      }
                    >
                      {category.isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3 flex gap-3">
          <label htmlFor="category-name" className="flex flex-1 flex-col gap-1">
            <span className="text-sm text-muted">Nome da categoria</span>
            <input
              id="category-name"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              className={inputClass}
            />
          </label>
          <label htmlFor="category-slug" className="flex flex-1 flex-col gap-1">
            <span className="text-sm text-muted">Slug da categoria</span>
            <input
              id="category-slug"
              value={categorySlug}
              onChange={(event) => setCategorySlug(event.target.value)}
              className={inputClass}
            />
          </label>
          <Button type="button" variant="accent" disabled={createCategory.isPending} onClick={submitCategory}>
            Criar categoria
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink">Tags</h3>
        {tags.isLoading || !tags.data ? (
          <p className="text-sm text-muted">Carregando tags...</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-muted">
                <th className="py-2">Nome</th>
                <th className="py-2">Slug</th>
              </tr>
            </thead>
            <tbody>
              {tags.data.map((tag) => (
                <tr key={tag.id} className="border-t border-surface">
                  <td className="py-2 text-ink">{tag.name}</td>
                  <td className="py-2 text-ink">{tag.slug}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3 flex gap-3">
          <label htmlFor="tag-name" className="flex flex-1 flex-col gap-1">
            <span className="text-sm text-muted">Nome da tag</span>
            <input
              id="tag-name"
              value={tagName}
              onChange={(event) => setTagName(event.target.value)}
              className={inputClass}
            />
          </label>
          <label htmlFor="tag-slug" className="flex flex-1 flex-col gap-1">
            <span className="text-sm text-muted">Slug da tag</span>
            <input
              id="tag-slug"
              value={tagSlug}
              onChange={(event) => setTagSlug(event.target.value)}
              className={inputClass}
            />
          </label>
          <Button type="button" variant="accent" disabled={createTag.isPending} onClick={submitTag}>
            Criar tag
          </Button>
        </div>
      </div>
    </div>
  );
}
