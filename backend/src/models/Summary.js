import mongoose from 'mongoose';

const summarySchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserProject',
      required: true,
      index: true
    },
    chunkId: {
      type: Number,
      required: true
    },
    fileNames: [
      {
        type: String,
        required: true
      }
    ],
    summary: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
);

summarySchema.index({ projectId: 1, chunkId: 1 });

export default mongoose.model('Summary', summarySchema);