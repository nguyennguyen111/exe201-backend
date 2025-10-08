// models/UserMetric.js(chỉ số cơ thể hiện tại)
import mongoose from 'mongoose';

const userMetricSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  heightCm: Number,
  weightKg: Number,
  age: Number,
  gender: { type: String, enum: ['male', 'female', 'other'] },
  activity: { type: String, enum: ['sedentary', 'light', 'moderate', 'active', 'athlete'], default: 'light' },
  goal: { type: String, enum: ['lose', 'maintain', 'gain'], default: 'maintain' },
  bmi: Number,
  bmr: Number,
  tdee: Number,
  note: String,
  shareWithPTByDefault: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('UserMetric', userMetricSchema);
