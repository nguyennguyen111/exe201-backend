// models/PTProfile.js
import mongoose from 'mongoose';

const ptProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  bio: String,
  specialties: [String],
  certificates: [{ name: String, issuer: String, year: Number, url: String }],
  location: {
    city: String,
    district: String,
    address: String,
    coords: { type: { type: String, enum: ['Point'], default: 'Point' }, coordinates: [Number] }
  },
  verified: { type: Boolean, default: false },
  ratingAvg: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
}, { timestamps: true });

ptProfileSchema.index({ 'location.coords': '2dsphere' });

export default mongoose.model('PTProfile', ptProfileSchema);
