import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { Client } from 'minio';

export interface UploadedObject {
  key: string;
  url: string;
}

@Injectable()
export class StorageService {
  private readonly client: Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.getOrThrow<string>('MINIO_BUCKET');
    this.publicUrl = this.configService.getOrThrow<string>('MINIO_PUBLIC_URL');
    this.client = new Client({
      endPoint: this.configService.getOrThrow<string>('MINIO_ENDPOINT'),
      port: Number(this.configService.getOrThrow<string>('MINIO_PORT')),
      useSSL:
        this.configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: this.configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: this.configService.getOrThrow<string>('MINIO_SECRET_KEY'),
    });
  }

  async upload(
    folder: string,
    buffer: Buffer,
    mimeType: string,
    extension: string,
  ): Promise<UploadedObject> {
    const key = `${folder}/${randomUUID()}${extension}`;
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
    return { key, url: `${this.publicUrl}/${key}` };
  }
}
