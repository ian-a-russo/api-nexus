import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

export class InvalidUsernameException extends BadRequestException {
  constructor() {
    super(
      'Username deve ter 3-20 caracteres: letras minúsculas, números e "_".',
    );
  }
}

export class InvalidPasswordException extends BadRequestException {
  constructor() {
    super('Senha deve ter no mínimo 6 caracteres.');
  }
}

export class UsernameTakenException extends ConflictException {
  constructor(username: string) {
    super(`O @${username} já está em uso.`);
  }
}

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Usuário ou senha inválidos.');
  }
}

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super('Usuário não encontrado.');
  }
}

export class SelfInviteException extends BadRequestException {
  constructor() {
    super('Você não pode enviar um convite para si mesmo.');
  }
}

export class InviteAlreadyPendingException extends ConflictException {
  constructor() {
    super('Já existe um convite pendente entre vocês.');
  }
}

export class ConversationAlreadyExistsException extends ConflictException {
  constructor() {
    super('Vocês já têm uma conversa.');
  }
}

export class InviteNotFoundException extends NotFoundException {
  constructor() {
    super('Convite não encontrado.');
  }
}

export class InviteNotRespondableException extends ForbiddenException {
  constructor() {
    super('Você não pode responder a este convite.');
  }
}

export class ConversationNotFoundException extends NotFoundException {
  constructor() {
    super('Conversa não encontrada.');
  }
}

export class NotConversationParticipantException extends ForbiddenException {
  constructor() {
    super('Você não participa desta conversa.');
  }
}

export class EmptyMessageException extends BadRequestException {
  constructor() {
    super('A mensagem não pode ser vazia.');
  }
}

export class InvalidFileTypeException extends BadRequestException {
  constructor() {
    super('Tipo de arquivo não suportado.');
  }
}
