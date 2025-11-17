// models/StudentPackage.js
import mongoose from 'mongoose'

const { Schema, model } = mongoose

const studentPackageSchema = new Schema(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pt: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    package: { type: Schema.Types.ObjectId, ref: 'Package' },
    transaction: { type: Schema.Types.ObjectId, ref: 'Transaction' },

    // 🆕 nếu bạn đã có Booking, nên lưu để trace ngược
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', default: null },

    // Tuỳ chọn: lưu danh sách session nếu muốn populate nhanh (có thể để sau)
    sessions: [{ type: Schema.Types.ObjectId, ref: 'Session' }],

    startDate: Date,
    endDate: Date,
    totalSessions: Number,
    remainingSessions: Number,

    // NEW: lịch cố định mà học viên chốt khi mua gói
    
    pattern: { type: [Number], default: [] },          // ví dụ [1,3,5]
    slot: { start: String, end: String },           // ví dụ "07:30" / "08:30"

    // NEW: khoá chuẩn hoá để tra cứu nhanh
    patternKey: { type: String, index: true },            // "1-3-5"
    slotKey: { type: String, index: true },            // "07:30-08:30"

    status: {
      type: String,
      enum: ['active', 'completed', 'expired', 'paused'],
      default: 'active'
    },

    // Gói do PT tự thêm (không qua thanh toán)
    isExternal: { type: Boolean, default: false },
    createdByPT: { type: Boolean, default: false },

  },
  { timestamps: true }
)

// ✅ INDEXES
studentPackageSchema.index({ pt: 1, status: 1 })
studentPackageSchema.index({ student: 1, status: 1 })
studentPackageSchema.index({ endDate: 1 })
studentPackageSchema.index({ transaction: 1 }, { unique: true })

// Index tổng hợp cho query khả dụng
studentPackageSchema.index(
  { pt: 1, package: 1, patternKey: 1, slotKey: 1, status: 1 }
);

// Helper chuẩn hoá
function makePatternKey(arr) {
  return (Array.isArray(arr) ? [...arr].sort((a, b) => a - b) : []).join('-');
}
function makeSlotKey(slot) {
  return slot?.start && slot?.end ? `${slot.start}-${slot.end}` : null;
}

// Gán key trước khi save
studentPackageSchema.pre('save', function (next) {
  this.patternKey = makePatternKey(this.pattern);
  this.slotKey = makeSlotKey(this.slot);
  next();
});

export default model('StudentPackage', studentPackageSchema)
