import type { Request } from "express";
import multer, { type FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";

// const UPLOAD_DIR = "uploads/pdfs/"
// const dirCheck = Bun.file(UPLOAD_DIR);
// if (!(await dirCheck.exists())) {
//   fs.mkdirSync(UPLOAD_DIR, { recursive: true })
// }

//working with ram instead of disk 
const storage = multer.memoryStorage()

const pdfFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (fileExtension === ".pdf" && file.mimetype === "application/pdf") {
    cb(null, true)
  } else {
    cb(new Error("Only PDF files are allowed"))
  }
}

const upload = multer({
  storage,
  fileFilter: pdfFilter,
  limits: { fileSize: 10 * 1024 * 1024}
})

export default upload