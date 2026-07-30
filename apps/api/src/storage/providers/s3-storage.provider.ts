import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  StorageProvider,
  StorageUploadParams,
  StorageUploadResult,
} from './storage-provider.interface';
import { checksum, publicUrl, safeFileName, safeFolder } from './storage-utils';

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl?: string;
  private readonly signedUrlExpirySeconds: number;

  constructor(config: ConfigService) {
    const endpoint = config.get<string>('S3_ENDPOINT');
    const region = config.get<string>('S3_REGION');
    const bucket = config.get<string>('S3_BUCKET');
    const accessKeyId = config.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = config.get<string>('S3_SECRET_ACCESS_KEY');
    const missing = Object.entries({
      S3_ENDPOINT: endpoint,
      S3_REGION: region,
      S3_BUCKET: bucket,
      S3_ACCESS_KEY_ID: accessKeyId,
      S3_SECRET_ACCESS_KEY: secretAccessKey,
    })
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length) {
      throw new BadRequestException(
        `S3 storage is configured but missing: ${missing.join(', ')}`,
      );
    }

    const s3Config = {
      endpoint: endpoint as string,
      region: region as string,
      bucket: bucket as string,
      accessKeyId: accessKeyId as string,
      secretAccessKey: secretAccessKey as string,
    };

    this.bucket = s3Config.bucket;
    this.publicBaseUrl = config.get<string>('S3_PUBLIC_BASE_URL') || undefined;
    this.signedUrlExpirySeconds = Number(
      config.get<string>('SIGNED_URL_EXPIRY_SECONDS') ?? 300,
    );
    this.client = new S3Client({
      region: s3Config.region,
      endpoint: s3Config.endpoint,
      forcePathStyle: config.get<string>('S3_FORCE_PATH_STYLE') === 'true',
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });
  }

  async upload(params: StorageUploadParams): Promise<StorageUploadResult> {
    const folder = safeFolder(params.folder);
    const fileKey = `${folder}/${safeFileName(params.fileName)}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
        Body: params.buffer,
        ContentType: params.mimeType,
        Metadata: {
          checksum: checksum(params.buffer),
          originalFileName: params.originalFileName ?? params.fileName,
        },
      }),
    );
    return {
      fileKey,
      fileUrl: publicUrl(this.publicBaseUrl, fileKey),
      sizeBytes: params.buffer.length,
      checksum: checksum(params.buffer),
      storageProvider: 's3',
    };
  }

  async download(fileKey: string): Promise<Buffer> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: fileKey }),
      );
      if (!response.Body) {
        throw new NotFoundException('Stored file not found');
      }
      return streamToBuffer(response.Body as AsyncIterable<Uint8Array>);
    } catch (error) {
      if (error instanceof NoSuchKey) {
        throw new NotFoundException('Stored file not found');
      }
      throw new BadRequestException('Unable to download stored file');
    }
  }

  async delete(fileKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: fileKey }),
    );
  }

  getSignedUrl(fileKey: string, expiresInSeconds?: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: fileKey }),
      { expiresIn: expiresInSeconds ?? this.signedUrlExpirySeconds },
    );
  }
}

async function streamToBuffer(stream: AsyncIterable<Uint8Array>) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
