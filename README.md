# Advocate Desk

Client intake, today's client list, contact actions, register search, preferences, fees tracking, SMS notifications, and CSV export for a small advocate office.

## Project layout

- `mobile/`: Expo SDK 57 app for Android, iOS, and web.
- `admin/`: React + Vite + Tailwind CSS dedicated Web Admin Portal for Adv. Balasaheb Thopate (Lawyer task assignment & Day/Date/Time fees ledger).
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

### Web Admin Panel

```powershell
cd admin
npm install
npm run dev
```

The Web Admin Portal runs at `http://localhost:3000` with automatic `/api` proxying to `http://localhost:5000`.

## Quality checks

```powershell
cd backend
npm run check
npm test
npm run build
npx prisma validate

cd ../mobile
npm run check
npm run build:web

cd ../admin
npm run build
npm test
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
   INTEGRATION_ENCRYPTION_KEY=<different-random-string-at-least-32-characters>
   AUTH_TOKEN_TTL_HOURS=168
   LOGIN_RATE_LIMIT_MAX=10
   CORS_ORIGIN=https://admin.clients.example.com
   RATE_LIMIT_MAX=1000
   OFFICE_TIMEZONE_OFFSET_MINUTES=330
   VITE_API_BASE_URL=
   ```

4. Assign `https://admin.clients.example.com` to the `admin` service on internal port `4002`. Its Nginx configuration proxies `/api` to the backend service. Do not publish a host port for the admin service.
5. Assign `https://api.clients.example.com` to the `backend` service on internal port `5000` for the Android APK.
6. Keep the `database` service internal. Do not publish PostgreSQL port `5432`.
7. Enable HTTPS and deploy. Set `CORS_ORIGIN` to the exact HTTPS origin of the admin portal, without a trailing slash. Keep `VITE_API_BASE_URL` empty for the Compose deployment above.
8. Verify `https://api.clients.example.com/api/v1/health`, sign into the admin portal with the master admin account, and configure unique credentials for every junior lawyer before activating their access.
9. Use **Settings → Test Server Connection** after installing the APK.

### Deploy the admin beside existing Coolify resources

If the backend application and PostgreSQL database already exist as separate Coolify resources, keep them and add the admin as a third application from this repository. Choose the `main` branch, Dockerfile build, base directory `/admin`, Dockerfile location `Dockerfile`, and internal port `4002`. Give it its own HTTPS domain, such as `https://admin.clients.example.com`.

Set `VITE_API_BASE_URL` on the admin resource to the backend's public HTTPS origin, such as `https://api.clients.example.com`, with build-time availability enabled. Do not include `/api/v1` in this value. The admin image selects its standalone Nginx configuration when this value is set. Redeploy the admin after any change to this build-time value.

Set `CORS_ORIGIN` on the backend resource to the admin's exact HTTPS origin, without a trailing slash, and redeploy the backend. Confirm that the backend domain responds at `/api/v1/health` before signing into the admin. The existing PostgreSQL resource can be reused; do not create another database for the admin.

The Android app connects directly to the HTTPS backend. After login, it stores a time-limited signed session token; the configured password and signing secret remain only in the backend environment.

### Client notification integrations

Configure SMS, RCS, WhatsApp, and Voice Call URLs from the admin portal. The current gateway contract requires a public HTTPS URL that accepts GET requests with query parameters. Providers requiring POST requests, custom headers, or JSON bodies need a provider-specific adapter before they can be used. Saved URLs are encrypted before storage in PostgreSQL and are never returned to the browser after saving. `SMS_NOTIFICATION_URL` remains available only as an optional initial SMS bootstrap value; prefer saving a newly rotated URL from the admin portal.

URL parameters may use `{phone}`, `{name}`, `{purpose}`, and `{feesPaid}` placeholders. Provider-style sequential `[var]` placeholders are filled with client name, purpose, fees, and phone in that order. Existing `number` or `phone` parameters are replaced with the client's 10-digit number. Notifications are processed through a persistent database outbox after the client record is saved, with retries for temporary provider failures.

Only HTTPS public provider endpoints are accepted in production. Private-network and localhost destinations are blocked. The admin panel's **Send Test** action makes a real provider request or places a real call and requires confirmation. A provider-accepted request does not prove delivery to the client; confirm delivery with the provider's dashboard or callback. **Notification activity** shows recent jobs and failed attempts; an administrator can requeue failed channels. If an enquiry was saved before a channel URL was configured, use **All recent → Send missing** after adding that URL. A retry can duplicate a message or call if a provider accepted an earlier request but its response was lost.

Client intake accepts a 10-digit Indian mobile number, optionally prefixed with `91` or `+91`, so every newly saved enquiry has a number supported by the notification gateway.

### Production requirements

- Configure automatic PostgreSQL backups in Coolify/Hostinger and test a restore.
- Commit the admin portal, notification code, and Prisma migrations before deploying a Git-based Coolify resource; local uncommitted files are not available to the remote build.
- Keep the repository and all environment values private.
- Rotate `API_KEY` after any suspected server-secret exposure.
- Rotate `LOGIN_PASSWORD` and `AUTH_SECRET` after any suspected account or token exposure.
- Expose only the admin portal and backend through HTTPS; keep PostgreSQL private.
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
- Web Admin Portal provides dedicated executive controls: assign legal tasks/domains to junior advocates, view chamber fee totals (Today, This Month, All Time), track lawyer-by-lawyer collections, and inspect an audit-grade Day, Date, and Time financial ledger with CSV export and printing.
- Junior advocates are locked to their own account and assigned work in the mobile APK. Only the chamber administrator can assign a client to a different lawyer.
