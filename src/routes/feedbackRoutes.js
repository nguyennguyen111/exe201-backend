// src/routes/feedbackRoutes.js
import express from "express";
import { createFeedback, getFeedbackByPT } from "../controllers/feedbackController.js";
//Thêm middleware xác thực
import { protect } from "../middlewares/authMiddleware.js";
const router = express.Router();

router.post("/", protect, createFeedback);
router.get("/pt/:ptId", protect, getFeedbackByPT);

export default router;
