// models/Transaction.js
import mongoose from 'mongoose'

const transactionSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  pt: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  package: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Package', 
    required: true 
  },

  amount: { type: Number, required: true },
  method: { 
    type: String, 
    enum: ['payos'], 
    default: 'payos' 
  },

  // ✅ trạng thái giao dịch
  status: { 
    type: String, 
    enum: ['initiated', 'pending_gateway', 'paid', 'failed', 'refunded', 'cancelled'], 
    default: 'initiated' 
  },

  // ✅ phí nền tảng và phần của PT
  platformFee: { type: Number, default: 0 },
  ptEarning: { type: Number, default: 0 },

  // ✅ thông tin từ PayOS
  gatewayTxnId: String,
  payosOrderCode: { type: Number },// Mã đơn hàng từ PayOS
  payosCheckoutUrl: { type: String }, // URL QR (ghi rõ hơn, backup cho checkoutUrl)

  // ✅ khi PayOS gửi webhook về, bạn có thể lưu nội dung
  webhookPayload: mongoose.Schema.Types.Mixed,

  paidAt: Date
}, { timestamps: true })

// ✅ INDEXES
transactionSchema.index({ student: 1, createdAt: -1 })
transactionSchema.index({ pt: 1, status: 1 })
transactionSchema.index({ gatewayTxnId: 1 })
transactionSchema.index({ payosOrderCode: 1 })

export default mongoose.model('Transaction', transactionSchema)
