import { IsString, Length, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(3, 20)
  username!: string;

  @IsString()
  @MinLength(1)
  displayName!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
