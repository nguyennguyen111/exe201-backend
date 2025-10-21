// models/Package.js
import mongoose from 'mongoose'
const { Schema, model } = mongoose

const TravelPricingSchema = new Schema(
  {
    enabled:      { type: Boolean, default: false },   // bật định giá di chuyển ở cấp gói
    freeRadiusKm: { type: Number, default: 6,  min: 0 },
    maxTravelKm:  { type: Number, default: 20, min: 0 },
    feePerKm:     { type: Number, default: 10000, min: 0 }
  },
  { _id: false }
)

const packageSchema = new Schema(
  {
    pt: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Tên gói: unique trong phạm vi 1 PT
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 80 },

    description: { type: String, trim: true, maxlength: 1000 },

    // Giá mỗi buổi (VND, integer)
    price: { type: Number, default: 0, min: 0, max: 100_000_000 },

    // Quy mô gói
    totalSessions:      { type: Number, required: true, min: 1, max: 500 },
    sessionDurationMin: { type: Number, required: true, min: 15, max: 300 },
    durationDays:       { type: Number, required: true, min: 1, max: 3650 },

    // Trạng thái
    isActive: { type: Boolean, default: true },

    // Phạm vi hiển thị
    visibility: { type: String, enum: ['private', 'public'], default: 'private' },

    // Gói áp dụng tại đâu (case 1/2/3)
    supports: {
      atPtGym:    { type: Boolean, default: true },
      atClient:   { type: Boolean, default: true },
      atOtherGym: { type: Boolean, default: true }
    },

    // Override travel policy của PT (nếu bật)
    travelPricing: { type: TravelPricingSchema, default: () => ({}) },


    // Tag để phân loại (ví dụ: giảm cân, tăng cơ,…)
    tags: { type: [String], default: [] }
  },
  { timestamps: true }
)

// Indexes
packageSchema.index({ pt: 1, name: 1 }, { unique: true })       // unique name per PT
packageSchema.index({ pt: 1, isActive: 1 })                      // listing nhanh
packageSchema.index({ tags: 1 })                                 // filter theo tag
packageSchema.index({ name: 'text', description: 'text' })       // search text

// Làm sạch dữ liệu cơ bản
packageSchema.pre('validate', function (next) {
  if (typeof this.name === 'string') this.name = this.name.trim()
  if (typeof this.description === 'string') this.description = this.description.trim()
  if (typeof this.price === 'number') this.price = Math.round(this.price)
  next()
})

export default model('Package', packageSchema)
