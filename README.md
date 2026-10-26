# Rozgaar Setu

A local-first job portal connecting workers and employers, starting with Bilaspur, Chhattisgarh. The interface is Hindi-friendly and focuses on nearby work rather than professional networking.

## Stack

- Client: React, TypeScript, Vite, Tailwind CSS, Lucide
- API: Node.js, Express, TypeScript, Mongoose
- Database: MongoDB

## Run locally

Requirements: Node.js 22+ and npm. MongoDB is needed for API job searches; the frontend demo can run without it.

```powershell
npm install
npm install --prefix client
npm install --prefix server
if (-not (Test-Path server/.env)) { Copy-Item .env.example server/.env }
npm run dev
```

The client runs at `http://localhost:5173` and proxies `/api` requests to `http://localhost:4000` by default. If the API `PORT` differs, set `VITE_API_PROXY_TARGET` in `client/.env.local` to the matching API URL. Set `MONGODB_URI` in `server/.env` to a running MongoDB instance. Check `/api/health` through the client proxy or directly on the API port.

Phone OTP authentication has local development support only. Set `OTP_DEV_MODE=true` in `server/.env` while developing to return the generated code to the local client. The API refuses OTP requests in production until an SMS delivery provider is configured; never enable development OTP mode in production.

Email and password authentication is available for production. Sign-up requires a valid email address, a name, an account type, and a password of at least 10 characters. Passwords are stored as salted scrypt hashes. `client/.env.production` points production builds to the deployed API; change it or set `VITE_API_BASE_URL` in the client deployment if the API host changes. Set `CLIENT_ORIGIN` in the API deployment to the exact frontend origin. Production session cookies use `SameSite=None; Secure` to support credentialed cross-origin requests.

If upgrading an existing MongoDB deployment with a non-sparse unique `phone_1` index, migrate that index once before deploying the optional phone field:

```javascript
db.users.dropIndex("phone_1")
db.users.createIndex({ phone: 1 }, { unique: true, sparse: true })
```

For local OTP testing, add `OTP_DEV_MODE=true` to `server/.env`. If your API is running on port 3000, add `VITE_API_PROXY_TARGET=http://localhost:3000` to `client/.env.local`; the Vite proxy defaults to port 4000. Register with `POST /api/auth/otp/request` using `purpose: "register"`, `phone`, `name`, and `role`, then verify at `POST /api/auth/otp/verify`. Login uses the same request endpoint with `purpose: "login"` and `phone`. Authenticated session inspection/revocation is available at `GET /api/auth/me` and `POST /api/auth/logout`. Public registration roles are worker and employer; admin accounts must be provisioned outside public signup.

## Current build

- Responsive Hindi/English job discovery page with location, category, and keyword filters.
- Sample job and worker listings for the initial Bilaspur experience.
- Job listings and job posting use MongoDB when the API and database are available; application markers remain browser-local.
- Mongoose schemas exist for users, OTP challenges, sessions, jobs, applications, and moderation events. OTP authentication routes create/find users and sessions; application and moderation schemas are not yet wired to routes.
- Email/password accounts and revocable sessions are available for production; phone OTP is limited to local development. Employer job creation requires an employer session and derives ownership from that session.
- Express health endpoint and public, paginated MongoDB job-search endpoint.
- Production SMS delivery, application workflows, and admin moderation remain unimplemented.

## Useful commands

```powershell
npm run build
npm run dev:client
npm run dev:server
```