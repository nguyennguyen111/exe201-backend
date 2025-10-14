// src/controllers/ptProfileController.js
import { StatusCodes } from 'http-status-codes'
import PTProfile from '~/models/PTProfile'
import User from '~/models/User'
import cloudinary from '~/config/cloudinary'

// helper: sanitize payload theo schema
function sanitizePayload(body = {}) {
  const allowed = [
    'coverImage',
    'bio',
    'specialties',
    'yearsExperience',
    'certificates', // [{ name, issuer, year, url }]
    'gymLocation',
    'location', // { address, coords:{ type:'Point', coordinates:[lng,lat] } }
    'availableForNewClients',
    'socials', // { facebook, instagram, tiktok }
    'videoIntroUrl'
  ]

  const payload = {}
  for (const k of allowed) {
    if (typeof body[k] !== 'undefined') payload[k] = body[k]
  }

  // specialties -> string[]
  if (payload.specialties) {
    payload.specialties = []
      .concat(payload.specialties)
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean)
  }

  // yearsExperience clamp (0..50) – validator cũng sẽ check, nhưng ta “dịu” FE
  if (typeof payload.yearsExperience === 'number') {
    payload.yearsExperience = Math.max(0, Math.min(50, payload.yearsExperience))
  }

  // certificates: giữ những cái có name
  if (payload.certificates) {
    payload.certificates = []
      .concat(payload.certificates)
      .map((c) => ({
        name: c?.name?.trim() || '',
        issuer: c?.issuer?.trim() || '',
        year: typeof c?.year === 'number' ? c.year : undefined,
        url: c?.url?.trim() || ''
      }))
      .filter((c) => c.name) // bỏ chứng chỉ trống
  }

  // socials: chỉ giữ 3 field cho sạch
  if (payload.socials) {
    payload.socials = {
      facebook: payload.socials.facebook || '',
      instagram: payload.socials.instagram || '',
      tiktok: payload.socials.tiktok || ''
    }
  }

  // location: đảm bảo cấu trúc GeoJSON
  if (payload.location) {
    const loc = payload.location
    const coords = loc?.coords?.coordinates
    payload.location = {
      address: loc?.address || '',
      coords: {
        type: 'Point',
        coordinates:
          Array.isArray(coords) && coords.length === 2
            ? [Number(coords[0]), Number(coords[1])]
            : [0, 0]
      }
    }
  }

  return payload
}

// GET /api/pt/account/me  → trả thông tin account đầy đủ cho PT
const getMyAccount = async (req, res) => {
  try {
    const userId = req.user._id
    const user = await User.findById(userId)
      .select('name avatar gender dob address email phone role verified')

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' })
    }
    return res.status(200).json({ success: true, data: user })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
}

/// GET /api/pt/profile/me
const getMyProfile = async (req, res) => {
  try {
    const ptId = req.user._id

    let profile = await PTProfile.findOne({ user: ptId })
    if (!profile) {
      // auto-create hồ sơ rỗng hợp lệ với GeoJSON mặc định
      profile = await PTProfile.create({
        user: ptId,
        coverImage: '',
        bio: '',
        specialties: [],
        yearsExperience: 0,
        certificates: [],
        gymLocation: '',
        availableForNewClients: true,
        socials: { facebook: '', instagram: '', tiktok: '' },
        videoIntroUrl: '',
        location: {
          address: '',
          coords: { type: 'Point', coordinates: [0, 0] }
        }
      })
    }

    res.status(StatusCodes.OK).json({ success: true, data: profile })
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: err.message })
  }
}

// PUT /api/pt/profile/me  (upsert)
const upsertMyProfile = async (req, res) => {
  try {
    const ptId = req.user?._id

    // chỉ PT mới được cập nhật hồ sơ PT
    const user = await User.findById(ptId).select('role')
    if (!user || user.role !== 'pt') {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ success: false, message: 'Chỉ PT mới cập nhật hồ sơ PT' })
    }

    const payload = sanitizePayload(req.body)

    // ❗ Không cho client chỉnh các field hệ thống
    // (verified, ratingAvg, ratingCount) — nếu có thì xoá
    delete payload.verified
    delete payload.ratingAvg
    delete payload.ratingCount

    const doc = await PTProfile.findOneAndUpdate(
      { user: ptId },
      { $set: { user: ptId, ...payload } },
      { new: true, upsert: true, runValidators: true }
    )

    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: 'Lưu hồ sơ PT thành công', data: doc })
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: 'Lỗi server', error: error.message })
  }
}

