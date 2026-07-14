# Loan Desk

A full-stack loan management platform that streamlines the end-to-end loan application workflow — from customer submission to multi-stage employee review and final decision.

---

## Overview

Loan Desk provides two separate portals:

- **Customer Portal** — customers can apply for loans, track application status, manage documents, and receive notifications.
- **Employee Portal** — loan officers, credit analysts, and managers work through a structured pipeline: document verification → credit review → manager decision.

The system supports role-based access control, real-time status tracking, document uploads, audit logging, and PDF decision generation.

---

## Features

### Customer Portal
- Apply for multiple loan types (Personal, Home, Business, Education, Vehicle)
- Upload supporting documents (Aadhaar, PAN, salary slips, bank statements)
- Track application status through the full workflow
- View notifications for status changes and document requests
- Manage profile and change password

### Employee Portal
- Role-based queue management (Verifier → Credit Analyst → Loan Officer → Manager)
- Document verification with approve / reject / request-more-docs actions
- Credit review with scoring and recommendations
- Manager decision (approve / reject / escalate)
- Escalation workflow for complex cases
- Audit log trail for every action
- Loan distribution dashboard with charts

### General
- Secure JWT-based authentication
- Supabase storage for document management
- Signed URL generation for secure document access
- Demo account quick-login for evaluation

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| [React 19](https://react.dev/) | UI framework |
| [Vite 8](https://vitejs.dev/) | Build tool & dev server |
| [Tailwind CSS v4](https://tailwindcss.com/) | Utility-first styling |
| [TanStack Query v5](https://tanstack.com/query) | Server state management |
| [React Router v7](https://reactrouter.com/) | Client-side routing |
| [React Hook Form](https://react-hook-form.com/) | Form management |
| [Recharts](https://recharts.org/) | Data visualisation |
| [Lucide React](https://lucide.dev/) | Icon library |
| [Axios](https://axios-http.com/) | HTTP client |
| [@supabase/supabase-js](https://supabase.com/docs/reference/javascript) | Supabase client |

### Backend
| Technology | Purpose |
|---|---|
| [Node.js](https://nodejs.org/) | Runtime |
| [Express 4](https://expressjs.com/) | Web framework |
| [Supabase](https://supabase.com/) | Database, Auth & Storage |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | JWT signing & verification |
| [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Password hashing |
| [Multer](https://github.com/expressjs/multer) | File upload handling |
| [PDFKit](https://pdfkit.org/) | PDF generation for decisions |
| [dotenv](https://github.com/motdotla/dotenv) | Environment variable loading |

---

## Project Structure

```
Loan Desk/
├── backend/                    # Express API server
│   ├── config/
│   │   └── supabase.js         # Supabase client initialisation
│   ├── controllers/
│   │   ├── authController.js   # Login, profile, password
│   │   └── loanController.js   # Full loan lifecycle actions
│   ├── middlewares/
│   │   └── authenticateToken.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── loanRoutes.js
│   ├── scripts/
│   │   ├── seed-demo-accounts.js
│   │   └── sync-demo-auth-users.js
│   ├── services/
│   │   ├── authService.js
│   │   ├── loanService.js
│   │   └── decisionPdfService.js
│   ├── utils/
│   │   └── statusMaps.js
│   ├── .env.example            # Backend env template
│   └── server.js
│
├── frontend/                   # React + Vite SPA
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── assets/
│   │   │   └── hero.png
│   │   ├── components/
│   │   │   ├── applicant/
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   └── ui/
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useLoans.js
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── customer/
│   │   │   └── employee/
│   │   ├── routes/
│   │   │   ├── AppRoutes.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── utils/
│   │       └── supabase.js
│   ├── .env.example            # Frontend env template
│   └── index.html
│
└── README.md
```

---

## Installation

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com/) project with the required tables and storage buckets

### 1. Clone the repository

```bash
git clone https://github.com/Preetham-Bharadwaj/Loan-Desk.git
cd Loan-Desk
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your Supabase credentials and JWT secret
```

### 3. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your Supabase URL and anon key
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only — keep secret) |
| `SUPABASE_ANON_KEY` | Supabase anon key for auth operations |
| `JWT_SECRET` | Secret string for signing JWT tokens |
| `PORT` | Port for the API server (default: `5000`) |

### Frontend (`frontend/.env`)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key |
| `VITE_DEMO_ACCOUNTS_ENABLED` | Enable demo login buttons (`true`/`false`) |
| `VITE_DEMO_SHARED_PASSWORD` | Password used for all demo accounts |
| `VITE_API_URL` | Backend API base URL (default: `http://localhost:5000/api`) |

---

## Run the Application

### Run Backend

```bash
cd backend
npm start
# API server starts at http://localhost:5000
```

### Run Frontend

```bash
cd frontend
npm run dev
# Dev server starts at http://localhost:5173
```

### Seed Demo Accounts (optional)

```bash
cd backend
npm run seed:demo-accounts
```

---

## Screenshots

> _Screenshots will be added in a future update._

---

## Future Scope

- [ ] TypeScript migration for full type safety
- [ ] Email notifications for application status changes
- [ ] Mobile-responsive PWA support
- [ ] Analytics dashboard with approval rates and processing times
- [ ] Document OCR for automatic field extraction
- [ ] Multi-language (i18n) support
- [ ] Production CORS configuration and rate limiting
- [ ] Automated test suite (unit + integration)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Admin portal for user and role management

---

## License

This project is licensed under the [MIT License](LICENSE).
