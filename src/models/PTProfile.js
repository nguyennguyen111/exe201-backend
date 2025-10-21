import mongoose from 'mongoose'
import { GeoPointSchema } from '~/models/_common.js'
const { Schema, model } = mongoose

const TravelPolicySchema = new Schema(
  {
    enabled:     { type: Boolean, default: true },
    freeRadiusKm:{ type: Number, default: 6,  min: 0 },
    maxTravelKm: { type: Number, default: 20, min: 0 },
    feePerKm:    { type: Number, default: 10000, min: 0 }
  },
  { _id: false }
)

// (giữ nguyên validate này nếu bạn muốn, còn không có thể bỏ hoàn toàn)
// TravelPolicySchema.pre('validate', ...)

const PTProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },

    // Gym cố định
    primaryGym: {
      name: { type: String, default: '' },
      address: { type: String, default: '' },
      location: { type: GeoPointSchema } // GeoJSON Point [lng, lat]
    },

    // === MỚI: kênh nhận dạy (PT chọn 1-3 cái) ===
    deliveryModes: {
      atPtGym:    { type: Boolean, default: true  }, // dạy tại gym của PT
      atClient:   { type: Boolean, default: false }, // dạy tại nhà/gym của học viên
      atOtherGym: { type: Boolean, default: false }  // dạy tại một gym khác (không phải primaryGym)
    },

    // Travel policy chỉ dùng khi atClient/atOtherGym = true
    travelPolicy: { type: TravelPolicySchema, default: () => ({}) },

    // Hiển thị/marketing
    coverImage: { type: String, default: '' },
    bio: { type: String, default: '' },
    specialties: { type: [String], default: [] },
    yearsExperience: { type: Number, min: 0, max: 50, default: 0, set: v => Math.trunc(v ?? 0) },
    certificates: [{ name: String, issuer: String, year: Number, url: String }],

    // Mô tả khu vực hoạt động (text)
    areaNote: { type: String, default: '' },

    // Trạng thái & rating
    availableForNewClients: { type: Boolean, default: true },
    verified: { type: Boolean, default: false },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },

    videoIntroUrl: { type: String, default: '' }
  },
  { timestamps: true }
)

// Index phục vụ tìm theo khoảng cách tới gym cố định của PT
PTProfileSchema.index({ 'primaryGym.location': '2dsphere' })

// Lọc nhanh theo trạng thái & kênh dạy (tuỳ chọn: thêm 2 field này nếu bạn lọc nhiều)
PTProfileSchema.index({ verified: 1, availableForNewClients: 1 })
PTProfileSchema.index({ 'deliveryModes.atPtGym': 1, 'deliveryModes.atClient': 1, 'deliveryModes.atOtherGym': 1 })

export default model('PTProfile', PTProfileSchema)
