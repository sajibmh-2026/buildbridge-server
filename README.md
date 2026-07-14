# 🌉 BuildBridge — API Server

Backend REST API for BuildBridge, a developer collaboration platform. Built with Express.js, TypeScript, and MongoDB Atlas.

![Express](https://img.shields.io/badge/Express.js-5.x-000000?logo=express) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript) ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb) ![JWT](https://img.shields.io/badge/JWT-9.x-000000?logo=jsonwebtokens)

---

## 📖 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Endpoints](#-api-endpoints)
- [Authentication Flow](#-authentication-flow)
- [Database Schema](#-database-schema)
- [Deployment](#-deployment)
- [Client Repository](#-client-repository)
- [Author](#-author)

---

## ✨ Features

### 🔐 Authentication & Authorization
- User registration with bcrypt password hashing (12 rounds)
- JWT token authentication (7-day expiry)
- Role-based access control (User / Admin)
- Protected routes with middleware guards
- Profile management (update name, bio, skills, links)

### 📂 Project Management
- Full CRUD operations for projects
- Text search across titles and descriptions
- Multi-filter: category, difficulty, status, skills
- Sorting: newest, oldest, title A-Z, title Z-A
- Pagination with configurable limit
- Owner-only edit/delete protection

### 📋 Application System
- Apply to projects with message, GitHub profile, portfolio URL
- Duplicate application prevention (compound unique index)
- Accept / Reject by project owner
- Auto-update project `currentMembers` on accept
- Withdraw application support

### 📊 Dashboard & Analytics
- User stats: total projects, applications sent/received, status breakdown
- Admin stats: total users, projects, applications
- Aggregation pipelines for charts: category, difficulty, status, monthly trends
- Recent users and projects for admin panel

### 🛡️ Security
- CORS configured for specific client origins
- JWT verification on all protected routes
- Role-based authorization middleware
- Password field excluded from queries (`select: false`)
- Environment variables for secrets

---

## 🛠 Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **Express.js** | 5.x | REST API server |
| **TypeScript** | 5.8 | Type safety via tsx |
| **MongoDB Atlas** | Cloud | Database |
| **Mongoose** | 8.x | ODM with schema validation |
| **JWT** | 9.x | Authentication tokens |
| **bcryptjs** | 3.x | Password hashing |
| **CORS** | 2.x | Cross-origin resource sharing |
| **dotenv** | 16.x | Environment configuration |
| **tsx** | 4.x | TypeScript execution |

---

## 📁 Project Structure

```
server/
├── src/
│   ├── config/
│   │   └── db.ts              # MongoDB connection
│   ├── middleware/
│   │   └── auth.ts            # authenticate + authorize middleware
│   ├── models/
│   │   ├── User.ts            # User schema with indexes
│   │   ├── Project.ts         # Project schema with text index
│   │   └── Application.ts     # Application schema with compound index
│   ├── routes/
│   │   ├── authRoutes.ts      # Register, login, profile
│   │   ├── projectRoutes.ts   # CRUD + search/filter/sort/paginate
│   │   ├── applicationRoutes.ts # Apply, accept/reject, withdraw
│   │   └── dashboardRoutes.ts # Stats, admin stats, user management
│   ├── types/
│   │   └── express.d.ts       # Express Request type augmentation
│   ├── utils/
│   │   ├── jwt.ts             # generateToken helper
│   │   └── password.ts        # hashPassword + comparePassword
│   └── index.ts               # Server entry point
├── .env                       # Environment variables
├── .gitignore                 # Ignores node_modules, .env, dist
├── Procfile                   # Render deployment
├── render.yaml                # Render deployment config
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies & scripts
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18.x
- **MongoDB Atlas** account (or local MongoDB)
- **npm**

### Installation

```bash
# Clone the repository
git clone https://github.com/sajibmh-2026/buildbridge-server.git
cd buildbridge-server

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev
```

The server will start on `http://localhost:5000`.

### Scripts

```bash
npm run dev    # Start development server (tsx with hot reload)
npm run build  # Compile TypeScript to JavaScript
npm start      # Start production server (compiled)
```

---

## 🔑 Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/buildbridge
JWT_SECRET=your_super_secret_jwt_key_here
CLIENT_URL=http://localhost:3000
```

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 5000) | No |
| `MONGODB_URI` | MongoDB Atlas connection string | Yes |
| `JWT_SECRET` | Secret key for JWT signing | Yes |
| `CLIENT_URL` | Frontend URL for CORS | Yes |

---

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login & get JWT token |
| GET | `/api/auth/profile` | Yes | Get current user profile |
| PATCH | `/api/auth/profile` | Yes | Update profile (name, bio, skills, links) |

### Projects (`/api/projects`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/projects` | No | List projects (search, filter, sort, paginate) |
| GET | `/api/projects/:id` | No | Get project details with owner info |
| POST | `/api/projects` | Yes | Create new project |
| PATCH | `/api/projects/:id` | Yes + Owner | Update project |
| DELETE | `/api/projects/:id` | Yes + Owner | Delete project |

**Query Parameters for GET `/api/projects`:**
- `search` — Text search (title, description)
- `category` — Filter by category
- `difficulty` — beginner, intermediate, advanced
- `status` — open, in-progress, completed
- `skills` — Comma-separated skill filters
- `sort` — newest, oldest, title-asc, title-desc
- `page` — Page number (default: 1)
- `limit` — Items per page (default: 9)

### Applications (`/api/applications`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/applications` | Yes | Apply to a project |
| GET | `/api/applications/my` | Yes | Get my applications |
| PATCH | `/api/applications/:id` | Yes + Owner | Accept or reject application |

### Dashboard (`/api/dashboard`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard/stats` | Yes | User dashboard statistics |
| GET | `/api/dashboard/admin-stats` | Yes + Admin | Platform-wide analytics |
| GET | `/api/dashboard/users` | Yes + Admin | List all users |
| PATCH | `/api/dashboard/users/:id/role` | Yes + Admin | Update user role |

---

## 🔐 Authentication Flow

```
1. User registers → Password hashed with bcrypt (12 rounds) → Saved to MongoDB
2. User logs in → Password verified → JWT generated (7-day expiry)
3. Client stores JWT in localStorage
4. Client sends JWT in Authorization header: "Bearer <token>"
5. authenticate middleware:
   - Verifies JWT token
   - Fetches user from DB (gets fresh role)
   - Attaches user to req.user
6. authorize middleware:
   - Checks req.user.role against allowed roles
   - Returns 403 if unauthorized
```

---

## 📊 Database Schema

### User
```typescript
{
  name: string;           // Display name
  email: string;          // Unique, indexed
  password: string;       // bcrypt hashed, select: false
  photo: string;          // Profile photo URL
  role: "user" | "admin"; // Default: "user"
  skills: string[];       // Developer skills
  bio: string;            // Short bio (max 500 chars)
  location: string;       // Location
  website: string;        // Portfolio URL
  github: string;         // GitHub profile
  linkedin: string;       // LinkedIn profile
  timestamps: true        // createdAt, updatedAt
}
```

### Project
```typescript
{
  title: string;              // Project name
  shortDescription: string;   // Brief (max 200 chars)
  description: string;        // Full description
  category: string;           // ProjectCategory enum
  difficulty: string;         // beginner | intermediate | advanced
  status: string;             // open | in-progress | completed
  requiredSkills: string[];   // Skills needed
  image: string;              // Cover image URL
  owner: ObjectId → User;     // Project creator
  maxMembers: number;         // Team size limit (default: 5)
  currentMembers: number;     // Current team size (default: 1)
  deadline: Date;             // Optional deadline
  repository: string;         // GitHub repo URL
  liveUrl: string;            // Live demo URL
  tags: string[];             // Tags
  timestamps: true            // createdAt, updatedAt
}
// Indexes: text (title, shortDescription), category, difficulty, status
```

### Application
```typescript
{
  projectId: ObjectId → Project;   // Target project
  applicantId: ObjectId → User;    // Applicant
  message: string;                 // Application message
  githubProfile: string;           // GitHub URL
  portfolioUrl: string;            // Portfolio URL
  status: string;                  // pending | accepted | rejected
  timestamps: true                 // createdAt, updatedAt
}
// Compound unique index: projectId + applicantId (prevents duplicates)
```

---

## ☁️ Deployment

### Render

1. Push code to GitHub
2. Create new **Web Service** in [Render](https://render.com)
3. Connect GitHub repository
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npx tsx src/index.ts`
   - **Region:** Singapore
5. Add environment variables:
   - `MONGODB_URI` — MongoDB Atlas connection string
   - `JWT_SECRET` — Secret key
   - `CLIENT_URL` — Frontend URL (e.g., `https://buildbridge.vercel.app`)
   - `NODE_ENV` — `production`

The `render.yaml` and `Procfile` are included for deployment configuration.

---

## 🔗 Client Repository

Frontend built with Next.js 15: [buildbridge-client](https://github.com/sajibmh-2026/buildbridge-client)

---

## 👤 Author

**Sajib Mh** — [GitHub](https://github.com/sajibmh-2026)

---

## 📄 License

This project is built for educational purposes as part of **SCIC-13 Assignment 3** at Programming Hero.
