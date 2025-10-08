import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true, // mỗi email chỉ 1 account
      sparse: true  // cho phép user không có email (tránh lỗi index duplicate null)
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // cho phép user không có phone
      trim: true,
      match: [/^0[0-9]{9}$/, 'Invalid Phone Number']
    },
    password: {
      type: String
      // ❌ bỏ required, để user Google không cần password
    },
    googleId: {
      type: String, // lưu Google sub id để map lại
      unique: true,
      sparse: true
    },
    role: {
      type: String,
      enum: ['student', 'admin', 'pt'],
      default: 'student'
    },
    name: {
      type: String,
      minlength: 2,
      maxlength: 30
    },
    avatar: {
      type: String,
      default: '' // URL ảnh
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other'
    },
    address: {
      type: String,
      default: ''
    },
    dob: {
      type: Date
    },
    penaltyPoints: {
      type: Number,
      default: 0
    },
    penaltyHistory: [
      {
        reason: String,
        date: Date
      }
    ],
    isActive: {
      type: Boolean,
      default: true
    },
    verified: {
      type: Boolean,
      default: false
    },
    refreshToken: {
      type: String,
      default: ''
    },
    resetPasswordToken: {
      type: String
    },
    resetTokenExpires: {
      type: Date
    }
  },
  {
    timestamps: true
  }
)


const User = mongoose.model('User', userSchema)
export default User
