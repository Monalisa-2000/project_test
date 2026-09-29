# ColdTrack

A lightweight service desk for commercial refrigeration repair businesses. ColdTrack keeps customer requests, job statuses, and follow-up dates together so the team can see who needs a call today.

## Features

- Daily follow-up list, with urgent and overdue requests surfaced first
- Job queues for quotes, approvals, scheduling, and completed work
- Search and status filtering
- Create, edit, and remove service requests
- React and Vite frontend with an Express API

## Requirements

- Node.js 18 or newer
- npm

## Run locally

Install the workspace dependencies from the repository root:

```bash
npm install
```

Start the frontend and backend in separate terminals:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173). The Vite development server proxies `/api` requests to the backend at `http://localhost:4000`.

To build the frontend and start the app through Express instead:

```bash
npm run build
npm start
```

Open [http://localhost:4000](http://localhost:4000). The build is written to the root `dist` directory.

On Windows PowerShell, use `npm.cmd` instead of `npm` if PowerShell blocks the npm script.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check that the API is running |
| `GET` | `/api/jobs` | List requests |
| `POST` | `/api/jobs` | Create a request |
| `PATCH` | `/api/jobs/:id` | Update a request |
| `DELETE` | `/api/jobs/:id` | Remove a request |

The first local API request creates `backend/data/jobs.json` with sample requests. Local changes are stored in that file.

## Deploy to Vercel

The repository includes `vercel.json` for two Vercel Services:

- `app` builds the Vite frontend and serves the root path.
- `backend` runs the Express API. Requests under `/api/*` are routed to it.

In Vercel Project Settings, set the project framework to **Services** and keep the project root at the repository root. Vercel Services must be enabled for the account or project.

The frontend and backend share the public Vercel origin, so the browser uses `/api` and no frontend service binding is needed. Local development uses the Vite proxy for the same path.

### Storage on Vercel

The Vercel backend writes its JSON data to `/tmp`, which is temporary storage for a running instance. Data can be lost when the instance restarts, and separate instances may not share it. Use a managed database or other persistent storage before relying on this deployment for durable job records.

## Project structure

```text
project/
|-- backend/       # Express API
|-- frontend/      # React and Vite app
|-- dist/          # Frontend build output
|-- package.json   # Root npm workspaces and dependencies
`-- vercel.json    # Vercel Services and routing
```
