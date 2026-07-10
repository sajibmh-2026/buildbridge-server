import mongoose, { Schema, Model } from "mongoose";
import { IProject, ProjectCategory, ProjectDifficulty, ProjectStatus } from "../types";

const ProjectSchema = new Schema<IProject>(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    shortDescription: {
      type: String,
      required: [true, "Short description is required"],
      trim: true,
      maxlength: [200, "Short description cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [20, "Description must be at least 20 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "web-development", "mobile-development", "ai-ml", "devops", "blockchain",
        "game-development", "data-science", "cybersecurity", "ui-ux", "other",
      ] as ProjectCategory[],
    },
    difficulty: {
      type: String,
      required: [true, "Difficulty is required"],
      enum: ["beginner", "intermediate", "advanced"] as ProjectDifficulty[],
    },
    requiredSkills: {
      type: [String],
      required: [true, "At least one skill is required"],
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: "At least one skill is required",
      },
    },
    image: { type: String, default: "" },
    images: { type: [String], default: [] },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Project owner is required"],
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "completed", "closed"] as ProjectStatus[],
      default: "open",
    },
    maxMembers: { type: Number, default: 5, min: [1, "Minimum 1 member"], max: [20, "Maximum 20 members"] },
    currentMembers: { type: Number, default: 1 },
    deadline: { type: String, default: "" },
    repository: { type: String, default: "" },
    liveUrl: { type: String, default: "" },
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

ProjectSchema.index({ title: "text", shortDescription: "text", description: "text" });
ProjectSchema.index({ category: 1 });
ProjectSchema.index({ difficulty: 1 });
ProjectSchema.index({ status: 1 });
ProjectSchema.index({ owner: 1 });
ProjectSchema.index({ createdAt: -1 });

const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>("Project", ProjectSchema);
export default Project;
