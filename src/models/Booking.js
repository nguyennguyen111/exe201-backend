import mongoose from 'mongoose'
const { Schema, model } = mongoose

const bookingSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  pt:      { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  package: { type: Schema.Types.ObjectId, ref: 'Package', required: true, index: true },

  // các slot sẽ bị giữ khi tạo booking
  slots:   [{ type: Schema.Types.ObjectId, ref: 'Slot', required: true }],

  status: {
    type: String,
    enum: ['PENDING_PAYMENT','PAID','CANCELLED','REFUNDED'],
    default: 'PENDING_PAYMENT',
    index: true
  },

  // TTL: auto-cancel khi hết hạn
  expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },

  // liên kết thanh toán (nếu cần tìm ngược từ booking)
  transaction: { type: Schema.Types.ObjectId, ref: 'Transaction' },

  // snapshot tiền (tuỳ chọn, để hiển thị nhanh)
  amount: Number,
  currency: { type: String, default: 'VND' }
}, { timestamps: true })

// Mức tối thiểu: unique theo (student, status=PENDING_PAYMENT) để tránh tạo 2 booking pending cùng lúc (tùy muốn)
bookingSchema.index(
  { student: 1, status: 1 },
  { partialFilterExpression: { status: 'PENDING_PAYMENT' } }
)

export default model('Booking', bookingSchema)
