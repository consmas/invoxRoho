import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';

export function checksum(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function safeFolder(folder?: string) {
  return (folder?.trim() || 'general')
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9/_-]/g, '_')
    .replace(/^\/+|\/+$/g, '');
}

export function safeFileName(fileName: string) {
  const base = fileName.split(/[\\/]/).pop() ?? 'document';
  const extension = extname(base)
    .replace(/[^a-zA-Z0-9.]/g, '')
    .slice(0, 16);
  const stem = base
    .slice(0, extension ? -extension.length : undefined)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(0, 120);
  return `${Date.now()}-${randomUUID()}-${stem || 'document'}${extension}`;
}

export function publicUrl(baseUrl: string | undefined, fileKey: string) {
  if (!baseUrl) return undefined;
  if (baseUrl === 'local://') return `local://${fileKey}`;
  return `${baseUrl.replace(/\/+$/g, '')}/${fileKey
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')}`;
}
