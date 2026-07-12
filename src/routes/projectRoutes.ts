import { Router, Response } from "express";
import Project from "../models/Project";
import Application from "../models/Application";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/projects — List with search, filter, sort, pagination
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const {
      search = "",
      category = "",
      difficulty = "",
      status = "",
      skills = "",
      sort = "newest",
      page = "1",
      limit = "9",
    } = req.query as Record<string, string>;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (search) filter.$text = { $search: search };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (status) filter.status = status;
    if (skills) {
      const skillsArray = skills.split(",").map((s: string) => s.trim());
      filter.requiredSkills = { $in: skillsArray };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sortOption: any = { createdAt: -1 };
    switch (sort) {
      case "oldest":
        sortOption = { createdAt: 1 };
        break;
      case "title-asc":
        sortOption = { title: 1 };
        break;
      case "title-desc":
        sortOption = { title: -1 };
        break;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const total = await Project.countDocuments(filter);
    const projects = await Project.find(filter)
      .populate("owner", "name email photo")
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .lean();

    return res.json({
      success: true,
      data: projects,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch projects",
    });
  }
});

// POST /api/projects — Create project
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body;

    const project = await Project.create({
      ...body,
      owner: req.user!.userId,
      currentMembers: 1,
    });

    const populated = await Project.findById(project._id)
      .populate("owner", "name email photo")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("POST /api/projects error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to create project",
    });
  }
});

// GET /api/projects/:id — Single project
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("owner", "name email photo bio location github linkedin")
      .lean();

    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    const applicationCount = await Application.countDocuments({
      projectId: req.params.id,
      status: "pending",
    });

    return res.json({
      success: true,
      data: { ...project, applicationCount },
    });
  } catch (error) {
    console.error("GET /api/projects/:id error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch project",
    });
  }
});

// PUT /api/projects/:id — Update project
router.put("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    // Allow owner or admin to update
    const isOwner = project.owner.toString() === req.user!.userId;
    const isAdmin = req.user!.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this project",
      });
    }

    const body = { ...req.body };
    delete body.owner;
    delete body.currentMembers;

    const updated = await Project.findByIdAndUpdate(req.params.id, body, {
      returnDocument: "after",
      runValidators: true,
    })
      .populate("owner", "name email photo")
      .lean();

    return res.json({
      success: true,
      message: "Project updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("PUT /api/projects/:id error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to update project",
    });
  }
});

// DELETE /api/projects/:id — Delete project
router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: "Project not found",
      });
    }

    // Allow owner or admin to delete
    const isOwner = project.owner.toString() === req.user!.userId;
    const isAdmin = req.user!.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to delete this project",
      });
    }

    await Application.deleteMany({ projectId: req.params.id });
    await Project.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/projects/:id error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete project",
    });
  }
});

export default router;