// GET /api/pt/:ptId/profile  (public)
const getPTProfilePublic = async (req, res) => {
  try {
    const { ptId } = req.params
    const profile = await PTProfile.findOne({ user: ptId })
      // ẩn bớt trường nội bộ (nếu có); ở đây mình chỉ để nguyên các field public
      .select('-__v -updatedAt -createdAt') // tuỳ bạn
      .lean()

    if (!profile) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: 'PT chưa có hồ sơ' })
    }
    return res.status(StatusCodes.OK).json({ success: true, data: profile })
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: 'Lỗi server', error: error.message })
  }
}

// DELETE /api/pt/profile/me  (tuỳ chọn)
const deleteMyProfile = async (req, res) => {
  try {
    const ptId = req.user?._id
    const r = await PTProfile.deleteOne({ user: ptId })
    if (r.deletedCount === 0) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: 'Không tìm thấy hồ sơ để xoá' })
    }
    return res
      .status(StatusCodes.OK)
      .json({ success: true, message: 'Đã xoá hồ sơ PT' })
  } catch (error) {
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ success: false, message: 'Lỗi server', error: error.message })
  }
}


const uploadCoverImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' })

    cloudinary.uploader.upload_stream(
      { resource_type: 'image', folder: 'fitlink/pt-covers' },
      async (error, result) => {
        if (error) return res.status(500).json({ error })

        // cập nhật link vào PTProfile
        await PTProfile.updateOne(
          { user: req.user._id },
          { $set: { coverImage: result.secure_url } },
          { upsert: true }
        )

        res.json({ success: true, url: result.secure_url })
      }
    ).end(req.file.buffer)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
/* =========================================================
   🆕 1️⃣ LẤY DANH SÁCH TẤT CẢ PT (PUBLIC)
   GET /api/pt/public/list
========================================================= */
const getAllPTProfilesPublic = async (req, res) => {
  try {
    const { keyword, specialty, available } = req.query
    const filter = {}

    // lọc theo chuyên môn nếu có
    if (specialty) {
      filter.specialties = { $regex: specialty, $options: 'i' }
    }

    // chỉ lấy PT đang mở nhận học viên mới
    if (available === 'true') {
      filter.availableForNewClients = true
    }

    // lấy danh sách PT
    const profiles = await PTProfile.find(filter)
      .populate('user', 'name email avatar phone role')
      .select(
        'coverImage bio specialties yearsExperience gymLocation ratingAvg location availableForNewClients socials videoIntroUrl'
      )
      .lean()

    // chỉ giữ user có role là 'pt' và có keyword (nếu có)
    const list = profiles.filter(
      (p) =>
        p.user &&
        p.user.role === 'pt' &&
        (!keyword ||
          p.user.name.toLowerCase().includes(keyword.toLowerCase()) ||
          (p.bio && p.bio.toLowerCase().includes(keyword.toLowerCase())))
    )

    return res.status(StatusCodes.OK).json({
      success: true,
      total: list.length,
      data: list
    })
  } catch (error) {
    console.error('getAllPTProfilesPublic error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi khi lấy danh sách PT',
      error: error.message
    })
  }
}

/* =========================================================
   🆕 2️⃣ LẤY CHI TIẾT PT CỤ THỂ (PUBLIC)
   GET /api/pt/public/:id
========================================================= */
const getPTDetailPublic = async (req, res) => {
  try {
    const { id } = req.params

    const profile = await PTProfile.findOne({ user: id })
      .populate('user', 'name email avatar phone role')
      .select('-__v -updatedAt -createdAt')
      .lean()

    if (!profile || profile.user.role !== 'pt') {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ success: false, message: 'Không tìm thấy PT' })
    }

    return res.status(StatusCodes.OK).json({
      success: true,
      data: profile
    })
  } catch (error) {
    console.error('getPTDetailPublic error:', error)
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Lỗi server khi lấy chi tiết PT',
      error: error.message
    })
  }
}
export const ptProfileController = {
  getMyProfile,
  upsertMyProfile,
  getPTProfilePublic,
  deleteMyProfile,
  uploadCoverImage,
  getMyAccount,
  getAllPTProfilesPublic,
  getPTDetailPublic
}
