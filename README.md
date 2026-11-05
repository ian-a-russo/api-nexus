# api-chat

[![CI](https://github.com/ian-a-russo/api-chat/actions/workflows/ci.yml/badge.svg)](https://github.com/ian-a-russo/api-chat/actions/workflows/ci.yml)

API de um chat em tempo real com conversas privadas por convite, presença online, indicador de "digitando" e envio de imagens e vídeos. O front-end está em [spa-chat](https://github.com/ian-a-russo/spa-chat).

## Funcionalidades

- Cadastro e login com JWT (senhas com bcrypt).
- Busca de usuários por username e **convite** para iniciar uma conversa. A conversa só existe depois que o convidado aceita.
- Mensagens em tempo real via WebSocket, com histórico paginado por cursor.
- Presença online/offline e indicador de digitação.
- Upload de avatar e de anexos (imagem e vídeo) para armazenamento compatível com S3.

## Stack

| Camada         | Tecnologia                                            |
| -------------- | ----------------------------------------------------- |
| Framework      | NestJS 11, TypeScript em modo `strict`                |
| Tempo real     | Socket.IO (`@nestjs/websockets`)                      |
| Banco de dados | PostgreSQL 16 + Prisma 7                              |
| Autenticação   | Passport JWT, bcrypt                                  |
| Armazenamento  | Cliente MinIO (qualquer storage compatível com S3)    |
| Qualidade      | Jest, ESLint (type-checked), Prettier, GitHub Actions |

## Arquitetura

Cada módulo segue as mesmas camadas, com dependências apontando para dentro:

```
Controller / Gateway  →  Service (regra de negócio)  →  Repository (Prisma)
```

- **Services** concentram as regras e não conhecem HTTP nem Socket.IO. Dependem apenas de repositórios e de outros services.
- **Repositories** são o único ponto de acesso ao Prisma, o que permite testar os services com dependências simuladas.
- **Eventos de domínio** desacoplam a regra de negócio da entrega em tempo real. O `InvitesService` e o `MessagesService` emitem `invite.*` e `message.created` com o `EventEmitter2`, e o `ChatGateway` os traduz em eventos de WebSocket. Os services não conhecem o socket.
- **Value objects** (`Username`, `Password`) garantem as invariantes de entrada em um lugar só.
- **Exceções de domínio** (`shared/exceptions`) carregam o status HTTP e a mensagem, sem `if` espalhado nos controllers.
- **DTOs imutáveis** na saída; a conversão de entidade para DTO fica em fábricas estáticas (`UserSummaryDto.from`).

```
src/
├── auth/            JWT, guards (HTTP e WebSocket), registro e login
├── users/           busca de usuários
├── invites/         envio, listagem, aceite e recusa de convites
├── conversations/   conversas e resumo para a lista lateral
├── messages/        envio e histórico paginado
├── chat/            gateway Socket.IO e registro de conexões (presença)
├── uploads/         validação de arquivos e upload de avatar/mídia
├── storage/         adaptador do storage S3
├── prisma/          PrismaService
└── shared/          DTOs, eventos, exceções, value objects e config de CORS
```

## Como rodar

Pré-requisitos: Node 22+, Docker.

```bash
cp .env.example .env
docker compose up -d
npm install
npx prisma migrate deploy
npm run start:dev
```

A API sobe em `http://localhost:3000`. O Postgres expõe a porta `5433` e o storage a `9000` (console em `9001`).

O bucket definido em `MINIO_BUCKET` precisa existir e ter leitura pública, já que `MINIO_PUBLIC_URL` é usada nas URLs devolvidas ao cliente.

### Variáveis de ambiente

| Variável                               | Descrição                              |
| -------------------------------------- | -------------------------------------- |
| `DATABASE_URL`                         | String de conexão do PostgreSQL        |
| `JWT_SECRET`, `JWT_EXPIRES_IN`         | Segredo e validade do token            |
| `PORT`                                 | Porta HTTP (padrão `3000`)             |
| `CORS_ORIGIN`                          | Origem permitida para HTTP e WebSocket |
| `MINIO_ENDPOINT`, `MINIO_PORT`         | Endereço do storage                    |
| `MINIO_USE_SSL`                        | `true` para HTTPS                      |
| `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` | Credenciais do storage                 |
| `MINIO_BUCKET`, `MINIO_PUBLIC_URL`     | Bucket e URL pública dos arquivos      |

## Scripts

| Comando              | O que faz                   |
| -------------------- | --------------------------- |
| `npm run start:dev`  | Servidor em modo watch      |
| `npm run build`      | Compila para `dist/`        |
| `npm run lint:check` | ESLint sem alterar arquivos |
| `npm run typecheck`  | `tsc --noEmit`              |
| `npm test`           | Testes unitários            |
| `npm run test:e2e`   | Testes e2e                  |
| `npm run test:cov`   | Cobertura                   |

Os testes unitários cobrem as regras de negócio (autenticação, convites, mensagens, conversas e uploads), os value objects e o registro de presença, sempre com os repositórios simulados. Não dependem de banco nem de rede.

## Referência da API

Todas as rotas, exceto `/auth/*` e `/health`, exigem `Authorization: Bearer <token>`.

| Método | Rota                          | Descrição                                   |
| ------ | ----------------------------- | ------------------------------------------- |
| GET    | `/health`                     | Verificação de saúde                        |
| POST   | `/auth/register`              | Cria a conta e devolve o token              |
| POST   | `/auth/login`                 | Autentica e devolve o token                 |
| GET    | `/users/search?q=`            | Busca usuários pelo prefixo do username     |
| POST   | `/invites`                    | Envia um convite (`{ username }`)           |
| GET    | `/invites`                    | Lista os convites pendentes recebidos       |
| POST   | `/invites/:id/accept`         | Aceita o convite e cria a conversa          |
| POST   | `/invites/:id/reject`         | Recusa o convite                            |
| GET    | `/conversations`              | Lista as conversas do usuário               |
| GET    | `/conversations/:id/messages` | Histórico (`limit` e `before` para paginar) |
| POST   | `/uploads/avatar`             | Envia o avatar (`multipart`, campo `file`)  |
| POST   | `/uploads/media`              | Envia uma imagem ou vídeo para anexar       |

### Eventos WebSocket

A conexão autentica com `auth: { token }` no handshake do Socket.IO.

| Direção          | Evento                                             | Payload                                  |
| ---------------- | -------------------------------------------------- | ---------------------------------------- |
| cliente → server | `message:send`                                     | `{ conversationId, text?, attachment? }` |
| cliente → server | `typing:start`, `typing:stop`                      | `{ conversationId }`                     |
| server → cliente | `message:new`                                      | mensagem criada                          |
| server → cliente | `invite:new`, `invite:accepted`, `invite:rejected` | convite ou resumo da conversa            |
| server → cliente | `presence:online`, `presence:offline`              | `{ userId }`                             |
| server → cliente | `typing:start`, `typing:stop`                      | `{ conversationId, userId }`             |
