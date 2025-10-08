// models/MealPlan.js
import mongoose from 'mongoose';

const mealPlanSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  note: String
}, { timestamps: true });

export default mongoose.model('MealPlan', mealPlanSchema);
