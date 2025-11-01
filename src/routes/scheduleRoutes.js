// src/routes/scheduleRoutes.js
import express from 'express';
import { authMiddleware } from '~/middlewares/authMiddleware';
import { scheduleController } from '~/controllers/scheduleController';

const router = express.Router();

router.get('/schedule/preview', authMiddleware.authenTokenCookie, scheduleController.previewSchedule);
router.post('/schedule/generate', authMiddleware.authenTokenCookie, scheduleController.generateSchedule);

export default router;
