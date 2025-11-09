import StudentPackage from '../models/StudentPackage.js';
import Package from '../models/Package.js';
import User from '../models/User.js';
import PTProfile from '../models/PTProfile.js';
import { StatusCodes } from 'http-status-codes';


// ---- Endpoint ----
// GET /api/pt/me/verification-status
export const isPTVerified = async (req, res) => {
  try {
    const ptId = req.user._id

    const profile = await PTProfile.findOne({ user: ptId }).select('verified').lean()

    // Nếu chưa có hồ sơ -> coi như chưa verified
    const verified = !!profile?.verified

    return res.status(StatusCodes.OK).json({ verified })
  } catch (err) {
    console.error('isPTVerified error:', err)
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: 'Server error' })
  }
}

// 🧠 Lấy tất cả học viên của PT (dựa trên gói)
export const getMyStudents = async (req, res) => {
  try {
    const ptId = req.user._id;

    const packages = await StudentPackage.find({ pt: ptId })
      .populate("student", "name avatar email phone")
      .populate("package", "name totalSessions durationDays")
      .lean();

    // 🧠 Map lại chỉ trả về thông tin học viên thật
    const students = packages
      .filter(pkg => pkg.student) // lọc gói có student hợp lệ
      .map(pkg => ({
        _id: pkg.student._id, // ✅ id học viên thật
        name: pkg.student.name,
        avatar: pkg.student.avatar,
        email: pkg.student.email,
        phone: pkg.student.phone,
        packageId: pkg._id, // lưu để theo dõi gói nếu cần
        packageName: pkg.package?.name,
        totalSessions: pkg.package?.totalSessions,
        durationDays: pkg.package?.durationDays,
      }));

    res.json(students);
  } catch (err) {
    console.error("❌ getMyStudents error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// 🏷️ Lấy danh sách gói template của PT
export const getMyPackages = async (req, res) => {
  const ptId = req.user._id;
  const list = await Package.find({ pt: ptId, isActive: true }).lean();
  res.json(list);
};

// ➕ Tạo gói cho học viên
export const createStudentPackage = async (req, res) => {
  const { student, package: pkgId, totalSessions, durationDays, startDate } = req.body;
  const stu = await User.findById(student).lean();
  if (!stu || stu.role !== 'student') return res.status(400).json({ message: 'Invalid student' });

  let ts = totalSessions, dd = durationDays;
  if (pkgId) {
    const pkg = await Package.findById(pkgId).lean();
    if (!pkg || String(pkg.pt) !== String(req.user._id))
      return res.status(400).json({ message: 'Package not found / not owned' });
    ts = ts ?? pkg.totalSessions;
    dd = dd ?? pkg.durationDays;
  }
  if (!ts || !dd) return res.status(400).json({ message: 'totalSessions/durationDays required' });

  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(start);
  end.setDate(end.getDate() + dd);

  const newPkg = await StudentPackage.create({
    student,
    pt: req.user._id,
    package: pkgId || undefined,
    startDate: start,
    endDate: end,
    totalSessions: ts,
    remainingSessions: ts,
    status: 'active',
    createdByPT: true
  });

  res.status(201).json(newPkg);
};

// ✏️ Cập nhật gói
export const updateStudentPackage = async (req, res) => {
  const pkg = await StudentPackage.findOne({ _id: req.params.id, pt: req.user._id });
  if (!pkg) return res.status(404).json({ message: 'Not found' });

  Object.assign(pkg, req.body);
  if (pkg.remainingSessions > pkg.totalSessions)
    pkg.remainingSessions = pkg.totalSessions;
  await pkg.save();

  res.json(pkg);
};
// 🧩 Lấy tất cả PT (dành cho admin)
export const getAllPTs = async (req, res) => {
  try {
    // Lấy danh sách user có role là 'pt' (Personal Trainer)
    const pts = await User.find({ role: "pt" })
      .lean()
      .sort({ createdAt: -1 });

    res.status(200).json(pts);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách PT:", error);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách PT" });
  }
};
export const ptController = {
  isPTVerified,
  getMyStudents,
  getMyPackages,
  createStudentPackage,
  updateStudentPackage,
  getAllPTs,
};