import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UserSummaryDto } from '../shared/dto/user-summary.dto';
import { MediaUploadResult, UploadsService } from './uploads.service';

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const MEDIA_MAX_BYTES = 50 * 1024 * 1024;

@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: AVATAR_MAX_BYTES } }))
  uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserSummaryDto> {
    this.ensureFilePresent(file);
    return this.uploadsService.uploadAvatar(currentUser.id, file);
  }

  @Post('media')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MEDIA_MAX_BYTES } }))
  uploadMedia(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<MediaUploadResult> {
    this.ensureFilePresent(file);
    return this.uploadsService.uploadMedia(currentUser.id, file);
  }

  private ensureFilePresent(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado.');
    }
  }
}
