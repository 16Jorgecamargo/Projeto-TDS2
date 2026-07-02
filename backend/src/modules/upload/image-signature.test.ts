import { describe, it, expect } from 'vitest';
import { detectImageSignature } from './image-signature.js';

describe('detectImageSignature', () => {
  it('detecta JPEG pelos magic bytes', () => {
    const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(detectImageSignature(buffer)).toEqual({ mimeType: 'image/jpeg', extension: '.jpg' });
  });

  it('detecta PNG pelos magic bytes', () => {
    const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(detectImageSignature(buffer)).toEqual({ mimeType: 'image/png', extension: '.png' });
  });

  it('detecta WEBP pelos magic bytes', () => {
    const buffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectImageSignature(buffer)).toEqual({ mimeType: 'image/webp', extension: '.webp' });
  });

  it('retorna null para conteudo nao reconhecido', () => {
    const buffer = Buffer.from('isto e um arquivo de texto qualquer');
    expect(detectImageSignature(buffer)).toBeNull();
  });

  it('retorna null para buffer vazio', () => {
    expect(detectImageSignature(Buffer.alloc(0))).toBeNull();
  });

  it('nao confunde um RIFF sem marcador WEBP', () => {
    const buffer = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20]);
    expect(detectImageSignature(buffer)).toBeNull();
  });
});
