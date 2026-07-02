export interface ImageSignature {
  mimeType: string;
  extension: string;
}

const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_MAGIC = [0x52, 0x49, 0x46, 0x46];
const WEBP_MAGIC = [0x57, 0x45, 0x42, 0x50];

function matchesAt(buffer: Buffer, offset: number, bytes: number[]): boolean {
  if (buffer.length < offset + bytes.length) {
    return false;
  }
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

export function detectImageSignature(buffer: Buffer): ImageSignature | null {
  if (matchesAt(buffer, 0, JPEG_MAGIC)) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }
  if (matchesAt(buffer, 0, PNG_MAGIC)) {
    return { mimeType: 'image/png', extension: '.png' };
  }
  if (matchesAt(buffer, 0, RIFF_MAGIC) && matchesAt(buffer, 8, WEBP_MAGIC)) {
    return { mimeType: 'image/webp', extension: '.webp' };
  }
  return null;
}
