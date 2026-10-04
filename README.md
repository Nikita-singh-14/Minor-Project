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
Copy-Item .env.example .env
npm run dev
```

The client runs at `http://localhost:5173` and proxies `/api` requests to the API at `http://localhost:4000`. Set `MONGODB_URI` in `.env` to a running MongoDB instance. Check `GET /api/health` to see API and database status.

## Current build

- Responsive Hindi/English job discovery page with location, category, and keyword filters.
- Sample job and worker listings for the initial Bilaspur experience.
- Demo-only job posting and application interactions; they are not yet stored in MongoDB.
- Express health endpoint and public, paginated MongoDB job-search endpoint.
- Authentication, role authorization, worker/employer dashboards, job persistence workflows, and admin moderation are the next implementation phases.

## Useful commands

```powershell
npm run build
npm run dev:client
npm run dev:server
```