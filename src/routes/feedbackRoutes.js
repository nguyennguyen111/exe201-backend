// src/routes/feedbackRoutes.js
import express from "express";
import { createFeedback, getFeedbackByPT } from "../controllers/feedbackController.js";

const router = express.Router();

router.post("/", createFeedback);
router.get("/pt/:ptId", getFeedbackByPT);

export default router;
