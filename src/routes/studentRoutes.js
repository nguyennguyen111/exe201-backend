import express from "express";
import { studentController } from "~/controllers/studentController.js";
import { authMiddleware } from "~/middlewares/authMiddleware.js";

const router = express.Router();

// Cập nhật BMI
router.post(
    "/bmi",
    authMiddleware.authenTokenCookie,
    authMiddleware.isStudent,
    studentController.updateBMI
);

export default router;
