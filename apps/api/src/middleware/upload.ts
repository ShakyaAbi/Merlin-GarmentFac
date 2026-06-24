import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";
import { getArticleUploadRoot } from "../utils/uploadPaths";

// Configure multer for memory storage (files stored in buffer)
const storage = multer.memoryStorage();

// File filter - accept CSV, TXT and PDF files
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedExtensions = [".csv", ".txt", ".pdf"];
  const allowedMimeTypes = [
    "text/csv",
    "text/plain",
    "application/csv",
    "application/vnd.ms-excel",
    "application/pdf",
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  // Validate both extension and MIME type for security
  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(mimeType)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only CSV, TXT and PDF are allowed."));
  }
};

const articleImageFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedExtensions = [".jpg", ".jpeg", ".png"]
  const allowedMimeTypes = ["image/jpeg", "image/png"]
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowedExtensions.includes(ext) && allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Invalid file type. Only JPG and PNG images are allowed."))
  }
}

// Create multer upload instance
const storageDisk = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

// Multer instance for memory-based file uploads
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Multer instance for disk-based file uploads
export const uploadToDisk = multer({
  storage: storageDisk,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Export middleware for single file upload
// Middleware for single CSV file upload
export const uploadCSV = upload.single("file");
// Middleware for single file upload to disk
export const uploadVerification = uploadToDisk.single("file");

export const uploadArticleImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = getArticleUploadRoot();
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `article-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: articleImageFilter,
}).single("image");
