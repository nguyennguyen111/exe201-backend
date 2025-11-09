// src/controllers/messageController.js
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

/**
 * @desc Lấy lịch sử tin nhắn giữa 2 người (roomId = "userId-ptId")
 * @route GET /api/messages/:chatId
 */
export const getMessagesByChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    if (!chatId || !chatId.includes("-")) {
      return res.status(400).json({ success: false, message: "Invalid chatId" });
    }

    const [id1, id2] = chatId.split("-");
    const chatDoc = await Chat.findOne({ participants: { $all: [id1, id2] } });

    if (!chatDoc) {
      return res.json({ success: true, data: [] });
    }

    const messages = await Message.find({ chat: chatDoc._id })
      .populate("sender", "fullName avatar role")
      .sort({ createdAt: 1 });

    return res.json({ success: true, data: messages });
  } catch (error) {
    console.error("❌ Error getting messages:", error);
    return res.status(500).json({ success: false, message: "Server error" });
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
      return res.status(400).json({ success: false, message: "Thiếu dữ liệu bắt buộc" });
    }

    const [id1, id2] = chat.split("-");
    let chatDoc = await Chat.findOne({ participants: { $all: [id1, id2] } });
    if (!chatDoc) chatDoc = await Chat.create({ participants: [id1, id2] });

    const message = await Message.create({
      chat: chatDoc._id,
      sender,
      text,
      attachments,
    });

    chatDoc.lastMessage = { sender, text, timestamp: new Date() };
    await chatDoc.save();

    const populatedMsg = await message.populate("sender", "fullName avatar role");

    return res.status(201).json({ success: true, data: populatedMsg });
  } catch (error) {
    console.error("❌ Error creating message:", error);
    return res.status(500).json({ success: false, message: "Failed to send message" });
  }
};
