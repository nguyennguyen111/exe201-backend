// models/ActivityLog.js(theo dõi hành động hệ thống)
import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: String,
  action: String,
  entityType: String,
  entityId: mongoose.Schema.Types.ObjectId,
  ip: String,
  data: mongoose.Schema.Types.Mixed
}, { timestamps: true });

export default mongoose.model('ActivityLog', activityLogSchema);
