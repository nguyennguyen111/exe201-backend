// src/controllers/studentController.js
import StudentPackage from "../models/StudentPackage.js";
import { StatusCodes } from "http-status-codes";
import StudentProfile from '../models/StudentProfile.js'
import User from '../models/User.js'

export const getMyPTs = async (req, res) => {
  try {
    const studentId = req.user._id;

    const packages = await StudentPackage.find({
      student: studentId,
      status: "active",
    })
      .populate("pt", "name avatar email phone")
      .populate({
        path: "package",
        select: "name totalSessions durationDays",
      })
      .lean();

    const pts = packages
      .filter(pkg => pkg.pt)
      .map(pkg => ({
        _id: pkg.pt._id,
        name: pkg.pt.name,
        avatar: pkg.pt.avatar,
        email: pkg.pt.email,
        phone: pkg.pt.phone,
        packageId: pkg._id,
        packageName: pkg.package?.name,
        totalSessions: pkg.package?.totalSessions,
        durationDays: pkg.package?.durationDays,
        startDate: pkg.startDate,
        endDate: pkg.endDate,
        remainingSessions: pkg.remainingSessions,
        status: pkg.status,
      }));

    return res.status(StatusCodes.OK).json({
      success: true,
      data: pts,
    });
  } catch (err) {
    console.error("❌ getMyPTs error:", err);
    return res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Server error" });
  }
};


export const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .lean()

    res.status(StatusCodes.OK).json(students)
  } catch (error) {
    console.error('Lỗi khi lấy danh sách student:', error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Lỗi server',
      error: error.message
    })
  }
};

/** -------------------------------
 * Hàm xác định phân loại BMI
 * ------------------------------- */
const getBmiCategory = (bmi) => {
    if (bmi < 18.5) return "Gầy (Ectomorph)";
    if (bmi >= 18.5 && bmi < 25) return "Bình thường (Mesomorph)";
    if (bmi >= 25 && bmi < 30) return "Hơi béo (Endomorph)";
    return "Béo phì (Endomorph)";
};

/** -------------------------------
 * Controller cập nhật BMI cho Student
 * ------------------------------- */
export const studentController = {
    updateBMI: async (req, res) => {
        try {
            const { heightCm, weightKg } = req.body;
            const userId = req.user?._id;

            // --- 1. KIỂM TRA DỮ LIỆU ---
            if (!userId) {
                return res.status(401).json({ message: "User chưa đăng nhập" });
            }
            if (!heightCm || !weightKg) {
                return res.status(400).json({ message: "Thiếu dữ liệu chiều cao hoặc cân nặng" });
            }

            // --- 2. TÍNH BMI ---
            const bmiValue = weightKg / ((heightCm / 100) ** 2);
            const bmi = bmiValue.toFixed(2); // ✅ Đảm bảo BMI là string khi trả về
            const bmiCategory = getBmiCategory(bmiValue);

            // --- 3. CẬP NHẬT HOẶC TẠO MỚI PROFILE ---
            const updatedProfile = await StudentProfile.findOneAndUpdate(
                { user: userId },
                {
                    heightCm,
                    weightKg,
                    bmi, // lưu dạng string
                    bmiCategory,
                },
                { new: true, upsert: true }
            );

            // --- 4. PHẢN HỒI VỀ CLIENT ---
            res.status(200).json({
                success: true,
                message: "✅ Đã cập nhật BMI thành công",
                data: updatedProfile,
            });
        } catch (err) {
            console.error("❌ Lỗi lưu BMI:", err);
            if (err.name === "ValidationError" || err.name === "CastError") {
                return res.status(400).json({
                    message: "Dữ liệu gửi lên không đúng định dạng.",
                    details: err.message,
                });
            }
            res.status(500).json({ message: "Lỗi server khi lưu BMI" });
        }
    },
};
