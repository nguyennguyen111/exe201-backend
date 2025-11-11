// src/controllers/messageController.js
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import {
  createNotification,
} from "../services/notificationService.js";

/**
 * Lấy danh sách PT mà user đang có phòng chat
 * GET /api/messages/my-pts
 */
export const getMyPTs = async (req, res) => {
  try {
    const userId = req.user._id.toString(); // user đang đăng nhập

    // Tìm tất cả room có mình là participant
    const chats = await Chat.find({ participants: userId })
      // 🔧 thêm "name" vào populate
      .populate("participants", "name fullName avatar role")
      .lean();

    const seen = new Set();
    const pts = [];

    for (const c of chats) {
      // tìm người còn lại trong phòng chat, có role = 'pt'
      const peer = (c.participants || []).find(
        (p) => p._id.toString() !== userId && p.role === "pt"
      );
      if (!peer) continue;

      const pid = peer._id.toString();
      if (!seen.has(pid)) {
        seen.add(pid);
        pts.push(peer); // mỗi PT chỉ push 1 lần
      }
    }

    return res.json({ success: true, data: pts });
  } catch (err) {
    console.error("❌ getMyPTs error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * @desc Lấy lịch sử tin nhắn giữa 2 người (roomId = "userId-ptId")
 * @route GET /api/messages/:chatId
 */
export const getMessagesByChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!chatId || !chatId.includes("-")) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid chatId" });
    }

    const [id1, id2] = chatId.split("-");
    const chatDoc = await Chat.findOne({
      participants: { $all: [id1, id2] },
    });

    if (!chatDoc) {
      return res.json({ success: true, data: [] });
    }

    const messages = await Message.find({ chat: chatDoc._id })
      .populate("sender", "name fullName avatar role")
      .sort({ createdAt: 1 });

    return res.json({ success: true, data: messages });
  } catch (error) {
    console.error("❌ Error getting messages:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};

/**
 * @desc Gửi tin nhắn mới qua REST API (fallback khi không dùng socket)
 * @route POST /api/messages
 */
export const createMessage = async (req, res) => {
  try {
    const { chat, sender, text, attachments = [] } = req.body;
    if (!chat || !sender || !text) {
      return res.status(400).json({
        success: false,
        message: "Thiếu dữ liệu bắt buộc",
      });
    }

    const [id1, id2] = chat.split("-");
    let chatDoc = await Chat.findOne({
      participants: { $all: [id1, id2] },
    });
    if (!chatDoc) chatDoc = await Chat.create({ participants: [id1, id2] });

    const message = await Message.create({
      chat: chatDoc._id,
      sender,
      text,
      attachments,
    });

    chatDoc.lastMessage = { sender, text, timestamp: new Date() };
    await chatDoc.save();

    const populatedMsg = await message.populate(
      "sender",
      "name fullName avatar role"
    );

    // ===== TẠO NOTIFICATION =====
    try {
      // xác định người nhận: người còn lại trong roomId
      const receiverId = sender === id1 ? id2 : id1;

      // lấy role của người nhận để build URL đúng
      const receiverUser = await User.findById(receiverId).select("role");
      let url = "/chat";
      if (receiverUser?.role === "pt") {
        // PT dashboard
        url = `/pt/chat?peer=${sender}`;
      } else {
        // student app
        url = `/chat?peer=${sender}`;
      }

      await createNotification({
        user: receiverId,
        title: "Tin nhắn mới",
        message: text,
        type: "chat",
        meta: {
          url,
          peerId: sender,
          chatId: chat,
        },
      });
    } catch (notiErr) {
      console.error("❌ Error creating notification:", notiErr);
      // không throw để không làm fail gửi tin nhắn
    }

    return res
      .status(201)
      .json({ success: true, data: populatedMsg });
  } catch (error) {
    console.error("❌ Error creating message:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send message" });
  }
};
