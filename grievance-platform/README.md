# 🇮🇳 National Grievance Redressal Platform

A full-stack government grievance portal inspired by India's CPGRAMS system.
Built with **Next.js 14**, **Node.js + Express**, and **PostgreSQL**.

---

## 📁 Project Structure

```
grievance-platform/
├── backend/          # Node.js + Express REST API
│   ├── src/
│   │   ├── db/
│   │   │   ├── pool.ts       # PostgreSQL connection pool
│   │   │   ├── migrate.ts    # DB schema migration
│   │   │   └── seed.ts       # Seed data (ministries, officers, complaints)
│   │   ├── middleware/
│   │   │   └── auth.ts       # JWT authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.ts       # /api/auth/*
│   │   │   ├── complaints.ts # /api/complaints/*
│   │   │   ├── messages.ts   # /api/messages/*
│   │   │   └── officers.ts   # /api/officers/*, /api/ministries/*
│   │   └── index.ts          # Express app entry point
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/         # Next.js 14 App Router
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx                           # Landing / Login
    │   │   ├── citizen/
    │   │   │   ├── page.tsx                       # Citizen Dashboard
    │   │   │   ├── register/page.tsx              # Register Grievance (3-step)
    │   │   │   ├── track/[id]/page.tsx            # Track Complaint + Timeline
    │   │   │   ├── chat/[id]/page.tsx             # Chat with Officer
    │   │   │   └── officer/[id]/page.tsx          # Officer Profile
    │   │   ├── officer/
    │   │   │   ├── page.tsx                       # Officer Dashboard
    │   │   │   ├── complaint/[id]/page.tsx        # Complaint Detail + Actions
    │   │   │   └── chat/[id]/page.tsx             # Chat with Citizen
    │   │   └── ministry/
    │   │       └── page.tsx                       # Ministry Registry
    │   ├── components/
    │   │   ├── GovHeader.tsx      # Shared government header
    │   │   ├── ChatPage.tsx       # Reusable chat component
    │   │   ├── ui.tsx             # StatusBadge, UrgencyBadge, Spinner, etc.
    │   │   └── ReactQueryProvider.tsx
    │   ├── context/
    │   │   └── AuthContext.tsx    # JWT auth state
    │   └── lib/
    │       ├── api.ts             # Axios client + all API helpers
    │       └── types.ts           # Shared TypeScript types
    ├── package.json
    └── next.config.js
```

---

## 🚀 Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE grievance_db;"
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DB credentials and a strong JWT_SECRET

# Run migrations (create all tables)
npm run db:migrate

# Seed with sample data
npm run db:seed

# Start dev server
npm run dev
# → API running on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000

# Start dev server
npm run dev
# → App running on http://localhost:3000
```

---

## 🔑 Test Credentials (after seeding)

| Role    | Email                      | Password    |
|---------|----------------------------|-------------|
| Citizen | arjun.mehta@email.com      | citizen123  |
| Citizen | kavita.singh@email.com     | citizen123  |
| Officer | rajesh.kumar@gov.in        | officer123  |
| Officer | priya.sharma@gov.in        | officer123  |
| Officer | sneha.patel@gov.in         | officer123  |

---

## 🔌 API Reference

### Auth
| Method | Endpoint            | Description          |
|--------|---------------------|----------------------|
| POST   | /api/auth/register  | Register new user    |
| POST   | /api/auth/login     | Login, get JWT token |
| GET    | /api/auth/me        | Get current user     |

### Complaints
| Method | Endpoint                        | Auth     | Description            |
|--------|---------------------------------|----------|------------------------|
| GET    | /api/complaints                 | Any      | List complaints        |
| GET    | /api/complaints/:id             | Any      | Get complaint detail   |
| POST   | /api/complaints                 | Citizen  | Submit grievance       |
| PATCH  | /api/complaints/:id/status      | Officer  | Update status          |
| POST   | /api/complaints/:id/rate        | Citizen  | Rate officer           |

### Messages
| Method | Endpoint                | Auth    | Description    |
|--------|-------------------------|---------|----------------|
| GET    | /api/messages/:complaintId | Party | Get messages  |
| POST   | /api/messages/:complaintId | Party | Send message  |

### Officers & Ministries
| Method | Endpoint              | Description          |
|--------|-----------------------|----------------------|
| GET    | /api/officers         | List all officers    |
| GET    | /api/officers/:id     | Officer profile      |
| GET    | /api/ministries       | List all ministries  |
| GET    | /api/ministries/:id   | Ministry detail      |

---

## 🗃️ Database Schema

| Table                | Purpose                              |
|----------------------|--------------------------------------|
| `users`              | All users (citizens, officers, ministry) |
| `officers`           | Officer-specific fields (extends users) |
| `ministry_users`     | Ministry user mapping                |
| `ministries`         | Government ministries/departments    |
| `complaints`         | Grievance records                    |
| `complaint_documents`| File attachments                     |
| `complaint_history`  | Full audit trail of status changes   |
| `messages`           | Citizen ↔ Officer chat               |
| `officer_ratings`    | Post-resolution ratings              |

---

## ✨ Features

- **3-Role System**: Citizen / Officer / Ministry with JWT-based auth
- **3-Step Grievance Form**: Ministry → Details → Documents
- **Real-time Status Tracking**: Visual timeline with complete audit trail
- **Citizen-Officer Chat**: Messaging scoped to complaint, auto-polls every 5s
- **FIFO Complaint Queue**: Officers see oldest complaints first
- **File Uploads**: Multer-powered document uploads (PDF, JPG, PNG)
- **Officer Ratings**: Citizens rate officers after resolution; avg auto-calculated
- **Ministry Registry**: Searchable directory with officer profiles, expandable cards
- **Rate Limiting**: Auth endpoints rate-limited to prevent brute force
- **Security**: Helmet, CORS, bcrypt password hashing, role-based access control
