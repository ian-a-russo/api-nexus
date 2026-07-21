import { IsString, MinLength } from 'class-validator';

export class SendInviteDto {
  @IsString()
  @MinLength(1)
  username: string;
}
