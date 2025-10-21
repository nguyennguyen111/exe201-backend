import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { sessionController } from '~/controllers/sessionController'

const router = express.Router()

router.get(
  '/my',
  authMiddleware.authenTokenCookie,
  sessionController.getMySessions
)

router.post(
  '/',
  authMiddleware.authenTokenCookie,
  authMiddleware.isPT,
  sessionController.createSession
)

router.get(
  '/:id',
  authMiddleware.authenTokenCookie,
  sessionController.getSessionDetail
)

router.put(
  '/:id',
  authMiddleware.authenTokenCookie,
  authMiddleware.isPT,
  sessionController.updateSession
)

router.delete(
  '/:id',
  authMiddleware.authenTokenCookie,
  authMiddleware.isPT,
  sessionController.deleteSession
)

export default router
