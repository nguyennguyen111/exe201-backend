// models/StudentPackage.js
import mongoose from 'mongoose';

const studentPackageSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pt: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },

  startDate: Date,
  endDate: Date,
  totalSessions: Number,
  remainingSessions: Number,
  status: { type: String, enum: ['active', 'completed', 'expired', 'paused'], default: 'active' },

  isExternal: { type: Boolean, default: false }, // học viên ngoài app
  createdByPT: { type: Boolean, default: false },

  baselineMetric: {
    heightCm: Number,
    weightKg: Number,
    bmi: Number,
    bmr: Number,
    tdee: Number,
    activity: String,
    goal: { type: String, enum: ['lose', 'maintain', 'gain'] }
  },
  baselineMetricAt: Date
}, { timestamps: true });

export default mongoose.model('StudentPackage', studentPackageSchema);
