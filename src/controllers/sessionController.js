import { StatusCodes } from 'http-status-codes'
import Session from '~/models/Session'
import StudentPackage from '~/models/StudentPackage'
import WorkoutItem from '~/models/WorkoutItem'

/** ✅ PT hoặc student xem danh sách buổi tập của họ */
const getMySessions = async (req, res) => {
  try {
    const userId = req.user._id
    const role = req.user.role

    const query = role === 'pt'
      ? { pt: userId }
      : role === 'student'
      ? { student: userId }
      : {}

    const sessions = await Session.find(query)
      .populate('studentPackage', 'status totalSessions')
      .populate('student', 'name avatar')
      .populate('pt', 'name avatar')
      .sort({ startTime: 1 })

    return res.status(StatusCodes.OK).json({ success: true, data: sessions })
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: e.message
    })
  }
}

/** ✅ PT tạo buổi tập mới */
const createSession = async (req, res) => {
  try {
    const ptId = req.user._id
    const { studentPackageId, startTime, endTime, title } = req.body

    if (!studentPackageId || !startTime || !endTime) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: 'Thiếu thông tin bắt buộc (studentPackageId, startTime, endTime)'
      })
    }

    const studentPackage = await StudentPackage.findById(studentPackageId).populate('student pt')
    if (!studentPackage) {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: 'Không tìm thấy gói học viên'
      })
    }

    if (String(studentPackage.pt._id) !== String(ptId)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        message: 'Bạn không có quyền tạo lịch cho gói này'
      })
    }

    const session = await Session.create({
      studentPackage: studentPackageId,
      pt: ptId,
      student: studentPackage.student._id,
      title: title || 'Buổi tập',
      startTime,
      endTime,
      status: 'scheduled'
    })

    return res.status(StatusCodes.CREATED).json({ success: true, data: session })
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: e.message
    })
  }
}

/** ✅ Lấy chi tiết 1 session + bài tập */
const getSessionDetail = async (req, res) => {
  try {
    const { id } = req.params
    const session = await Session.findById(id)
      .populate('studentPackage', 'package')
      .populate('student', 'name avatar')
      .populate('pt', 'name avatar')

    if (!session) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy buổi tập' })
    }

    const workoutItems = await WorkoutItem.find({ session: id })
    return res.status(StatusCodes.OK).json({ success: true, data: { session, workoutItems } })
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message })
  }
}

/** ✅ Cập nhật thông tin buổi tập (PT) */
const updateSession = async (req, res) => {
  try {
    const ptId = req.user._id
    const { id } = req.params
    const session = await Session.findById(id)
    if (!session) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy buổi tập' })
    }

    if (String(session.pt) !== String(ptId)) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Không được phép chỉnh sửa' })
    }

    const fields = ['title', 'startTime', 'endTime', 'status', 'ptNote']
    for (const field of fields) {
      if (req.body[field] !== undefined) session[field] = req.body[field]
    }

    await session.save()
    return res.status(StatusCodes.OK).json({ success: true, data: session })
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message })
  }
}

/** ✅ Xóa buổi tập (PT) */
const deleteSession = async (req, res) => {
  try {
    const ptId = req.user._id
    const { id } = req.params
    const session = await Session.findById(id)
    if (!session) return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: 'Không tìm thấy buổi tập' })
    if (String(session.pt) !== String(ptId)) {
      return res.status(StatusCodes.FORBIDDEN).json({ success: false, message: 'Không được phép xóa' })
    }

    await session.deleteOne()
    return res.status(StatusCodes.OK).json({ success: true, message: 'Đã xóa buổi tập' })
  } catch (e) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: e.message })
  }
}

export const sessionController = {
  getMySessions,
  createSession,
  getSessionDetail,
  updateSession,
  deleteSession
}
