export type UserRole = "user" | "admin";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  photo?: string;
  role: UserRole;
  skills: string[];
  bio?: string;
  location?: string;
  website?: string;
  github?: string;
  linkedin?: string;
  createdAt: string;
  updatedAt?: string;
}

export type ProjectCategory =
  | "web-development"
  | "mobile-development"
  | "ai-ml"
  | "devops"
  | "blockchain"
  | "game-development"
  | "data-science"
  | "cybersecurity"
  | "ui-ux"
  | "other";

export type ProjectDifficulty = "beginner" | "intermediate" | "advanced";
export type ProjectStatus = "open" | "in-progress" | "completed" | "closed";

export interface IProject {
  _id: string;
  title: string;
  shortDescription: string;
  description: string;
  category: ProjectCategory;
  difficulty: ProjectDifficulty;
  requiredSkills: string[];
  image?: string;
  images?: string[];
  owner: string;
  status: ProjectStatus;
  maxMembers?: number;
  currentMembers?: number;
  deadline?: string;
  repository?: string;
  liveUrl?: string;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
}

export type ApplicationStatus = "pending" | "accepted" | "rejected";

export interface IApplication {
  _id: string;
  projectId: string;
  applicantId: string;
  message: string;
  status: ApplicationStatus;
  skills?: string[];
  githubProfile?: string;
  portfolioUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
}
