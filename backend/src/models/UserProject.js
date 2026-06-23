import mongoose from 'mongoose';

const userProjectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, default: 'Untitled Project' },
    description: { type: String, default: '' },
    fileCount: { type: Number, default: 0 },
    summarized: { type: Boolean, default: false },
    summarizing: { type: Boolean, default: false },
    summarizationError: { type: String, default: null },
    chatHistory: [
      {
        role: { type: String, required: true }, // 'user' or 'assistant'
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

userProjectSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('UserProject', userProjectSchema);