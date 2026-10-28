# Campus Compliment and Grievance Management System

CampusConnect is a beginner-friendly full-stack college project that lets students share compliments and grievances and lets authorized campus administrators review submissions and update their progress.

## 1. Problem statement

Campus feedback can be difficult to submit, track, and route to the right people. This application provides one place to recognize positive campus experiences, report concerns, and follow the status of a submission.

## 2. Objectives

- Provide a simple digital channel for compliments and grievances.
- Categorize feedback for easier review.
- Let students see only their own submissions.
- Let administrators review all submissions and update status with a note.
- Store feedback persistently in Supabase PostgreSQL.

## 3. Roles and features

**Student:** create an account, sign in, submit compliments or grievances, view their own submissions and status updates.

**Administrator:** view all submissions, see submitter details, and update status or add an administrative note.

**Public dashboard:** displays aggregate counts only. The list of private submissions requires sign-in.

Statuses: `submitted`, `under_review`, `in_progress`, `resolved`, `rejected` (shown as “Closed”).

## 4. Technology stack

- HTML5, CSS3, Vanilla JavaScript
- Node.js 20+ and Express 5
- Supabase PostgreSQL
- Git and GitHub
- npm packages: `@supabase/supabase-js`, `bcryptjs`, `cookie-parser`, `dotenv`, `express`, `express-rate-limit`, `helmet`, `jsonwebtoken`

## 5. Folder structure

```text
campus-compliment-grievance-management-system/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── server.js
│   ├── supabase.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── submissions.js
│   ├── middleware/
│   │   └── auth.js
│   ├── package.json
│   ├── .env
│   ├── .env.example
│   └── .gitignore
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

## 6. Prerequisites

Install:
- Node.js LTS (20 or newer): https://nodejs.org/
- Visual Studio Code: https://code.visualstudio.com/
- Git: https://git-scm.com/
- A Supabase account: https://supabase.com/

Verify in a terminal:
```bash
node --version
npm --version
git --version
```

## 7. Set up Supabase

1. Create a new project at https://supabase.com/ and keep its database password private.
2. Open **SQL Editor** in the Supabase dashboard.
3. Open `database/schema.sql` from this project, copy all its contents into the SQL Editor, and click **Run**.
4. Open **Table Editor** and confirm the `users` and `submissions` tables exist.
5. In **Project Settings → API** (or the project's API keys settings), copy the Project URL and the server-side service-role/secret key. Supabase may label keys differently in newer dashboards. Use only a privileged server-side key for this MVP; never put it in frontend files or GitHub.

## 8. Environment configuration

Open a terminal in the `backend` directory and create a file named `.env` by copying `.env.example`. Replace the placeholder values with your own:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_real_server_only_key
JWT_SECRET=replace_with_a_random_secret
ADMIN_EMAIL=admin@yourcollege.edu
```

Generate a strong JWT secret from the `backend` directory:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Copy the output into `JWT_SECRET`. Set `ADMIN_EMAIL` to the exact email address that should receive administrator access at registration time. Register that account only after configuring the email. All other new accounts become students. Do not share the admin account.

`.env.example` contains placeholders and is safe to commit. `.env` contains real credentials and must never be committed.

## 9. Install and run

From a terminal:
```bash
cd backend
npm install
npm run check
npm start
```

Expected terminal output:
```text
CampusConnect running at http://localhost:3000
```

Open http://localhost:3000 in your browser. The health endpoint is http://localhost:3000/api/health and should return JSON containing `"status":"ok"`.

To restart automatically after backend file changes, use `npm run dev`.

## 10. How to use

1. Open the app and choose **Sign in → Create an account**.
2. Register using a name, email, and password of at least 8 characters.
3. Select Compliment or Grievance, choose a category, add a subject and details, and submit.
4. Find your record under Recent submissions and check its status.
5. To use the administrator view, set `ADMIN_EMAIL` before registration, then register with that exact email. The administrator can update status and add a note.
6. Use filters to find records by type or status.

## 11. API reference

