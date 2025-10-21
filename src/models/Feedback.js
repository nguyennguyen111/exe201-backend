import mongoose from 'mongoose'
const { Schema, model } = mongoose

const FeedbackSchema = new Schema(
  {
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    sessionIndex: { type: Number }, // nếu feedback theo buổi; bỏ nếu theo gói
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pt: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // ⭐ Điểm & nhận xét
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },

    // Gắn với PTProfile để aggregate nhanh
    ptProfile: { type: Schema.Types.ObjectId, ref: 'PTProfile', required: true }
  },
  { timestamps: true }
)

FeedbackSchema.index({ ptProfile: 1, student: 1, booking: 1 }, { unique: true })

const Feedback = model('Feedback', FeedbackSchema)
export default Feedback
