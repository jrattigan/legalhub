import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store files in the temp_uploads directory
    const uploadDir = path.join(process.cwd(), 'temp_uploads');
    
    // Create the directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a unique filename to prevent collisions
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// File filter to restrict file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow files by extension if mimetype might not be reliable
  const validExtensions = ['.pdf', '.docx', '.doc', '.odt', '.txt', '.rtf', '.text', '.md', '.log'];
  const extension = path.extname(file.originalname).toLowerCase();
  
  // Check for valid extension
  if (validExtensions.includes(extension)) {
    cb(null, true);
    return;
  }
  
  // Alternatively check by mimetype
  if (
    file.mimetype === 'application/pdf' || 
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.mimetype === 'application/msword' ||
    file.mimetype === 'application/vnd.oasis.opendocument.text' ||
    file.mimetype === 'text/plain' ||
    file.mimetype === 'application/rtf' ||
    file.mimetype === 'text/rtf'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only document file types (PDF, DOCX, DOC, ODT, TXT, RTF) are allowed'));
  }
};

// Create the multer instance with our configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  }
});

// Cleanup mechanism to remove files older than 1 hour
export function cleanupTempFiles() {
  const uploadDir = path.join(process.cwd(), 'temp_uploads');
  if (!fs.existsSync(uploadDir)) return;

  const files = fs.readdirSync(uploadDir);
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000; // 1 hour in milliseconds

  files.forEach(file => {
    const filePath = path.join(uploadDir, file);
    try {
      const stats = fs.statSync(filePath);
      // If file is older than 1 hour, delete it
      if (stats.mtimeMs < oneHourAgo) {
        fs.unlinkSync(filePath);
        console.log(`Deleted old temporary file: ${file}`);
      }
    } catch (err) {
      console.error(`Error checking/deleting file ${file}:`, err);
    }
  });
}

// Middleware to run cleanup every hour
export function setupFileCleanup(app: any) {
  // Run cleanup on startup
  cleanupTempFiles();
  
  // Run cleanup every hour
  setInterval(cleanupTempFiles, 60 * 60 * 1000);
  
  console.log('File cleanup service initialized');
}

// Handle file upload errors
export function handleUploadError(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File size exceeds 10MB limit' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(500).json({ error: `Server error: ${err.message}` });
  }
  next();
}