// models/PTProfile.js
import mongoose from 'mongoose'

const ptProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    required: true
  },

  // Ảnh bìa hiển thị trên profile
  coverImage: {
    type: String,
    default: ''
  },

  // Mô tả bản thân, kinh nghiệm, triết lý huấn luyện
  bio: {
    type: String,
    default: ''
  },

  // Các lĩnh vực chuyên môn
  specialties: {
    type: [String],
    default: []
  },

  // Số năm kinh nghiệm
  yearsExperience: {
    type: Number,
    min: 0,
    max: 50,
    default: 0
  },

  // Danh sách chứng chỉ
  certificates: [
    {
      name: { type: String, default: '' },
      issuer: { type: String, default: '' },
      year: { type: Number },
      url: { type: String, default: '' }
    }
  ],

  // ✅ Khu vực hoạt động / mô tả phạm vi (tự do, không gắn phòng gym)
  gymLocation: {
    type: String,
    default: '',
    // ví dụ: "Q7 & lân cận", hoặc "Online only", hoặc "TP.HCM (Q7, Q4)"
  },

  // Thông tin địa lý (nếu muốn dùng map hoặc lọc theo vị trí)
  location: {
    address: { type: String, default: '' },
    coords: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [lng, lat]
        default: [0, 0]
      }
    }
  },

  // Có đang nhận học viên mới không
  availableForNewClients: {
    type: Boolean,
    default: true
  },

  // Trạng thái xác minh của PT
  verified: {
    type: Boolean,
    default: false
  },

  // Đánh giá trung bình & tổng lượt đánh giá
  ratingAvg: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  ratingCount: {
    type: Number,
    default: 0
  },

  // Mạng xã hội & video giới thiệu (tùy chọn)
  socials: {
    facebook: { type: String, default: '' },
    instagram: { type: String, default: '' },
    tiktok: { type: String, default: '' }
  },
  videoIntroUrl: {
    type: String,
    default: ''
  }

}, { timestamps: true })

// INDEXES
ptProfileSchema.index({ 'location.coords': '2dsphere' })
ptProfileSchema.index({ verified: 1, availableForNewClients: 1 })

export default mongoose.model('PTProfile', ptProfileSchema)
