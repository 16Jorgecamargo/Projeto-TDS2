import { useState, type JSX } from 'react';
import { Eye, Trash2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';

export interface PhotoGalleryProps {
  images: string[];
  onRemove: (url: string) => void;
}

export function PhotoGallery({ images, onRemove }: PhotoGalleryProps): JSX.Element | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <ul className="flex flex-wrap gap-2">
        {images.map((url) => (
          <li key={url} className="group relative h-16 w-16">
            <img src={url} alt="Foto da demanda" className="h-16 w-16 rounded-md object-cover" />
            <div className="absolute inset-0 hidden items-center justify-center gap-1 rounded-md bg-black/50 group-hover:flex">
              <button
                type="button"
                onClick={() => setPreviewUrl(url)}
                aria-label="Ver foto"
                className="rounded-full bg-white/90 p-1 text-ink hover:bg-white"
              >
                <Eye size={16} />
              </button>
              <button
                type="button"
                onClick={() => onRemove(url)}
                aria-label="Remover foto"
                className="rounded-full bg-white/90 p-1 text-danger hover:bg-white"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Modal
        open={previewUrl !== null}
        onClose={() => setPreviewUrl(null)}
        title="Pré-visualização da foto"
        size="md"
      >
        {previewUrl && (
          <img src={previewUrl} alt="Pré-visualização da foto" className="w-full rounded-md object-contain" />
        )}
      </Modal>
    </>
  );
}
