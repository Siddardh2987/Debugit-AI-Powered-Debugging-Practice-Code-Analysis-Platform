import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challengeId: { type: String, required: true }, 
  score: { type: Number, required: true },
  feedback: { type: String },
  strengths: [{ type: String }],
  improvements: [{ type: String }],
  perFile: [{
    filename: String,
    score: Number,
    fixed: Boolean,
    comment: String
  }],
  isSolved: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

submissionSchema.index({ userId: 1, submittedAt: -1 });

export default mongoose.model('Submission', submissionSchema);
