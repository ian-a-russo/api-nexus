import { AttachmentType } from '@prisma/client';
import { UserSummaryDto } from '../../shared/dto/user-summary.dto';

export class MessageAttachmentDto {
  constructor(
    public readonly url: string,
    public readonly type: AttachmentType,
    public readonly mimeType: string,
    public readonly size: number,
  ) {}
}

export class MessageDto {
  constructor(
    public readonly id: string,
    public readonly conversationId: string,
    public readonly text: string | null,
    public readonly createdAt: Date,
    public readonly sender: UserSummaryDto,
    public readonly attachment: MessageAttachmentDto | null,
  ) {}
}
