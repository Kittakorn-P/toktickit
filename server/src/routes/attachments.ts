import express, { Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getPrisma } from "../prisma.js";
import { requireRequester } from "../middleware/requireRequester.js";

export const attachmentsRouter = express.Router();
attachmentsRouter.use(requireRequester);

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_ACTIVE_ATTACHMENTS = 5;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error("UNSUPPORTED_TYPE"));
      return;
    }
    cb(null, true);
  },
});

// ---------------------------------------------------------------------------
// Issue 17 — POST /api/tickets/:id/attachments
// BR-13: type/size/count limits. BR-07: only the owning Requester may attach.
// ---------------------------------------------------------------------------
attachmentsRouter.post(
  "/tickets/:ticketId/attachments",
  (req, res: Response, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err.message === "UNSUPPORTED_TYPE") {
          return res.status(400).json({ error: "Unsupported file type." });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "File exceeds 5MB limit." });
        }
        return res.status(400).json({ error: "Upload failed." });
      }
      next();
    });
  },
  async (req, res: Response) => {
    try {
      const prisma = getPrisma();
      const ticketId = Number(req.params.ticketId);

      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket || ticket.requesterId !== req.requester!.id) {
        return res.status(404).json({ error: "Ticket not found." });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file provided." });
      }

      const activeCount = await prisma.attachment.count({
        where: { ticketId, isRemoved: false },
      });
      if (activeCount >= MAX_ACTIVE_ATTACHMENTS) {
        fs.unlink(req.file.path, () => {});
        return res.status(409).json({ error: "Maximum of 5 active attachments reached." });
      }

      const attachment = await prisma.attachment.create({
        data: {
          ticketId,
          originalFilename: req.file.originalname,
          storedFilename: req.file.filename,
          mimeType: req.file.mimetype,
          sizeBytes: req.file.size,
        },
      });

      res.status(201).json(attachment);
    } catch (error) {
      console.error("POST attachments failed:", error);
      res.status(500).json({ error: "Unable to upload attachment." });
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/tickets/:id/attachments — metadata list, includes removed ones
// ---------------------------------------------------------------------------
attachmentsRouter.get("/tickets/:ticketId/attachments", async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = Number(req.params.ticketId);

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.requesterId !== req.requester!.id) {
      return res.status(404).json({ error: "Ticket not found." });
    }

    const attachments = await prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json({ attachments });
  } catch (error) {
    console.error("GET attachments failed:", error);
    res.status(500).json({ error: "Unable to load attachments." });
  }
});

// ---------------------------------------------------------------------------
// GET /api/attachments/:id/download
// BR-16/BR-19: not-owned, not-found, and removed all return identical 404.
// ---------------------------------------------------------------------------
attachmentsRouter.get("/attachments/:id/download", async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: Number(req.params.id) },
      include: { ticket: true },
    });

    if (
      !attachment ||
      attachment.ticket.requesterId !== req.requester!.id ||
      attachment.isRemoved
    ) {
      return res.status(404).json({ error: "Attachment not found." });
    }

    const filePath = path.join(UPLOAD_DIR, attachment.storedFilename);
    res.download(filePath, attachment.originalFilename);
  } catch (error) {
    console.error("Download failed:", error);
    res.status(500).json({ error: "Unable to download attachment." });
  }
});

// ---------------------------------------------------------------------------
// PATCH /api/attachments/:id/remove — soft removal, confirm-only (no reason)
// ---------------------------------------------------------------------------
attachmentsRouter.patch("/attachments/:id/remove", async (req, res: Response) => {
  try {
    const prisma = getPrisma();
    const attachment = await prisma.attachment.findUnique({
      where: { id: Number(req.params.id) },
      include: { ticket: true },
    });

    if (
      !attachment ||
      attachment.ticket.requesterId !== req.requester!.id ||
      attachment.isRemoved
    ) {
      return res.status(404).json({ error: "Attachment not found." });
    }

    const updated = await prisma.attachment.update({
      where: { id: attachment.id },
      data: { isRemoved: true, removedAt: new Date() },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error("Remove attachment failed:", error);
    res.status(500).json({ error: "Unable to remove attachment." });
  }
});