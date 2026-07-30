import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import { dirname, isAbsolute, join, normalize, relative, resolve } from 'path';
import {
  StorageProvider,
  StorageUploadParams,
  StorageUploadResult,
} from './storage-provider.interface';
import { checksum, publicUrl, safeFileName, safeFolder } from './storage-utils';

export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = resolve(
      config.get<string>('LOCAL_STORAGE_PATH') ?? './storage',
    );
  }

  async upload(params: StorageUploadParams): Promise<StorageUploadResult> {
    const folder = safeFolder(params.folder);
    const fileKey = `${folder}/${safeFileName(params.fileName)}`;
    const path = this.resolve(fileKey);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, params.buffer);
    return {
      fileKey,
      fileUrl: publicUrl('local://', fileKey),
      sizeBytes: params.buffer.length,
      checksum: checksum(params.buffer),
      storageProvider: 'local',
    };
  }

  async download(fileKey: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.resolve(fileKey));
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException('Stored file not found');
    }
  }

  async delete(fileKey: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(fileKey));
    } catch {
      return;
    }
  }

  private resolve(fileKey: string) {
    const path = normalize(join(this.root, fileKey));
    const relativePath = relative(this.root, path);
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new BadRequestException('Invalid file key');
    }
    return path;
  }
}
