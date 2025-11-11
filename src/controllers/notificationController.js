import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

/**
 * 📋 Get all notifications of the current user
 */
export const getMyNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await Notification.find({
      user: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    // 🛠️ FIX 1: Gói dữ liệu trả về trong object "items" + thêm totalUnread cho frontend
    const totalUnread = await Notification.countDocuments({
      user: new mongoose.Types.ObjectId(userId),
      read: false,
    });

    res.status(StatusCodes.OK).json({
      items: notifications, // ✅ Trả về danh sách thông báo trong "items" (frontend yêu cầu)
      totalUnread,          // ✅ Số thông báo chưa đọc, hiển thị trên icon chuông
    });
  } catch (error) {
    console.error("❌ getMyNotifications error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error fetching notifications",
      error: error.message,
    });
  }
};

/**
 * ✅ Mark a single notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    // 🛠️ FIX 2: Thêm xử lý 404 khi không tìm thấy + StatusCodes chuẩn hóa
    const updated = await markNotificationAsRead(req.params.id);
    if (!updated) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Notification not found" });
    }

    res.status(StatusCodes.OK).json({
      message: "Notification marked as read",
      notification: updated,
    });
  } catch (error) {
    console.error("❌ markAsRead error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error updating notification status",
      error: error.message,
    });
  }
};

/**
 * ✅ Mark all notifications as read
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    await markAllNotificationsAsRead(userId);

    // 🛠️ FIX 3: Trả về lại tổng số chưa đọc (remaining) để frontend cập nhật badge real-time
    const remaining = await Notification.countDocuments({
      user: new mongoose.Types.ObjectId(userId),
      read: false,
    });

    res.status(StatusCodes.OK).json({
      message: "All notifications marked as read",
      totalUnread: remaining, // ✅ Trả về số thông báo chưa đọc còn lại
    });
  } catch (error) {
    console.error("❌ markAllAsRead error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error marking all as read",
      error: error.message,
    });
  }
};

/**
 * 🟢 Mark feedback as sent
 * (Used when student sends feedback to PT)
 */
export const markFeedbackSent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const noti = await Notification.findOne({
      _id: id,
      user: new mongoose.Types.ObjectId(userId),
    });

    if (!noti) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Notification not found" });
    }

    // 🛠️ FIX 4: Thêm mới hoàn toàn hàm này để cập nhật trạng thái feedbackSent trong meta
    noti.meta = { ...(noti.meta || {}), feedbackSent: true };
    await noti.save();

    res.status(StatusCodes.OK).json({
      message: "Feedback notification marked as sent",
      notification: noti,
    });
  } catch (error) {
    console.error("❌ markFeedbackSent error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error updating feedback notification",
      error: error.message,
    });
  }
};
