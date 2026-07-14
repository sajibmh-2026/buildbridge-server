# 🏗 BuildBridge Server — System Architecture

## Overview

BuildBridge Server is a RESTful API built with Express.js 5, TypeScript, and MongoDB Atlas. It handles authentication, project management, application workflows, and dashboard analytics for the BuildBridge developer collaboration platform.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Next.js 15)                       │
│                    https://buildbridge.vercel.app            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                     HTTP/REST (Axios)
                     Authorization: Bearer <JWT>
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXPRESS.JS SERVER (Port 5000)               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                   Middleware Pipeline                  │   │
│  │  CORS → JSON Parser → authenticate → authorize       │   │
│  └──────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Auth    │  │ Projects │  │   Apps   │  │Dashboard │   │
│  │ Routes   │  │  Routes  │  │  Routes  │  │  Routes  │   │
│  │          │  │          │  │          │  │          │   │
│  │ Register │  │ CRUD     │  │ Apply    │  │ Stats    │   │
│  │ Login    │  │ Search   │  │ Accept   │  │ Admin    │   │
│  │ Profile  │  │ Filter   │  │ Reject   │  │ Users    │   │
│  │          │  │ Sort     │  │ Withdraw │  │ Roles    │   │
│  │          │  │ Paginate │  │          │  │          │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │              │              │              │         │
│       └──────────────┴──────────────┴──────────────┘         │
│                           │                                  │
│                    Mongoose ODM                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas (Cloud)                     │
│                    Region: Singapore                         │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  Users   │  │ Projects │  │Applications│                │
│  │          │  │          │  │            │                  │
│  │ email    │  │ text     │  │ compound   │                  │
│  │ index    │  │ index    │  │ unique idx │                  │
│  │          │  │ category │  │ (project+  │                  │
│  │          │  │ diff     │  │  applicant)│                  │
│  │          │  │ status   │  │            │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication Flow

```
Registration:
  Client → POST /api/auth/register { name, email, password }
    → Server validates input
    → Password hashed with bcrypt (12 rounds)
    → User saved to MongoDB
    → JWT generated (7-day expiry)
    → Response: { user, token }

Login:
  Client → POST /api/auth/login { email, password }
    → Server finds user by email
    → Password compared with bcrypt.compare()
    → JWT generated (7-day expiry)
    → Response: { user, token }

Protected Request:
  Client → Any protected endpoint
    → Authorization: Bearer <token>
    → authenticate middleware:
        1. Extract token from header
        2. Verify JWT with secret
        3. Decode payload → userId
        4. Fetch user from DB (fresh role)
        5. Attach user to req.user
    → authorize middleware (if role-restricted):
        1. Check req.user.role against allowed roles
        2. Return 403 if unauthorized
    → Route handler executes
```

---

## API Flow

### Project Creation
```
Client → POST /api/projects (with JWT)
  → authenticate middleware → req.user attached
  → Validate required fields (title, description, category, etc.)
  → Create Project document with owner = req.user._id
  → Save to MongoDB
  → Response: { success, data: project }
```

### Application Workflow
```
1. Applicant views project detail page
2. Clicks "Apply to Join"
3. Fills in message, GitHub profile, portfolio URL
4. POST /api/applications { projectId, message, ... }
   → Server checks: user not project owner
   → Server checks: no existing application (compound index)
   → Create Application with status = "pending"
5. Project owner sees application in Dashboard
6. Owner accepts: PATCH /api/applications/:id { status: "accepted" }
   → Application status updated
   → Project currentMembers incremented
7. Or rejects: PATCH /api/applications/:id { status: "rejected" }
```

### Dashboard Analytics
```
Client → GET /api/dashboard/stats
  → Aggregation pipelines:
    - Count total projects by user
    - Count total applications sent
    - Count applications received (on user's projects)
    - Application status breakdown (pending/accepted/rejected)
    - Category distribution (for charts)
    - Difficulty distribution (for charts)
  → Response: { stats, projects, applications, charts }

Client → GET /api/dashboard/admin-stats (admin only)
  → Aggregation pipelines:
    - Total users, projects, applications counts
    - Users by role
    - Projects by category, difficulty, status
    - Applications by status
    - Monthly user registrations (last 6 months)
    - Monthly project creations (last 6 months)
    - Recent users (last 5)
    - Recent projects (last 5)
  → Response: { stats, charts, recentUsers, recentProjects }
```

---

## Middleware Pipeline

