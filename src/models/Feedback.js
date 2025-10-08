// models/Feedback.js
import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, min: 1, max: 5 },
  comment: String,
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session' },
  studentPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentPackage' }
}, { timestamps: true });

export default mongoose.model('Feedback', feedbackSchema);
