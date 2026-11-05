import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { UserSummaryDto } from '../shared/dto/user-summary.dto';
import {
  InvalidCredentialsException,
  UsernameTakenException,
} from '../shared/exceptions/domain.exceptions';
import { Password } from '../shared/value-objects/password.vo';
import { Username } from '../shared/value-objects/username.vo';
import { UsersRepository } from '../users/users.repository';
import { AuthResultDto } from './dto/auth-result.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResultDto> {
    const username = new Username(dto.username);
    await this.ensureUsernameIsFree(username);
    const password = new Password(dto.password);

    const user = await this.usersRepository.create({
      username: username.toString(),
      displayName: dto.displayName.trim(),
      passwordHash: await this.hash(password),
    });

    return this.buildAuthResult(user);
  }

  async login(dto: LoginDto): Promise<AuthResultDto> {
    const user = await this.usersRepository.findByUsername(
      Username.normalize(dto.username),
    );
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new InvalidCredentialsException();
    }

    return this.buildAuthResult(user);
  }

  private async ensureUsernameIsFree(username: Username): Promise<void> {
    const existing = await this.usersRepository.findByUsername(
      username.toString(),
    );
    if (existing) {
      throw new UsernameTakenException(username.toString());
    }
  }

  private hash(password: Password): Promise<string> {
    return bcrypt.hash(password.toString(), SALT_ROUNDS);
  }

  private buildAuthResult(user: User): AuthResultDto {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });
    return new AuthResultDto(accessToken, UserSummaryDto.from(user));
  }
}
