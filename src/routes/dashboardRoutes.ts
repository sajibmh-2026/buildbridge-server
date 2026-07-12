import { Router, Response } from "express";
import { Types } from "mongoose";
import Project from "../models/Project";
import Application from "../models/Application";
import User from "../models/User";
import { authenticate, authorize, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/dashboard/stats — Current user's dashboard stats
router.get("/stats", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userObjectId = new Types.ObjectId(userId);

    // User's projects
    const myProjects = await Project.find({ owner: userId })
      .populate("owner", "name email photo")
      .sort({ createdAt: -1 })
      .lean();

    // User's applications
    const myApplications = await Application.find({ applicantId: userId })
      .populate("projectId", "title image category difficulty status")
      .sort({ createdAt: -1 })
      .lean();

    // Application status counts
    const applicationStats = await Application.aggregate([
      { $match: { applicantId: userObjectId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const applicationStatusCounts = {
      pending: 0,
      accepted: 0,
      rejected: 0,
    };
    applicationStats.forEach((stat) => {
      applicationStatusCounts[stat._id as keyof typeof applicationStatusCounts] = stat.count;
    });

    // Projects by category (user's projects)
    const categoryStats = await Project.aggregate([
      { $match: { owner: userObjectId } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Projects by difficulty (user's projects)
    const difficultyStats = await Project.aggregate([
      { $match: { owner: userObjectId } },
      { $group: { _id: "$difficulty", count: { $sum: 1 } } },
    ]);

    // Total applications received on user's projects
    const projectIds = myProjects.map((p) => p._id);
    const receivedApplications = await Application.countDocuments({
      projectId: { $in: projectIds },
    });

    // Active projects (open or in-progress)
    const activeProjects = myProjects.filter(
      (p) => p.status === "open" || p.status === "in-progress"
    ).length;

    return res.json({
      success: true,
      data: {
        stats: {
          totalProjects: myProjects.length,
          totalApplications: myApplications.length,
          totalApplicationsReceived: receivedApplications,
          activeProjects,
          applicationStatusCounts,
        },
        projects: myProjects,
        applications: myApplications,
        charts: {
          categoryStats,
          difficultyStats,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch dashboard stats",
    });
  }
});

// GET /api/dashboard/admin-stats — Admin-only platform stats
router.get(
  "/admin-stats",
  authenticate,
  authorize("admin"),
  async (_req: AuthRequest, res: Response) => {
    try {
      // Total counts
      const totalUsers = await User.countDocuments();
      const totalProjects = await Project.countDocuments();
      const totalApplications = await Application.countDocuments();

      // Users by role
      const usersByRole = await User.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
      ]);

      // Projects by category
      const projectsByCategory = await Project.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Projects by difficulty
      const projectsByDifficulty = await Project.aggregate([
        { $group: { _id: "$difficulty", count: { $sum: 1 } } },
      ]);

      // Projects by status
      const projectsByStatus = await Project.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      // Applications by status
      const applicationsByStatus = await Application.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      // Recent users (last 10)
      const recentUsers = await User.find()
        .select("name email photo role createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Recent projects (last 10)
      const recentProjects = await Project.find()
        .populate("owner", "name email photo")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      // Monthly registrations (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyUsers = await User.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      const monthlyProjects = await Project.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      return res.json({
        success: true,
        data: {
          stats: {
            totalUsers,
            totalProjects,
            totalApplications,
          },
          usersByRole,
          charts: {
            projectsByCategory,
            projectsByDifficulty,
            projectsByStatus,
            applicationsByStatus,
            monthlyUsers,
            monthlyProjects,
          },
          recentUsers,
          recentProjects,
        },
      });
    } catch (error) {
      console.error("GET /api/dashboard/admin-stats error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch admin stats",
      });
    }
  }
);

// GET /api/dashboard/users — Admin only: list all users
router.get(
  "/users",
  authenticate,
  authorize("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = "1", limit = "20" } = req.query as Record<string, string>;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skip = (pageNum - 1) * limitNum;

      const total = await User.countDocuments();
      const users = await User.find()
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

      return res.json({
        success: true,
        data: users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error("GET /api/dashboard/users error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch users",
      });
    }
  }
);

// PATCH /api/dashboard/users/:id/role — Admin only: update user role
router.patch(
  "/users/:id/role",
  authenticate,
  authorize("admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { role } = req.body;

      if (!role || !["user", "admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          error: "Valid role is required (user or admin)",
        });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      return res.json({ success: true, data: user });
    } catch (error) {
      console.error("PATCH /api/dashboard/users/:id/role error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update user role",
      });
    }
  }
);

export default router;
