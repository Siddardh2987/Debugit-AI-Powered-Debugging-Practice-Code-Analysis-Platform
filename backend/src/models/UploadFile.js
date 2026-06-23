import mongoose from 'mongoose';

const uploadedFileSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserProject', required: true },
  fileName: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String, default: '' },
  content: { type: String, required: true },
  mimeType: { type: String, default: 'text/plain' },
  size: { type: Number, default: 0 }
}, {
  timestamps: true
});

uploadedFileSchema.index({ projectId: 1 });

export default mongoose.model('UploadedFile', uploadedFileSchema);