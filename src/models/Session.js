import mongoose from 'mongoose'

const sessionSchema = new mongoose.Schema({
  studentPackage: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'StudentPackage', 
    required: true 
  },
  pt: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },

  title: { 
    type: String, 
    default: 'Buổi tập' 
  },

  startTime: { 
    type: Date, 
    required: true 
  },
  endTime: { 
    type: Date, 
    required: true 
  },

  status: { 
    type: String, 
    enum: ['scheduled', 'completed', 'missed', 'rescheduled', 'cancelled'], 
    default: 'scheduled' 
  },

  attendance: { 
    type: String, 
    enum: ['present', 'absent', 'pending'], 
    default: 'pending' 
  },

  ptNote: { type: String, default: '' },
  studentNote: { type: String, default: '' }
}, { timestamps: true })

// ✅ INDEXES để tối ưu query
sessionSchema.index({ pt: 1, startTime: 1 })
sessionSchema.index({ student: 1, startTime: 1 })
sessionSchema.index({ studentPackage: 1, status: 1 })

export default mongoose.model('Session', sessionSchema)