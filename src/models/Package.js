// models/Package.js
import mongoose from 'mongoose';

const packageSchema = new mongoose.Schema({
  pt: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  description: String,
  price: Number,
  totalSessions: Number,
  durationDays: Number,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Package', packageSchema);
