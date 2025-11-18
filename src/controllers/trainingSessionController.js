import Session from '../models/Session.js'

// ✅ API lấy danh sách lịch tập (lọc theo user, vai trò, gói, thời gian)
export const getTrainingSessions = async (req, res) => {
  try {
    const { userId, role, type, packageId } = req.query
    const now = new Date()

    // 🧠 Cơ sở lọc theo role
    let filterBase = role === 'pt' ? { pt: userId } : { student: userId }

    // 🧩 Nếu có packageId → chỉ lấy lịch của gói đó
    if (packageId) {
      filterBase.studentPackage = packageId
    }

    // ⏱️ Lọc theo loại thời gian
    let timeFilter = {}
    switch (type) {
      case 'upcoming':
        timeFilter = { startTime: { $gt: now } }
        break
      case 'ongoing':
        timeFilter = { startTime: { $lte: now }, endTime: { $gte: now } }
        break
      case 'history':
        timeFilter = { endTime: { $lt: now } }
        break
      default:
        timeFilter = {}
    }

    const filter = { ...filterBase, ...timeFilter }

    // console.log('📥 Query filter:', filter)
    if (!(req.query.role === 'student' && req.query.packageId)) {
      console.log('📥 Query filter:', filter)
    }
    const sessions = await Session.find(filter)
      .populate('student', 'name email')
      .populate('pt', 'name email')
      .populate('studentPackage', 'name')
      .populate('slot')
      .sort({ startTime: 1 })

    res.status(200).json({
      success: true,
      message: `Fetched ${type || 'all'} training sessions successfully`,
      sessions
    })
  } catch (err) {
    console.error('❌ Lỗi khi lấy training sessions:', err)
    res.status(500).json({
      success: false,
      message: 'Error fetching training sessions',
      error: err.message
    })
  }
}
