import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentStatus } from '@prisma/client';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { DocumentsService } from './documents/documents.service';
import { LocalStorageProvider } from './storage/providers/local-storage.provider';
import { S3StorageProvider } from './storage/providers/s3-storage.provider';

const config = (values: Record<string, string>) =>
  new ConfigService(values, { skipProcessEnv: true });

describe('Stage 8 DigitalOcean Spaces document storage', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'invox-storage-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('stores and retrieves documents with the local provider', async () => {
    const provider = new LocalStorageProvider(
      config({ LOCAL_STORAGE_PATH: tempDir }),
    );

    const stored = await provider.upload({
      buffer: Buffer.from('invoice-pdf'),
      fileName: 'invoice.pdf',
      originalFileName: 'invoice.pdf',
      mimeType: 'application/pdf',
      folder: 'invoices/inv-1',
    });

    expect(stored.storageProvider).toBe('local');
    expect(stored.fileKey).toContain('invoices/inv-1/');
    expect(stored.fileUrl).toMatch(/^local:\/\//);
    await expect(provider.download(stored.fileKey)).resolves.toEqual(
      Buffer.from('invoice-pdf'),
    );
  });

  it('rejects local storage path traversal attempts', async () => {
    const provider = new LocalStorageProvider(
      config({ LOCAL_STORAGE_PATH: tempDir }),
    );

    await expect(provider.download('../outside.pdf')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('generates signed S3-compatible URLs without making a network call', async () => {
    const provider = new S3StorageProvider(
      config({
        S3_ENDPOINT: 'https://sfo3.digitaloceanspaces.com',
        S3_REGION: 'sfo3',
        S3_BUCKET: 'invox-bucket',
        S3_ACCESS_KEY_ID: 'test-access-key',
        S3_SECRET_ACCESS_KEY: 'test-secret-key',
        S3_PUBLIC_BASE_URL: 'https://invox-bucket.sfo3.digitaloceanspaces.com',
        SIGNED_URL_EXPIRY_SECONDS: '300',
      }),
    );

    const signedUrl = await provider.getSignedUrl(
      'counterparties/cp-1/kyb.pdf',
    );

    expect(signedUrl).toContain(
      'https://invox-bucket.sfo3.digitaloceanspaces.com/counterparties/cp-1/kyb.pdf',
    );
    expect(signedUrl).toContain('X-Amz-Signature=');
  });

  it('validates upload type, size and KYC pending-verification status', async () => {
    const prisma = {
      documentRecord: {
        create: jest
          .fn()
          .mockImplementation(
            ({ data }: { data: Record<string, unknown> }) => ({
              id: 'doc-1',
              ...data,
            }),
          ),
      },
    };
    const storage = {
      providerKey: 'local',
      upload: jest.fn().mockResolvedValue({
        fileKey: 'counterparties/cp-1/file.pdf',
        fileUrl: 'local://counterparties/cp-1/file.pdf',
        sizeBytes: 10,
        checksum: 'abc123',
        storageProvider: 'local',
      }),
    };
    const audit = { log: jest.fn().mockResolvedValue({ id: 'audit-1' }) };
    const logs = { create: jest.fn().mockResolvedValue({ id: 'log-1' }) };
    const service = new DocumentsService(
      prisma as never,
      storage as never,
      audit as never,
      logs as never,
      config({
        MAX_UPLOAD_MB: '1',
        ALLOWED_UPLOAD_MIME_TYPES: 'application/pdf,image/png',
      }),
    );

    await expect(
      service.upload(
        {
          buffer: Buffer.from('bad'),
          originalname: 'bad.exe',
          mimetype: 'application/x-msdownload',
        },
        { documentType: 'KYC_ID', title: 'ID' },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.upload(
        {
          buffer: Buffer.alloc(2 * 1024 * 1024),
          originalname: 'large.pdf',
          mimetype: 'application/pdf',
        },
        { documentType: 'KYC_ID', title: 'ID' },
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const row = await service.upload(
      {
        buffer: Buffer.from('ok'),
        originalname: 'kyc.pdf',
        mimetype: 'application/pdf',
      },
      { counterpartyId: 'cp-1', documentType: 'KYC_ID', title: 'ID' },
      'user-1',
    );

    expect(row.status).toBe(DocumentStatus.PENDING_VERIFICATION);
    expect(storage.upload).toHaveBeenCalledWith(
      expect.objectContaining({ folder: 'counterparties/cp-1' }),
    );
    expect(logs.create).toHaveBeenCalledWith(
      expect.objectContaining({
        providerType: 'STORAGE',
        operation: 'storage.upload',
        status: 'SUCCESS',
      }),
    );
  });
});
