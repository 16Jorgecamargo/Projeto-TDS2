import { useEffect, useRef, useState, type ChangeEvent, type JSX } from 'react';
import { uploadImage, type UploadResult } from '../../features/uploads/api';
import { useToast } from './Toast';
import { Skeleton } from './Skeleton';
import { cn } from '../../lib/utils';

export interface ImageUploadProps {
  onUploaded: (result: UploadResult) => void;
  label?: string;
  className?: string;
}

const ACCEPTED_MIME = 'image/jpeg,image/png,image/webp';

export function ImageUpload({ onUploaded, label = 'Enviar imagem', className }: ImageUploadProps): JSX.Element {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
    const localPreview = URL.createObjectURL(file);
    previewRef.current = localPreview;
    setPreview(localPreview);
    setUploading(true);

    try {
      const result = await uploadImage(file);
      onUploaded(result);
    } catch {
      toast('Falha ao enviar imagem', 'error');
      setPreview(null);
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-sm border border-surface px-3 py-2 text-sm font-semibold text-ink hover:border-primary">
        {label}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIME}
          onChange={handleChange}
          className="sr-only"
          aria-label={label}
        />
      </label>
      {uploading && <Skeleton className="h-24 w-24" aria-label="Enviando imagem" />}
      {!uploading && preview && (
        <img
          src={preview}
          alt="Pre-visualizacao da imagem enviada"
          className="h-24 w-24 rounded-md object-cover"
        />
      )}
    </div>
  );
}
