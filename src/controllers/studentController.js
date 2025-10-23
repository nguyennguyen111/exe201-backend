import StudentProfile from "~/models/StudentProfile.js";

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
