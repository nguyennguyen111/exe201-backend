import Session from '../models/Session.js'

// API gộp xem lịch tập (tương lai, hiện tại, quá khứ)
export const getTrainingSessions = async (req, res) => {
  try {
    const { userId, role, type } = req.query
    const now = new Date()

    let filterBase = role === 'pt' ? { pt: userId } : { student: userId }

    //Điều kiện thời gian theo type
    let timeFilter = {}
    switch (type) {
      case 'upcoming':
        timeFilter = { startTime: { $gt: now } } // sau thời điểm hiện tại
        break
      case 'ongoing':
        timeFilter = { startTime: { $lte: now }, endTime: { $gte: now } } // đang diễn ra
        break
      case 'history':
        timeFilter = { endTime: { $lt: now } } // đã kết thúc
        break
      default:
        timeFilter = {} // nếu không truyền type thì lấy tất cả
    }

    const filter = { ...filterBase, ...timeFilter }

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
    console.error(err)
    res.status(500).json({
      success: false,
      message: 'Error fetching training sessions'
    })
  }
}
