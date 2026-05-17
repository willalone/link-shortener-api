# Миграции

```bash
docker compose up -d postgres redis
npm run db:migrate:deploy
npm run db:seed
```

Миграция `20250517120000_tz_alignment` переименовывает `alias` → `shortCode`, добавляет `isActive`, `UserRole`, `clickedAt`.

```bash
npx prisma migrate status
```
