// models/Session.js
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  studentPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentPackage', required: true },
  pt: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },

  status: { type: String, enum: ['scheduled', 'completed', 'missed', 'rescheduled', 'cancelled'], default: 'scheduled' },
  attendance: { type: String, enum: ['present', 'absent', 'pending'], default: 'pending' },

  ptNote: String,
  studentNote: String
}, { timestamps: true });

export default mongoose.model('Session', sessionSchema);
