import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { ptController } from '~/controllers/ptController'

const router = express.Router()

router.get('/me/verification-status', authMiddleware.authenTokenCookie, authMiddleware.isPT, ptController.isPTVerified)

export default router
