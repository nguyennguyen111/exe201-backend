import {
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../services/notificationService.js";
import Notification from "../models/Notification.js";
import mongoose from "mongoose";
import { StatusCodes } from "http-status-codes";

/**
 * 📋 Lấy danh sách thông báo của user hiện tại
 */
export const getMyNotifications = async (req, res) => {
  try {
    // ✅ Fix: dùng _id thay vì id
    const userId = req.user._id || req.user.id;
    const limit = parseInt(req.query.limit) || 20;

    const notifications = await Notification.find({
      user: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(StatusCodes.OK).json(notifications);
  } catch (error) {
    console.error("❌ getMyNotifications error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Lỗi khi lấy thông báo",
      error: error.message,
    });
  }
};

/**
 * ✅ Đánh dấu 1 thông báo là đã đọc
 */
export const markAsRead = async (req, res) => {
  try {
    const updated = await markNotificationAsRead(req.params.id);
    if (!updated) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Không tìm thấy thông báo" });
    }
    res.status(StatusCodes.OK).json({
      message: "Đã đánh dấu thông báo là đã đọc",
      notification: updated,
    });
  } catch (error) {
    console.error("❌ markAsRead error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Lỗi khi cập nhật trạng thái đọc",
      error: error.message,
    });
  }
};

/**
 * ✅ Đánh dấu tất cả là đã đọc
 */
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    await markAllNotificationsAsRead(userId);
    res
      .status(StatusCodes.OK)
      .json({ message: "Đã đánh dấu tất cả thông báo là đã đọc" });
  } catch (error) {
    console.error("❌ markAllAsRead error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Lỗi khi cập nhật tất cả thông báo",
      error: error.message,
    });
  }
};

/**
 * 🟢 Đánh dấu feedback đã gửi
 * (Dành cho Student sau khi đánh giá HLV)
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
        .json({ message: "Không tìm thấy thông báo" });
    }

    // ✅ Cập nhật meta.feedbackSent = true
    noti.meta = { ...(noti.meta || {}), feedbackSent: true };
    await noti.save();

    res.status(StatusCodes.OK).json({
      message: "Đã đánh dấu thông báo feedback là đã gửi",
      notification: noti,
    });
  } catch (error) {
    console.error("❌ markFeedbackSent error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Lỗi khi cập nhật thông báo feedback",
      error: error.message,
    });
  }
};
