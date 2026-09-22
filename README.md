# Advocate Desk

Client intake, today's client list, contact actions, register search, preferences, fees tracking, SMS notifications, and CSV export for a small advocate office.

## Project layout

- `mobile/`: Expo SDK 57 app for Android, iOS, and web.
- `backend/`: Express + TypeScript API.
- `backend/prisma/`: PostgreSQL schema and production migrations.
- `docker-compose.yml`: PostgreSQL, API, and web containers for Coolify.

## Local development

### Backend

```powershell
cd backend
npm install
npm run dev
```

Without `DATABASE_URL`, development uses `backend/data/store.json`. Production refuses this fallback.

### Expo app

```powershell
cd mobile
npm install
$env:EXPO_PUBLIC_API_URL='http://localhost:5000/api/v1'
npx expo start
```

For a physical Expo device, replace `localhost` with the development computer's LAN address. Android Emulator defaults to `http://10.0.2.2:5000/api/v1` when the variable is omitted.

## Quality checks

```powershell
cd backend
npm run check
npm run build
npx prisma validate

cd ../mobile
npm run check
npm run build:web
```

## Deploy to Hostinger with Coolify

Use the root `docker-compose.yml` as one Coolify Docker Compose resource.

1. Put the project in a private Git repository.
2. Create the Compose resource in Coolify.
3. Configure:

   ```env
   POSTGRES_PASSWORD=<long-random-url-safe-database-password>
   API_KEY=<different-random-url-safe-value-at-least-24-characters>
   LOGIN_USERNAME=<office-login-name>
   LOGIN_PASSWORD=<strong-private-password>
   AUTH_SECRET=<random-string-at-least-32-characters>
   AUTH_TOKEN_TTL_HOURS=168
   LOGIN_RATE_LIMIT_MAX=10
   CORS_ORIGIN=
   RATE_LIMIT_MAX=1000
   OFFICE_TIMEZONE_OFFSET_MINUTES=330
   ```

4. Assign `https://api.clients.example.com` to the `backend` service on internal port `5000`.
5. Keep the `database` service internal. Do not publish PostgreSQL port `5432`.
6. Enable HTTPS and deploy.
7. Verify `https://api.clients.example.com/api/v1/health`, then use **Settings → Test Server Connection** after installing the APK.

The Android app connects directly to the HTTPS backend. After login, it stores a time-limited signed session token; the configured password and signing secret remain only in the backend environment.

### Optional client SMS notification

New-client SMS notifications are sent only by the backend so the provider key never enters the APK. Keep `SMS_NOTIFICATION_URL` empty to disable SMS. To enable it, paste the complete approved provider URL into this single backend environment variable. The backend automatically replaces an existing `number` or `phone` query parameter with the new client's 10-digit mobile number.

URL parameters may use `{phone}`, `{name}`, `{purpose}`, and `{feesPaid}` placeholders. Use placeholders only when they comply with the approved provider template. If the provider is unavailable, the client record is still saved and the failure is logged without exposing the full mobile number or complete URL.

### Production requirements

- Configure automatic PostgreSQL backups in Coolify/Hostinger and test a restore.
- Keep the repository and all environment values private.
- Rotate `API_KEY` after any suspected server-secret exposure.
- Rotate `LOGIN_PASSWORD` and `AUTH_SECRET` after any suspected account or token exposure.
- Expose only the backend through HTTPS; keep PostgreSQL private.
- Client records cannot be deleted through the app or API; database backups remain the disaster-recovery mechanism.

## Build an Android APK later

Use the hosted HTTPS domain as the API endpoint. Configure it as the EAS `preview` environment variable before starting the installable APK build:

```powershell
cd mobile
npx eas-cli login
npx eas-cli env:set --name EXPO_PUBLIC_API_URL --value https://api.clients.example.com/api/v1 --environment preview --visibility plaintext
npx eas-cli env:set --name EXPO_PUBLIC_DEFAULT_COUNTRY_CODE --value 91 --environment preview --visibility plaintext
npm run build:apk
```

The `preview` profile in `mobile/eas.json` produces an installable release APK. Do not set `EXPO_PUBLIC_API_KEY`; authentication uses the signed login session.

## Important behavior

- Arrival times and Today/Month/Year boundaries are assigned by the server using the configured office timezone offset, not device clocks.
- Lobby data refreshes every 10 seconds; register and detail data refresh every 15 seconds while visible.
- Register search and date filtering are paginated on the server.
- CSV exports stream from the server instead of loading the complete register into app memory.
- Fees paid are recorded with each new client and included in client details and CSV exports.
