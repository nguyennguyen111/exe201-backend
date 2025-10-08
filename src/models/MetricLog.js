// models/MetricLog.js
import mongoose from 'mongoose';

const metricLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true, default: () => new Date() },
  heightCm: Number,
  weightKg: Number,
  bmi: Number,
  bodyFatPct: Number,
  waistCm: Number,
  note: String
}, { timestamps: true });

metricLogSchema.index({ user: 1, date: -1 });
export default mongoose.model('MetricLog', metricLogSchema);
