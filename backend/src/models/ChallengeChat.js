import mongoose from 'mongoose';

const challengeChatSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    challengeId: { type: String, required: true },
    chatHistory: [
      {
        role: { type: String, required: true }, 
        content: { type: String, required: true },
        isHint: { type: Boolean, default: false },
        hintLevel: { type: Number },
        timestamp: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

challengeChatSchema.index({ userId: 1, challengeId: 1 }, { unique: true });

export default mongoose.model('ChallengeChat', challengeChatSchema);
