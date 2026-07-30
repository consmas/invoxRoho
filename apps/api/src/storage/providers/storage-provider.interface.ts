export interface StorageUploadParams {
  buffer: Buffer;
  fileName: string;
  originalFileName?: string;
  mimeType?: string;
  folder?: string;
}

export interface StorageUploadResult {
  fileKey: string;
  fileUrl?: string;
  sizeBytes: number;
  checksum: string;
  storageProvider: string;
}

export interface StorageProvider {
  upload(params: StorageUploadParams): Promise<StorageUploadResult>;
  download(fileKey: string): Promise<Buffer>;
  delete(fileKey: string): Promise<void>;
  getSignedUrl?(fileKey: string, expiresInSeconds?: number): Promise<string>;
}
