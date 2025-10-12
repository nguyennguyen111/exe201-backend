import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { ptProfileController } from '~/controllers/ptProfileController'

const router = express.Router()

// PT tự xem/cập nhật hồ sơ mình
router.get(
  '/profile/me',
  authMiddleware.authenTokenCookie,
  authMiddleware.isPT,
  ptProfileController.getMyProfile
)
router.put(
  '/profile/me',
  authMiddleware.authenTokenCookie,
  authMiddleware.isPT,
  ptProfileController.upsertMyProfile
)
router.delete(
  '/profile/me',
  authMiddleware.authenTokenCookie,
  authMiddleware.isPT,
  ptProfileController.deleteMyProfile
)

// Public: xem hồ sơ 1 PT
router.get('/:ptId/profile', ptProfileController.getPTProfilePublic)

export default router
