# Link Shortener API

Сокращение URL с редиректом, кешем в Redis, асинхронной записью кликов (BullMQ), GeoIP, статистикой и QR.

## Стек

Node.js 20 · TypeScript · Express · Prisma · PostgreSQL · Redis · BullMQ · JWT · Zod · geoip-lite · qrcode · Vitest · OpenAPI · Docker

## Быстрый старт

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run db:migrate:deploy
npm run db:seed
npm run dev
npm run worker
```

- Swagger: http://localhost:3001/api-docs  
- Редирект: `GET /api/v1/redirect/{shortCode}` → 302  
- После seed: http://localhost:3001/api/v1/redirect/demo

## Seed-аккаунты

| Email | Пароль | Роль |
|-------|--------|------|
| admin@shortener.dev | Password123! | ADMIN |
| user@shortener.dev | Password123! | USER |

## API (основное)

- `POST /api/v1/links` — создание (`customAlias`, иначе nanoid 6)
- `GET /api/v1/links/:shortCode` — публичная карточка
- `GET /api/v1/redirect/:shortCode` — редирект + счётчик кликов
- `GET /api/v1/users/me/links`
- `PATCH|DELETE /api/v1/links/:shortCode`
- `GET /api/v1/links/:shortCode/stats`, `.../stats/export?format=csv`
- `GET /api/v1/qr/:shortCode?format=png|svg`
- `GET /api/v1/admin/links`, `PATCH /api/v1/admin/links/:shortCode/block`, `PATCH .../unblock`, `POST /api/v1/admin/links/check`

Кеш редиректа: `CACHE_TTL_SECONDS` (по умолчанию 300). Rate limit на создание ссылок — по IP.

## Структура

```
src/
├── modules/          # auth, users, links (+ redirect, qr), analytics, admin, queue
├── shared/
├── routes/v1/
└── app.ts
```

Миграции: [docs/MIGRATIONS.md](docs/MIGRATIONS.md)

## Скрипты

`npm test` · `npm run lint` · `npm run format` · `npm run openapi:validate`

Интеграционные тесты: `RUN_INTEGRATION=true npm test`

## Docker

```bash
docker compose up --build
```

MIT
