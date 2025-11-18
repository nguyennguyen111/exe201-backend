// src/sockets/chatSocket.js
import { Server } from 'socket.io'
import Chat from '../models/Chat.js'
import Message from '../models/Message.js'
import { createNotification } from '../services/notificationService.js'

export const initChatSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true
    }
  })

  io.on('connection', (socket) => {
    console.log('⚡ Client connected:', socket.id)

    // Nếu client có truyền userId qua query thì join luôn
    const userId = socket.handshake?.query?.userId
    if (userId) {
      socket.join(String(userId))
      console.log(`👤 ${socket.id} joined user room ${userId} (query)`)
    }

    // Fallback: client sẽ emit 'registerUser' ngay sau khi connect
    socket.on('registerUser', (uid) => {
      if (!uid) return
      socket.join(String(uid))
      console.log(`👤 ${socket.id} joined user room ${uid} (registerUser)`)
    })

    // Tham gia / rời room hội thoại
    socket.on('joinRoom', (roomId) => {
      if (!roomId) return
      socket.join(roomId)
      console.log(`✅ ${socket.id} joined room ${roomId}`)
    })

    socket.on('leaveRoom', (roomId) => {
      if (!roomId) return
      socket.leave(roomId)
      console.log(`🚪 ${socket.id} left room ${roomId}`)
    })

    // Gửi tin nhắn + tạo/emit notification
    socket.on('sendMessage', async (message) => {
      try {
        const { room, sender, text, attachments = [] } = message
        if (!room || !sender || !text) {
          console.warn('⚠️ Missing message data:', message)
          return
        }

        const [id1, id2] = room.split('-')
        let chatDoc = await Chat.findOne({ participants: { $all: [id1, id2] } })
        if (!chatDoc) chatDoc = await Chat.create({ participants: [id1, id2] })

        const newMsg = await Message.create({
          chat: chatDoc._id,
          sender,
          text,
          attachments
        })
        chatDoc.lastMessage = { sender, text, timestamp: new Date() }
        await chatDoc.save()

        const populatedMsg = await newMsg.populate(
          'sender',
          'fullName avatar role'
        )
        const payload = { ...populatedMsg.toObject(), room }

        io.to(room).emit('receiveMessage', payload)

        const receiverId = String(sender) === String(id1) ? id2 : id1
        const noti = await createNotification({
          user: receiverId,
          type: 'message',
          title: 'Tin nhắn mới',
          message: text.slice(0, 120),
          meta: { room, senderId: sender }
        })

        io.to(String(receiverId)).emit('notification', {
          id: noti._id,
          type: noti.type,
          title: noti.title,
          message: noti.message,
          data: noti.meta,
          createdAt: noti.createdAt
        })

        console.log('💬 Message sent + saved:', room)
      } catch (err) {
        console.error('❌ Socket sendMessage error:', err)
      }
    })

    socket.on('typing', (roomId) => {
      if (!roomId) return
      socket.to(roomId).emit('userTyping', { roomId })
    })

    socket.on('stopTyping', (roomId) => {
      if (!roomId) return
      socket.to(roomId).emit('userStopTyping', { roomId })
    })

    socket.on('markAsRead', ({ roomId, userId }) => {
      if (!roomId) return
      io.to(roomId).emit('messagesRead', { roomId, userId })
    })

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id)
    })
  })

  // ✅ Cho phép các controller khác gọi emit notification realtime
  global.sendNotificationToUser = (userId, payload) => {
    io.to(String(userId)).emit('notification', payload)
    console.log(`📩 [Realtime] Sent notification to user ${userId}`)
  }
  // Emit realtime khi buổi tập được cập nhật
  global.emitSessionUpdate = (studentId, payload) => {
    io.to(String(studentId)).emit('session_updated', payload)
    console.log(`📩 [Realtime] Sent session update to student ${studentId}`)
  }
}
