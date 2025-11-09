// src/controllers/feedbackController.js
import Feedback from "../models/Feedback.js";
import PTProfile from "../models/PTProfile.js";

/**
 * @desc Tạo feedback mới
 * @route POST /api/feedbacks
 */
export const createFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.create(req.body);

    // Cập nhật điểm trung bình PT
    const all = await Feedback.find({ ptProfile: feedback.ptProfile });
    const avg = all.reduce((sum, f) => sum + f.rating, 0) / all.length;

    await PTProfile.findByIdAndUpdate(feedback.ptProfile, {
      averageRating: avg.toFixed(1),
    });

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    console.error("Create feedback error:", error);
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc Lấy tất cả feedback của 1 PT
 * @route GET /api/feedbacks/pt/:ptId
 */
export const getFeedbackByPT = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ pt: req.params.ptId })
      .populate("student", "fullName avatar")
      .sort({ createdAt: -1 });

    const avgRating =
      feedbacks.reduce((s, f) => s + f.rating, 0) / (feedbacks.length || 1);

    res.json({ success: true, avgRating, data: feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
