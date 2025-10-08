// models/PTWallet.js
import mongoose from 'mongoose';

const ptWalletSchema = new mongoose.Schema({
  pt: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  balance: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('PTWallet', ptWalletSchema);
