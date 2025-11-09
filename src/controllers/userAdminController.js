import User from "../models/User.js";
import { StatusCodes } from "http-status-codes";
import PTProfile from "../models/PTProfile.js";
import PTApprovalRequest from "../models/PTApprovalRequest.js";
import { createNotification } from "../services/notificationService.js";
import mongoose from "mongoose";
import {
  sendNewPTRequestEmail,
  sendPTApprovedEmail,
  sendPTRejectedEmail,
} from "../utils/mailer.js";
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();

    res.status(200).json(users);
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Lỗi server" });
  }
};

const blockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!user)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Không tìm thấy người dùng" });
    res.json({ message: "Đã khóa người dùng", user });
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Lỗi server" });
  }
};

const unlockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    if (!user)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Không tìm thấy người dùng" });
    res.json({ message: "Đã mở khóa người dùng", user });
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Lỗi server" });
  }
};

const countCustomers = async (req, res) => {
  try {
    const totalCustomers = await User.countDocuments({ role: "student" });
    res.status(StatusCodes.OK).json({
      success: true,
      totalCustomers,
    });
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: "Lỗi server" });
  }
};
/**
 * ===========================
 * 🧩 DUYỆT HỒ SƠ PT (ADMIN)
 * ===========================
 */

// 📋 Lấy danh sách yêu cầu PT
const getAllPTRequests = async (req, res) => {
  try {
    const requests = await PTApprovalRequest.find()
      .populate("user", "name email")
      .populate("ptProfile", "bio specialties verified location photo")
      .sort({ createdAt: -1 });

    res.status(StatusCodes.OK).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Lỗi server khi lấy danh sách yêu cầu PT",
      error: error.message,
    });
  }
};

// 🔍 Lấy chi tiết 1 yêu cầu PT
const getPTRequestDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await PTApprovalRequest.findById(id)
      .populate("user", "name avatar email phone gender dob isActive")
      .populate("ptProfile", "bio specialties verified location photos");

    if (!request)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Không tìm thấy yêu cầu" });

    res.status(StatusCodes.OK).json({ success: true, data: request });
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Lỗi server khi lấy chi tiết yêu cầu",
      error: error.message,
    });
  }
};

// ✅ Admin duyệt hoặc từ chối hồ sơ PT
const reviewPTRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    const adminId = req.user._id || req.user.id;

    const request = await PTApprovalRequest.findById(id)
      .populate("user")
      .populate("ptProfile");

    if (!request)
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Không tìm thấy yêu cầu" });

    if (request.status !== "pending")
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Yêu cầu đã được xử lý" });

    // ✅ Chuyển adminId sang ObjectId để Mongoose chấp nhận
    const adminObjectId = new mongoose.Types.ObjectId(adminId);

    if (action === "approve") {
      request.status = "approved";
      request.reviewedBy = adminObjectId;
      request.reviewedAt = new Date();
      request.logs.push({
        action: "approve",
        by: adminObjectId,
        note: "Admin duyệt hồ sơ",
        at: new Date(),
      });
      await request.save();

      await PTProfile.findByIdAndUpdate(request.ptProfile._id, {
        verified: true,
      });

      await createNotification({
        user: request.user._id,
        title: "Hồ sơ PT đã được duyệt ✅",
        message: "Chúc mừng! Hồ sơ PT của bạn đã được duyệt thành công.",
      });

      await sendPTApprovedEmail(request.user.email, request.user.name);
    }

    if (action === "reject") {
      request.status = "rejected";
      request.rejectReason = reason || "Không rõ lý do";
      request.reviewedBy = adminObjectId;
      request.reviewedAt = new Date();
      request.logs.push({
        action: "reject",
        by: adminObjectId,
        note: reason,
        at: new Date(),
      });
      await request.save();

      await createNotification({
        user: request.user._id,
        title: "Hồ sơ PT bị từ chối ❌",
        message: `Lý do: ${reason || "Không rõ lý do"}`,
      });

      await sendPTRejectedEmail(request.user.email, request.user.name, reason);
    }

    res.status(StatusCodes.OK).json({
      message: "Đã xử lý yêu cầu",
      status: request.status,
    });
  } catch (error) {
    console.error("❌ reviewPTRequest error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Lỗi server khi xử lý duyệt PT",
      error: error.message,
    });
  }
};

/**
 * ===========================
 * EXPORT CONTROLLER
 * ===========================
 */
export const userAdminController = {
  getAllUsers,
  blockUser,
  unlockUser,
  countCustomers,
  getAllPTRequests,
  getPTRequestDetail,
  reviewPTRequest,
};
