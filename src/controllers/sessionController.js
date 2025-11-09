import Session from '../models/Session.js'
import Notification from '../models/Notification.js'

/**
 * @desc Update session status or PT note
 * @route PUT /api/sessions/:id/status
 * @access Private (PT/Admin)
 */

export const updateSessionStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status, ptNote, attendance } = req.body
    const userId = req.user?._id  // từ middleware auth

    const session = await Session.findById(id)
      .populate('student', 'fullName email')
      .populate('pt', 'fullName')
      .populate('studentPackage', 'totalSessions')

    if (!session) {
      return res.status(404).json({ message: 'Không tìm thấy buổi tập.' })
    }

    // ✅ Kiểm tra quyền cập nhật
    const sessionPtId = session.pt?._id ? String(session.pt._id) : String(session.pt)
    const currentUserId = String(userId)
    if (sessionPtId !== currentUserId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Không có quyền cập nhật buổi tập này.' })
    }

    // ✅ Cập nhật dữ liệu
    if (status) session.status = status
    if (ptNote !== undefined) session.ptNote = ptNote
    if (attendance) session.attendance = attendance
    if (status === 'completed') session.completedAt = new Date()

    await session.save()

    // ✅ Tạo nội dung thông báo linh hoạt (🔥 FIX CHÍNH Ở ĐÂY)
    let message = `Trạng thái buổi tập "${session.title}" đã được cập nhật`
    if (status) message += `: ${status}`
    if (ptNote) message += `. Ghi chú huấn luyện viên: ${ptNote}`
    message += "."

    // ✅ Gửi thông báo cho học viên
    await Notification.create({
      user: session.student._id,
      type: 'session',
      title: 'Cập nhật buổi tập',
      message,
      meta: { sessionId: session._id, status, ptNote }
    })

    // ✅ Nếu PT vừa hoàn thành buổi cuối cùng trong gói tập
    if (status === 'completed') {
      const totalSessions = session.studentPackage?.totalSessions || 0
      const completedCount = await Session.countDocuments({
        studentPackage: session.studentPackage,
        status: 'completed'
      })

      if (totalSessions > 0 && completedCount >= totalSessions) {
        // ✅ Gửi thêm thông báo yêu cầu học viên feedback và đánh giá PT
        await Notification.create({
          user: session.student._id,
          type: 'session',
          title: 'Hoàn thành gói tập 🎉',
          message: `Bạn đã hoàn thành toàn bộ buổi tập trong gói! Vui lòng gửi phản hồi và đánh giá cho HLV ${session.pt.fullName}.`,
          meta: {
            ptId: session.pt._id,
            studentPackageId: session.studentPackage._id,
            feedbackRequest: true
          }
        })
      }
    }

    return res.json({
      message: 'Cập nhật buổi tập thành công',
      session
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Lỗi server', error: err.message })
  }
}


/**
 * @desc Lấy danh sách session của PT hiện tại
 * @route GET /api/sessions/pt
 * @access Private (PT)
 */
export const getSessionsByPT = async (req, res) => {
  try {
    const ptId = req.user._id;

    const sessions = await Session.find({ pt: ptId })
      .populate("studentPackage", "name totalSessions")
      .populate("student", "fullName name email phone avatar")
      .select(
        "_id title startTime endTime status attendance ptNote studentNote createdAt updatedAt student studentPackage pt"
      )
      .sort({ startTime: 1 });

    // ✅ Convert sang format frontend yêu cầu
    const mapped = sessions.map((s) => {
      const start = new Date(s.startTime);
      const end = new Date(s.endTime);

      start.setHours(start.getHours() + 7);
      end.setHours(end.getHours() + 7);

      const pad = (n) => n.toString().padStart(2, "0");
      const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
      const date = start.toISOString().slice(0, 10);

      return {
        ...s.toObject(),
        date,               // "2025-11-10"
        start: hhmm(start), // "13:00"
        end: hhmm(end),     // "14:00"
      };
    });

    res.status(200).json({
      success: true,
      data: mapped,
    });
  } catch (error) {
    console.error("❌ Lỗi getSessionsByPT:", error);
    res.status(500).json({ message: "Lỗi server khi tải session" });
  }
};
