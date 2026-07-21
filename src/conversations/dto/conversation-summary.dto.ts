import { AttachmentType } from '@prisma/client';
import { UserSummaryDto } from '../../shared/dto/user-summary.dto';

export class LastMessagePreviewDto {
  constructor(
    public readonly text: string | null,
    public readonly senderId: string,
    public readonly createdAt: Date,
    public readonly attachmentType: AttachmentType | null,
  ) {}
}

export class ConversationSummaryDto {
  constructor(
    public readonly id: string,
    public readonly participant: UserSummaryDto,
    public readonly lastMessage: LastMessagePreviewDto | null,
    public readonly createdAt: Date,
  ) {}
}
