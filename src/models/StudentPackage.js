// models/StudentPackage.js
import mongoose from 'mongoose'

const { Schema, model } = mongoose

const studentPackageSchema = new Schema(
  {
    student:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pt:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    package:  { type: Schema.Types.ObjectId, ref: 'Package' },
    transaction: { type: Schema.Types.ObjectId, ref: 'Transaction' },

    // 🆕 nếu bạn đã có Booking, nên lưu để trace ngược
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', default: null },

    // Tuỳ chọn: lưu danh sách session nếu muốn populate nhanh (có thể để sau)
    sessions: [{ type: Schema.Types.ObjectId, ref: 'Session' }],

    startDate: Date,
    endDate:   Date,
    totalSessions:     Number,
    remainingSessions: Number,

    status: { 
      type: String,
      enum: ['active', 'completed', 'expired', 'paused'],
      default: 'active'
    },

    // Gói do PT tự thêm (không qua thanh toán)
    isExternal:  { type: Boolean, default: false },
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
  },
  { timestamps: true }
)

// ✅ INDEXES
studentPackageSchema.index({ pt: 1, status: 1 })
studentPackageSchema.index({ student: 1, status: 1 })
studentPackageSchema.index({ endDate: 1 })
studentPackageSchema.index({ transaction: 1 }, { unique: true })

export default model('StudentPackage', studentPackageSchema)
