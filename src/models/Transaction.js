// models/Transaction.js
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pt: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ['payos'], default: 'payos' },
  status: { type: String, enum: ['initiated', 'pending_gateway', 'paid', 'failed', 'refunded'], default: 'initiated' },
  platformFee: { type: Number, default: 0 },  // giai đoạn đầu = 0%
  ptEarning: { type: Number, default: 0 },
  gatewayTxnId: String,
  checkoutUrl: String,
  webhookPayload: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export default mongoose.model('Transaction', transactionSchema);
