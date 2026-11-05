import { AttachmentType } from '@prisma/client';
import { makeUser } from '../../test/support/factories';
import { InvalidFileTypeException } from '../shared/exceptions/domain.exceptions';
import { StorageService } from '../storage/storage.service';
import { UsersRepository } from '../users/users.repository';
import { UploadedFile, UploadsService } from './uploads.service';

function makeFile(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    buffer: Buffer.from('data'),
    mimetype: 'image/png',
    originalname: 'photo.png',
    size: 4,
    ...overrides,
  };
}

describe('UploadsService', () => {
  let storageService: jest.Mocked<Pick<StorageService, 'upload'>>;
  let usersRepository: jest.Mocked<Pick<UsersRepository, 'updateAvatar'>>;
  let service: UploadsService;

  beforeEach(() => {
    storageService = {
      upload: jest.fn().mockResolvedValue({ key: 'k', url: 'http://cdn/k' }),
    };
    usersRepository = { updateAvatar: jest.fn() };
    service = new UploadsService(
      storageService as unknown as StorageService,
      usersRepository as unknown as UsersRepository,
    );
  });

  describe('uploadAvatar', () => {
    it('envia ao storage e atualiza o avatar do usuário', async () => {
      usersRepository.updateAvatar.mockResolvedValue(
        makeUser({ avatarUrl: 'http://cdn/k' }),
      );

      const result = await service.uploadAvatar('user-1', makeFile());

      expect(storageService.upload).toHaveBeenCalledWith(
        'avatars/user-1',
        expect.any(Buffer),
        'image/png',
        '.png',
      );
      expect(usersRepository.updateAvatar).toHaveBeenCalledWith(
        'user-1',
        'http://cdn/k',
      );
      expect(result.avatarUrl).toBe('http://cdn/k');
    });

    it('não aceita vídeo como avatar', async () => {
      await expect(
        service.uploadAvatar('user-1', makeFile({ mimetype: 'video/mp4' })),
      ).rejects.toThrow(InvalidFileTypeException);
      expect(storageService.upload).not.toHaveBeenCalled();
    });
  });

  describe('uploadMedia', () => {
    it('classifica imagem e vídeo corretamente', async () => {
      const image = await service.uploadMedia('user-1', makeFile());
      const video = await service.uploadMedia(
        'user-1',
        makeFile({ mimetype: 'video/mp4', originalname: 'clip.mp4' }),
      );

      expect(image.type).toBe(AttachmentType.IMAGE);
      expect(video.type).toBe(AttachmentType.VIDEO);
    });

    it('deriva a extensão do mimetype quando o nome não tem extensão', async () => {
      await service.uploadMedia('user-1', makeFile({ originalname: 'foto' }));

      expect(storageService.upload).toHaveBeenCalledWith(
        'media/user-1',
        expect.any(Buffer),
        'image/png',
        '.png',
      );
    });

    it('rejeita tipos fora da lista permitida', async () => {
      await expect(
        service.uploadMedia(
          'user-1',
          makeFile({ mimetype: 'application/pdf' }),
        ),
      ).rejects.toThrow(InvalidFileTypeException);
    });
  });
});
