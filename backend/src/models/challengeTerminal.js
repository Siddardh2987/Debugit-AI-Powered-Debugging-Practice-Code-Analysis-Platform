import mongoose from 'mongoose';

const challengeTerminalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    challengeId: { type: String, required: true },
    terminalLines: [{ type: String }]
  },
  {
    timestamps: true
  }
);

challengeTerminalSchema.index({ userId: 1, challengeId: 1 }, { unique: true });

export default mongoose.model('ChallengeTerminal', challengeTerminalSchema);