All endpoints return JSON. Private endpoints use the HTTP-only `campus_token` cookie.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | API health check |
| GET | `/api/stats` | Public | Aggregate dashboard counts |
| POST | `/api/auth/register` | Public, rate limited | Register student or configured admin email |
| POST | `/api/auth/login` | Public, rate limited | Sign in |
| POST | `/api/auth/logout` | Public | Clear login cookie |
| GET | `/api/auth/me` | Signed in | Get current account |
| GET | `/api/submissions` | Signed in | Student's records or all records for admin; optional `type` and `status` query parameters |
| POST | `/api/submissions` | Signed in | Create a submission |
| PATCH | `/api/submissions/:id/status` | Admin only | Update status and administrative note |

Example submission request body:
```json
{
  "type": "grievance",
  "title": "Broken lights near hostel entrance",
  "category": "Facilities & Maintenance",
  "description": "The lights near the entrance have not been working for several evenings."
}
```

Typical error status codes: `400` invalid input, `401` not signed in/invalid session, `403` insufficient permissions, `404` record or route not found, `409` duplicate email, `429` rate limit exceeded, `500` unexpected server/database configuration error.

## 12. Architecture and security notes

Browser HTML/CSS/JS → Express REST API → Supabase PostgreSQL. The service-role key exists only in the backend environment. Passwords are hashed with bcryptjs; authentication uses an 8-hour signed JWT in an HTTP-only cookie. Backend middleware reads the current role from the database. Students can query only their own submissions; administrators can view all submissions and update status.

RLS is enabled with no client-facing policies because this MVP accesses the database through the server's privileged key. The backend must therefore perform authorization checks on every private operation. Do not expose the service-role key. For production deployment, use HTTPS, a persistent rate limiter, security review, password reset/email verification, audit logs, and a more mature authentication system. The in-memory/default deployment setup is intended for a college demo, not a high-risk production environment.

## 13. Manual testing checklist

- [ ] `/api/health` returns `status: ok`.
- [ ] Register a new student with a valid email and password; the account is created and signed in.
- [ ] Register the same email again; the server returns a duplicate-account error.
- [ ] Submit valid compliment and grievance records; each appears in the student's list.
- [ ] Try a short title or description; the app displays a validation error.
- [ ] Sign out; private submissions are no longer displayed.
- [ ] Sign in as a student; another student's records are not returned.
- [ ] Configure and register the `ADMIN_EMAIL` account; it can view all submissions.
- [ ] As admin, update a status and add a note; the update persists after refresh.
- [ ] As a student, attempt the status endpoint; the server returns `403`.
- [ ] Resize the browser to mobile width; the page remains usable.
- [ ] Temporarily use an incorrect Supabase key; database operations fail safely and the server logs a useful diagnostic.

These are instructions for tests to run locally; they are not claims that a live Supabase project has been tested.

## 14. Troubleshooting

- **Missing JWT_SECRET:** create `backend/.env`, add a random secret of at least 32 characters, and restart.
- **Database operation fails:** verify the Supabase URL/key, ensure `schema.sql` ran successfully, and confirm internet access.
- **Table not found:** confirm `users` and `submissions` are in the `public` schema.
- **Port already in use:** change `PORT` in `.env` (for example `3001`) and open the matching localhost URL.
- **Changes not appearing:** refresh the browser; restart the server after backend changes.
- **Admin account is a student:** `ADMIN_EMAIL` must be set before account registration and must exactly match the email. Do not permit users to self-promote through the browser.
- **Node command not found:** install Node.js LTS and reopen the terminal.

## 15. GitHub upload

Create an empty repository on https://github.com/ first. From the project root directory:

```bash
git init
git status
git add .
git status
git commit -m "Build CampusConnect project"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the repository URL shown by GitHub. Check the second `git status` before committing and make sure `.env`, `node_modules/`, real credentials, and private records are not staged. `.gitignore` does not remove secrets that were committed earlier. If a key is exposed, rotate it immediately and clean the repository history as needed.

## 16. Limitations and future improvements

This is an educational MVP. It does not include email notifications, attachments, password reset, email verification, or a full audit trail. Possible improvements include department-specific assignment, anonymous grievance submission with carefully designed abuse controls, exportable reports, notifications, and automated tests.

## 17. Final checklist

- [ ] Supabase schema has been executed.
- [ ] `.env` is configured locally and excluded from Git.
- [ ] `npm install` and `npm run check` complete successfully.
- [ ] The health endpoint works.
- [ ] Student and administrator workflows have been tested.
- [ ] GitHub repository contains source and `.env.example`, but no secrets.
