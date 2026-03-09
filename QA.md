## QA

### Setup
1. Start MySQL: `docker compose up -d mysql`
2. Run migrations: `cd servers/curated-corpus-api && npx prisma migrate deploy`
3. Build and start: `npm run build && node dist/main.js`

All curl commands below use these headers:
```
-H 'Content-Type: application/json'
-H 'name: Test User'
-H 'username: test@test.com'
-H 'groups: mozilliansorg_pocket_scheduled_surface_curator_full'
```

### Test 1: Basic slug generation

```bash
curl -s http://localhost:4025/admin \
  -H 'Content-Type: application/json' \
  -H 'name: Test User' -H 'username: test@test.com' \
  -H 'groups: mozilliansorg_pocket_scheduled_surface_curator_full' \
  -d '{"query":"mutation($data:CreateCustomSectionInput!){createCustomSection(data:$data){externalId title}}","variables":{"data":{"title":"Venezuela Strikes: What to Know","description":"desc","startDate":"2026-03-09","scheduledSurfaceGuid":"NEW_TAB_EN_US","createSource":"MANUAL","disabled":false,"active":true}}}'
```

- [x] `externalId` is `"venezuela-strikes-what-to-know"` (colon stripped, lowercased, hyphens)

```json
{"data":{"createCustomSection":{"externalId":"venezuela-strikes-what-to-know","title":"Venezuela Strikes: What to Know"}}}
```

### Test 2: Collision suffix

Run the same curl from Test 1 two more times.

- [x] Second run: `externalId` is `"venezuela-strikes-what-to-know-2"`
- [x] Third run: `externalId` is `"venezuela-strikes-what-to-know-3"`

```json
{"data":{"createCustomSection":{"externalId":"venezuela-strikes-what-to-know-2","title":"Venezuela Strikes: What to Know"}}}
```

### Test 3: International characters (transliteration)

```bash
curl -s http://localhost:4025/admin \
  -H 'Content-Type: application/json' \
  -H 'name: Test User' -H 'username: test@test.com' \
  -H 'groups: mozilliansorg_pocket_scheduled_surface_curator_full' \
  -d '{"query":"mutation($data:CreateCustomSectionInput!){createCustomSection(data:$data){externalId title}}","variables":{"data":{"title":"Für Dich: Wissenschaft & Unterhaltung","description":"German section","startDate":"2026-03-09","scheduledSurfaceGuid":"NEW_TAB_DE_DE","createSource":"MANUAL","disabled":false,"active":true}}}'
```

- [x] `ü` → `u`, `&` → `and`, colon stripped
- [x] `externalId` is `"fur-dich-wissenschaft-and-unterhaltung"`

```json
{"data":{"createCustomSection":{"externalId":"fur-dich-wissenschaft-and-unterhaltung","title":"Für Dich: Wissenschaft & Unterhaltung"}}}
```

### Test 4: Empty slug validation

```bash
curl -s http://localhost:4025/admin \
  -H 'Content-Type: application/json' \
  -H 'name: Test User' -H 'username: test@test.com' \
  -H 'groups: mozilliansorg_pocket_scheduled_surface_curator_full' \
  -d '{"query":"mutation($data:CreateCustomSectionInput!){createCustomSection(data:$data){externalId title}}","variables":{"data":{"title":"???","description":"Should fail","startDate":"2026-03-09","scheduledSurfaceGuid":"NEW_TAB_EN_US","createSource":"MANUAL","disabled":false,"active":true}}}'
```

- [x] Returns `BAD_USER_INPUT` error
- [x] Message: `"Cannot generate a slug from the provided title. Please use a title with alphanumeric characters."`
- [x] No section created (`data: null`)

```json
{"errors":[{"message":"Cannot generate a slug from the provided title. Please use a title with alphanumeric characters.","extensions":{"code":"BAD_USER_INPUT"}}],"data":null}
```

### Test 5: Query sections

```bash
curl -s http://localhost:4025/admin \
  -H 'Content-Type: application/json' \
  -H 'name: Test User' -H 'username: test@test.com' \
  -H 'groups: mozilliansorg_pocket_scheduled_surface_curator_full' \
  -d '{"query":"query($guid:ID!){getSectionsWithSectionItems(scheduledSurfaceGuid:$guid){externalId title createSource active}}","variables":{"scheduledSurfaceGuid":"NEW_TAB_EN_US"}}'
```

- [x] All 3 Venezuela sections returned with slug-based `externalId` values

```json
{"data":{"getSectionsWithSectionItems":[{"externalId":"venezuela-strikes-what-to-know","title":"Venezuela Strikes: What to Know","createSource":"MANUAL","active":true},{"externalId":"venezuela-strikes-what-to-know-2","title":"Venezuela Strikes: What to Know","createSource":"MANUAL","active":true},{"externalId":"venezuela-strikes-what-to-know-3","title":"Venezuela Strikes: What to Know","createSource":"MANUAL","active":true}]}}
```
