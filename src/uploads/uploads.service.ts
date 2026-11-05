import { Injectable } from '@nestjs/common';
import { AttachmentType } from '@prisma/client';
import { UserSummaryDto } from '../shared/dto/user-summary.dto';
import { InvalidFileTypeException } from '../shared/exceptions/domain.exceptions';
import { StorageService } from '../storage/storage.service';
import { UsersRepository } from '../users/users.repository';

const AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MEDIA_MIME_TYPES = [
  ...AVATAR_MIME_TYPES,
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface MediaUploadResult {
  url: string;
  type: AttachmentType;
  mimeType: string;
  size: number;
}

@Injectable()
export class UploadsService {
  constructor(
    private readonly storageService: StorageService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async uploadAvatar(
    userId: string,
    file: UploadedFile,
  ): Promise<UserSummaryDto> {
    this.ensureAllowed(file.mimetype, AVATAR_MIME_TYPES);
    const { url } = await this.storageService.upload(
      `avatars/${userId}`,
      file.buffer,
      file.mimetype,
      this.extensionFor(file),
    );
    const user = await this.usersRepository.updateAvatar(userId, url);
    return UserSummaryDto.from(user);
  }

  async uploadMedia(
    userId: string,
    file: UploadedFile,
  ): Promise<MediaUploadResult> {
    this.ensureAllowed(file.mimetype, MEDIA_MIME_TYPES);
    const { url } = await this.storageService.upload(
      `media/${userId}`,
      file.buffer,
      file.mimetype,
      this.extensionFor(file),
    );
    return {
      url,
      type: file.mimetype.startsWith('video/')
        ? AttachmentType.VIDEO
        : AttachmentType.IMAGE,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  private ensureAllowed(mimetype: string, allowed: string[]): void {
    if (!allowed.includes(mimetype)) {
      throw new InvalidFileTypeException();
    }
  }

  private extensionFor(file: UploadedFile): string {
    const fromName = file.originalname.includes('.')
      ? `.${file.originalname.split('.').pop()}`
      : '';
    return fromName || `.${file.mimetype.split('/').pop()}`;
  }
}
