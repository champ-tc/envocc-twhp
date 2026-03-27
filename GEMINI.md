# GEMINI.md - Project Context

## Project Overview
This project, **twhp** (Workplace Health Promotion - สถานประกอบการ ปลอดโรค ปลอดภัย กายใจเป็นสุข), is a web application developed for the Thai Department of Disease Control (DDC), Ministry of Public Health. It serves as a platform for factories and workplaces to assess and promote health and safety.

The project is structured as a **Next.js** frontend that communicates with a separate **backend API**.

### Core Technologies
- **Frontend Framework:** [Next.js](https://nextjs.org/) (version 15+) using the **App Router**.
- **Language:** [TypeScript](https://www.typescriptlang.org/).
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (version 4).
- **Icons:** [Lucide React](https://lucide.dev/).
- **Deployment:** [Docker](https://www.docker.com/) and [Nginx](https://www.nginx.com/) as a reverse proxy with SSL termination.
- **Authentication:** Session-based, managed by the backend API and proxied through Next.js API routes.

### Architecture
- **App Router:** Routes are defined in `twhp/src/app`.
  - `/admins`: Dashboard and management for DOED admins, evaluators, and provincial officers.
  - `/factories`: Main dashboard and assessment forms for workplace users.
  - `/api`: Next.js Route Handlers that proxy requests to the backend API (`API_BASE_URL`).
- **Authentication Flow:**
  - Login via `/api/auth/login` which calls the backend and forwards session cookies.
  - Session verification via `/api/auth/authentication`.
  - Role-based landing pages and access control defined in `src/lib/role-redirect.ts`.
- **UI Components:** Reusable components are located in `twhp/src/components`.

---

## Building and Running

### Prerequisites
- Node.js (Latest LTS recommended)
- Docker and Docker Compose (for containerized deployment)

### Local Development
1. Navigate to the `twhp` directory.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env` (refer to `.env.templant`):
   ```bash
   API_BASE_URL=http://your-backend-api:8888/twhp/api
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Access the app at `http://localhost:3000`.

### Production Build
1. Build the application:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm run start
   ```

### Docker Deployment
1. From the root directory:
   ```bash
   docker compose up -d --build
   ```
   This will start the `nextjs-app` and `nginx-ssl` containers.

---

## Development Conventions

- **File Naming:** Use `kebab-case` for directories and files, except for React components which use `PascalCase`.
- **Typing:** Ensure all data structures, especially those from the API, are properly typed in TypeScript.
- **Routing:** Use Next.js App Router conventions (e.g., `page.tsx`, `layout.tsx`, `route.ts`).
- **Styling:** Use Tailwind CSS utility classes. Custom styles should be added to `twhp/src/app/globals.css`.
- **Authentication:** Always use the proxied API routes under `/api/auth` to ensure cookies are handled correctly.
- **Roles:** The system supports `DOED`, `Evaluator`, `Provincial`, `ODPC`, and `Factory` roles. Check `src/lib/auth-utils.ts` for normalization.

---

## Key Directories
- `twhp/src/app`: Application routes and API handlers.
- `twhp/src/components`: Shared React components.
- `twhp/src/lib`: Core logic, authentication utilities, and constants.
- `twhp/src/utils`: Data fetching and manipulation helpers.
- `twhp/public`: Static assets (images, fonts, data).
- `nginx/`: Nginx configuration and SSL certificates.
- `docker-compose.yml`: Orchestration for the frontend and proxy.
