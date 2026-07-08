import { Router } from "express";
import { ingestController } from "../controllers/ingest.controller";
import upload from "../lib/multer";

const ingestRouter = Router();
ingestRouter.post("/ingest", upload.any(), ingestController)

export default ingestRouter;