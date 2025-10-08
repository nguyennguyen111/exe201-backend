// models/PTWalletTransaction.js
import mongoose from 'mongoose';

const walletTxnSchema = new mongoose.Schema({
  pt: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['earning', 'withdraw', 'adjustment'], required: true },
  amount: { type: Number, required: true },
  refId: { type: mongoose.Schema.Types.ObjectId },
  refType: String,
  status: { type: String, enum: ['pending', 'completed'], default: 'completed' }
}, { timestamps: true });

export default mongoose.model('PTWalletTransaction', walletTxnSchema);
