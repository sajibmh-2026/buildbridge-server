import mongoose, { Schema, Model } from "mongoose";
import { IUser, UserRole } from "../types";

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    photo: { type: String, default: "" },
    role: {
      type: String,
      enum: ["user", "admin"] as UserRole[],
      default: "user",
    },
    skills: { type: [String], default: [] },
    bio: { type: String, maxlength: [500, "Bio cannot exceed 500 characters"], default: "" },
    location: { type: String, default: "" },
    website: { type: String, default: "" },
    github: { type: String, default: "" },
    linkedin: { type: String, default: "" },
  },
  { timestamps: true }
);

UserSchema.index({ skills: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
export default User;
