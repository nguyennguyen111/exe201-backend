// models/WorkoutItem.js
import mongoose from 'mongoose';

const workoutItemSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  name: String,
  sets: { type: Number, default: 3 },
  reps: { type: Number, default: 10 },
  weight: Number,
  restSec: Number,
  note: String
}, { timestamps: true });

export default mongoose.model('WorkoutItem', workoutItemSchema);
