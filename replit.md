# Mastery — Student Performance Tracking SaaS

## Overview

Mastery is a school-focused web application for tracking student performance across lessons and learning outcomes. It calculates mastery using weighted and recency-based scoring, generates PDF reports, and supports sharing via WhatsApp. The primary launch market is Ghana, so the app is designed to be mobile-first, high-contrast, and WhatsApp-friendly.

Core features:
- **Authentication** via Replit Auth (OpenID Connect)
- **Multi-user Roles** — Admin, School Head, Teacher, Student; invitation-based onboarding
- **School Setup** — first-time modal to create a school; role badge + school name shown in sidebar
- **Class & Student Management** — create classes, add students with parent contact info
- **Academic Structure** — academic years → terms → weeks → lessons → learning outcomes
- **Assessments & Scoring** — create assessments (classwork, quiz, test, project) linked to lessons, enter student scores
- **Mastery Calculation** — weighted and recency-based scoring with mastery bands and trend indicators
- **PDF Reports** — server-side PDF generation via PDFKit for student and class reports. Restructured layout: teal/gold header with school branding, mastery band progress bar, lesson/outcome tables with color-coded scores, strengths/needs-support side-by-side panels, insights box, and signed footer.
- **WhatsApp Sharing** — share report links with parents via `wa.me` links
- **Settings** — school name configuration for branding on reports

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state; local component state via React hooks
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming. Custom color palette: deep teal primary (`#0F4C5C`) and vivid gold accent (`#F4A300`)
- **Build Tool**: Vite with React plugin
- **Path Aliases**: `@/` → `client/src/`, `@shared/` → `shared/`
- **Fonts**: Outfit (display), DM Sans (body), Fira Code (mono) via Google Fonts

### Backend
- **Runtime**: Node.js with Express
- **Language**: TypeScript, executed via `tsx` in development
- **API Pattern**: RESTful JSON API under `/api/` prefix. Route definitions are shared between client and server in `shared/routes.ts` with Zod schemas for validation
- **PDF Generation**: PDFKit for server-side PDF report creation
- **Build**: esbuild bundles server code to `dist/index.cjs` for production; Vite builds client to `dist/public/`

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with `drizzle-zod` for schema-to-validation integration
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `drizzle-kit push` command
- **Key Tables**: `classes`, `students`, `academic_years`, `terms`, `weeks`, `lessons`, `outcomes`, `assessments`, `student_scores`, `settings`, `sessions`, `users`, `schools`, `school_members`, `invitations`
- **Session Store**: `connect-pg-simple` storing sessions in the `sessions` PostgreSQL table

### Authentication & Multi-user Roles
- **Method**: Replit Auth via OpenID Connect (OIDC)
- **Implementation**: Passport.js with `openid-client` strategy
- **Session**: Express session with PostgreSQL-backed store (`connect-pg-simple`)
- **Auth Flow**: `/api/login` → OIDC redirect → callback → session created. `/api/auth/user` returns current user. `/api/logout` destroys session
- **Middleware**: `isAuthenticated` middleware protects API routes; teacher ID extracted from `req.user.claims.sub`
- **Roles**: `admin` (full CRUD), `school_head` (read-only + reports), `teacher` (own data), `student` (own report only)
- **School Setup**: First login → `SchoolSetupModal` if no school; creates school + admin membership
- **Invitations**: Admin creates token-based invite links; recipients open `/invite/:token`, log in, and are auto-joined
- **Student Portal**: `/app/portal` shows linked student's mastery data; student linked via `students.userId`

### Role-based API Routes
- `GET/POST /api/school` — get/create school
- `GET /api/admin/members` — list members (admin + school_head)
- `DELETE /api/admin/members/:userId` — remove member (admin only)
- `GET/POST /api/admin/invitations` — list/create invitations (admin)
- `DELETE /api/admin/invitations/:id` — delete invitation (admin)
- `GET /api/invite/:token` — public preview of invitation
- `POST /api/invite/:token/accept` — accept invitation (authenticated)
- `GET /api/school/overview` — school-wide stats (admin + school_head)
- `GET /api/student/portal` — student's own mastery data

### Shared Code (`shared/`)
- `schema.ts` — Drizzle table definitions, Zod insert schemas, TypeScript types for requests/responses, mastery calculation constants (assessment type weights, mastery bands), multi-user types (`SchoolRole`, `MySchoolResponse`, etc.)
- `routes.ts` — API route definitions with method, path, Zod input/response schemas. Used by both client hooks and server route handlers
- `models/auth.ts` — User and session table definitions required by Replit Auth

### Key Design Decisions
1. **Shared route definitions**: Both frontend and backend reference the same route/schema objects, ensuring type safety and consistent validation across the stack
2. **Zod everywhere**: All API inputs are validated with Zod on both client (before sending) and server (before processing). Client hooks use `safeParse` with logging for debugging
3. **Mobile-first**: Tailwind responsive design, WhatsApp integration for report sharing, high-contrast color scheme suitable for mobile viewing
4. **Seed data**: The server seeds demo data (sample class, students, academic structure, assessments) on first login for new teachers to explore the app immediately
5. **Role-based sidebar**: `AppShell` reads `useMySchool()` and filters nav items by role. School Head gets a read-only banner. Student only sees "My Progress" portal.
6. **Invitation flow**: Admin creates invite → gets shareable link `/invite/:token` → recipient logs in → auto-accepted via localStorage token or direct accept button.

## External Dependencies

- **PostgreSQL** — Primary database, required via `DATABASE_URL` environment variable
- **Replit Auth (OIDC)** — Authentication provider, requires `ISSUER_URL`, `REPL_ID`, and `SESSION_SECRET` environment variables
- **PDFKit** — Server-side PDF generation for student/class reports
- **Google Fonts** — Outfit, DM Sans, Fira Code loaded via CDN in `index.html`
- **WhatsApp Web API** — Report sharing via `https://wa.me/?text=...` links (no API key needed)
- **shadcn/ui + Radix UI** — Component library (vendored into `client/src/components/ui/`)
- **TanStack React Query** — Client-side data fetching and caching
- **Drizzle ORM + Drizzle Kit** — Database ORM and migration tooling