```
Request
  │
  ▼
┌─────────────┐
│    CORS     │ → Allows: localhost:3000/3001/3002, buildbridge.vercel.app
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ JSON Parser │ → Parses request body
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ authenticate │ → JWT verify + DB user fetch
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  authorize   │ → Role check (user/admin)
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Route Handler│ → Business logic
└──────┬───────┘
       │
       ▼
   Response
```

---

## Database Schema

### User Schema
```typescript
{
  name: String (required, trim)
  email: String (required, unique, lowercase, trim)
  password: String (required, minlength: 6, select: false)
  photo: String (default: "")
  role: String (enum: ["user", "admin"], default: "user")
  skills: [String] (default: [])
  bio: String (maxlength: 500, default: "")
  location: String (default: "")
  website: String (default: "")
  github: String (default: "")
  linkedin: String (default: "")
}
Indexes: email (unique)
```

### Project Schema
```typescript
{
  title: String (required, trim)
  shortDescription: String (required, maxlength: 200)
  description: String (required)
  category: String (required, enum: ProjectCategory)
  difficulty: String (required, enum: ["beginner", "intermediate", "advanced"])
  status: String (enum: ["open", "in-progress", "completed"], default: "open")
  requiredSkills: [String] (required, minlength: 1)
  image: String (default: "")
  owner: ObjectId → User (required, ref: "User")
  maxMembers: Number (default: 5)
  currentMembers: Number (default: 1)
  deadline: Date
  repository: String
  liveUrl: String
  tags: [String]
}
Indexes:
  - Text index: { title: "text", shortDescription: "text" }
  - category, difficulty, status
```

### Application Schema
```typescript
{
  projectId: ObjectId → Project (required, ref: "Project")
  applicantId: ObjectId → User (required, ref: "User")
  message: String (required)
  githubProfile: String (default: "")
  portfolioUrl: String (default: "")
  status: String (enum: ["pending", "accepted", "rejected"], default: "pending")
}
Indexes:
  - Compound unique: { projectId: 1, applicantId: 1 } (prevents duplicates)
```

---

## Security

| Measure | Implementation |
|---------|----------------|
| Password Hashing | bcryptjs with 12-round salt |
| JWT Authentication | 7-day expiry, verified on every protected request |
| Role-Based Access | authorize middleware checks user/admin role |
| Owner Protection | Routes check `req.user._id === project.owner` |
| Password Hidden | `select: false` on password field |
| CORS | Specific origins only (not `*`) |
| Environment Variables | `.env` in `.gitignore`, not tracked |
| Input Validation | Mongoose schema validation |

---

## Deployment

### Render Configuration

**render.yaml:**
```yaml
services:
  - type: web
    name: buildbridge-server
    env: node
    region: singapore
    buildCommand: npm install
    startCommand: npx tsx src/index.ts
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
      - key: MONGODB_URI
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: CLIENT_URL
        sync: false
```

**Procfile:**
```
web: npx tsx src/index.ts
```

### Environment Variables for Production

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Strong random secret |
| `CLIENT_URL` | `https://buildbridge.vercel.app` |

---

## Folder Structure

```
server/
├── src/
│   ├── config/
│   │   └── db.ts                 # mongoose.connect() to Atlas
│   ├── middleware/
│   │   └── auth.ts               # authenticate + authorize functions
│   ├── models/
│   │   ├── User.ts               # User mongoose model
│   │   ├── Project.ts            # Project mongoose model
│   │   └── Application.ts        # Application mongoose model
│   ├── routes/
│   │   ├── authRoutes.ts         # /api/auth/*
│   │   ├── projectRoutes.ts      # /api/projects/*
│   │   ├── applicationRoutes.ts  # /api/applications/*
│   │   └── dashboardRoutes.ts    # /api/dashboard/*
│   ├── types/
│   │   └── express.d.ts          # Express Request type extension
│   ├── utils/
│   │   ├── jwt.ts                # generateToken(userId)
│   │   └── password.ts           # hashPassword(), comparePassword()
│   └── index.ts                  # Express app setup, CORS, routes, listen
├── .env                          # Environment variables (not in git)
├── .gitignore                    # node_modules, .env, dist
├── Procfile                      # Render deployment
├── render.yaml                   # Render deployment config
├── tsconfig.json                 # TypeScript config
├── package.json                  # Dependencies & scripts
└── README.md                     # Project documentation
```

---

## Author

**Sajib Mh** — [GitHub](https://github.com/sajibmh-2026)

Built for **SCIC-13 Assignment 3** at Programming Hero.
