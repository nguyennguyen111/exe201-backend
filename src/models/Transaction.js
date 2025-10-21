import mongoose from 'mongoose'

const { Schema, model } = mongoose

const transactionSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pt:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    package: { type: Schema.Types.ObjectId, ref: 'Package', required: true },

    // 💡 Liên kết tới Booking mới (thêm)
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },

    amount: { type: Number, required: true },
    method: { type: String, enum: ['payos'], default: 'payos' },

    // ✅ trạng thái giao dịch
    status: { 
      type: String, 
      enum: ['initiated', 'pending_gateway', 'paid', 'failed', 'refunded', 'cancelled'], 
      default: 'initiated',
      index: true
    },

    // ✅ phí nền tảng và phần của PT
    platformFee: { type: Number, default: 0 },
    ptEarning:   { type: Number, default: 0 },

    // ✅ thông tin từ PayOS
    gatewayTxnId:     String,
    payosOrderCode:   { type: Number },         // Mã đơn hàng từ PayOS
    payosCheckoutUrl: { type: String },         // URL QR
    payosInvoiceId:   { type: String, index: { unique: true, sparse: true } }, // để check trùng webhook

    // ✅ log webhook
    webhookPayload: Schema.Types.Mixed,

    paidAt: Date
  },
  { timestamps: true }
)

// ✅ INDEXES
transactionSchema.index({ student: 1, createdAt: -1 })
transactionSchema.index({ pt: 1, status: 1 })
transactionSchema.index({ gatewayTxnId: 1 })
transactionSchema.index({ payosOrderCode: 1 })

export default model('Transaction', transactionSchema)
