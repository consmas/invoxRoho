import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { S3StorageProvider } from './providers/s3-storage.provider';
import {
  StorageProvider,
  StorageUploadParams,
} from './providers/storage-provider.interface';

@Injectable()
export class StorageService {
  private readonly provider: StorageProvider;
  readonly providerKey: string;

  constructor(config: ConfigService) {
    const provider = config.get<string>('STORAGE_PROVIDER') ?? 'local';
    this.providerKey = provider === 's3' ? 'digitalocean_spaces' : 'local';
    this.provider =
      provider === 's3'
        ? new S3StorageProvider(config)
        : new LocalStorageProvider(config);
  }

  upload(params: StorageUploadParams) {
    return this.provider.upload(params);
  }

  download(fileKey: string) {
    return this.provider.download(fileKey);
  }

  delete(fileKey: string) {
    return this.provider.delete(fileKey);
  }

  getSignedUrl(fileKey: string, expiresInSeconds?: number) {
    return this.provider.getSignedUrl?.(fileKey, expiresInSeconds);
  }
}
