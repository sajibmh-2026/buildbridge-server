import mongoose, { Schema, Model } from "mongoose";
import { IApplication, ApplicationStatus } from "../types";

const ApplicationSchema = new Schema<IApplication>(
  {
    projectId: {
      type: Schema.Types.ObjectId as unknown as typeof Schema.Types.String,
      ref: "Project",
      required: [true, "Project ID is required"],
    },
    applicantId: {
      type: Schema.Types.ObjectId as unknown as typeof Schema.Types.String,
      ref: "User",
      required: [true, "Applicant ID is required"],
    },
    message: {
      type: String,
      required: [true, "Application message is required"],
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"] as ApplicationStatus[],
      default: "pending",
    },
    skills: { type: [String], default: [] },
    githubProfile: { type: String, default: "" },
    portfolioUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

ApplicationSchema.index({ projectId: 1 });
ApplicationSchema.index({ applicantId: 1 });
ApplicationSchema.index({ status: 1 });
ApplicationSchema.index({ projectId: 1, applicantId: 1 }, { unique: true });

const Application: Model<IApplication> =
  mongoose.models.Application || mongoose.model<IApplication>("Application", ApplicationSchema);
export default Application;
