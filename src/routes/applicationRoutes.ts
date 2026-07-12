import { Router, Response } from "express";
import Application from "../models/Application";
import Project from "../models/Project";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/applications — List applications
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, status } = req.query as Record<string, string>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (projectId) {
      filter.projectId = projectId;
    } else {
      // If no projectId, show user's own applications
      filter.applicantId = req.user!.userId;
    }

    if (status) filter.status = status;

    const applications = await Application.find(filter)
      .populate("projectId", "title image")
      .populate("applicantId", "name email photo")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: applications });
  } catch (error) {
    console.error("GET /api/applications error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch applications",
    });
  }
});

// POST /api/applications — Apply to project
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, message, skills, githubProfile, portfolioUrl } = req.body;

    if (!projectId || !message) {
      return res.status(400).json({
        success: false,
        error: "Project ID and message are required",
      });
    }

    // Check project exists
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    // Can't apply to own project
    if (project.owner.toString() === req.user!.userId) {
      return res.status(400).json({
        success: false,
        error: "You cannot apply to your own project",
      });
    }

    // Check duplicate application
    const existing = await Application.findOne({
      projectId,
      applicantId: req.user!.userId,
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: "You have already applied to this project",
      });
    }

    const application = await Application.create({
      projectId,
      applicantId: req.user!.userId,
      message,
      skills: skills || [],
      githubProfile: githubProfile || "",
      portfolioUrl: portfolioUrl || "",
    });

    const populated = await Application.findById(application._id)
      .populate("projectId", "title image")
      .populate("applicantId", "name email photo")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Application submitted successfully",
      data: populated,
    });
  } catch (error) {
    console.error("POST /api/applications error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to submit application",
    });
  }
});

// GET /api/applications/:id — Single application
router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate("projectId", "title image owner")
      .populate("applicantId", "name email photo skills")
      .lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    return res.json({ success: true, data: application });
  } catch (error) {
    console.error("GET /api/applications/:id error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch application",
    });
  }
});

// PATCH /api/applications/:id — Accept/Reject (project owner only)
router.patch("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;

    if (!status || !["accepted", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status must be 'accepted' or 'rejected'",
      });
    }

    const application = await Application.findById(req.params.id).populate(
      "projectId"
    );
    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = application.projectId as any;
    // Allow project owner or admin to update status
    const isOwner = project.owner.toString() === req.user!.userId;
    const isAdmin = req.user!.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Only the project owner or admin can update application status",
      });
    }

    application.status = status;
    await application.save();

    // If accepted, increment currentMembers
    if (status === "accepted") {
      await Project.findByIdAndUpdate(project._id, {
        $inc: { currentMembers: 1 },
      });
    }

    const populated = await Application.findById(application._id)
      .populate("projectId", "title image")
      .populate("applicantId", "name email photo")
      .lean();

    return res.json({
      success: true,
      message: `Application ${status} successfully`,
      data: populated,
    });
  } catch (error) {
    console.error("PATCH /api/applications/:id error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update application",
    });
  }
});

// DELETE /api/applications/:id — Withdraw (applicant only)
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({
        success: false,
        error: "Application not found",
      });
    }

    if (application.applicantId.toString() !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: "Only the applicant can withdraw the application",
      });
    }

    await Application.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Application withdrawn successfully",
    });
  } catch (error) {
    console.error("DELETE /api/applications/:id error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to withdraw application",
    });
  }
});

export default router;
