import express from 'express'
import { authMiddleware } from '~/middlewares/authMiddleware'
import { ptProfileController } from '~/controllers/ptProfileController'
import multer from 'multer'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

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

router.post(
  '/upload-cover',
  authMiddleware.authenTokenCookie,
  upload.single('coverImage'),
  ptProfileController.uploadCoverImage
)

router.get(
  '/account/me',
  authMiddleware.authenTokenCookie,
  authMiddleware.isPT,
  ptProfileController.getMyAccount
)

router.get('/public/list', ptProfileController.getAllPTProfilesPublic)
router.get('/public/:id', ptProfileController.getPTDetailPublic)
// Public: xem hồ sơ 1 PT
router.get('/:ptId/profile', ptProfileController.getPTProfilePublic)

export default router
