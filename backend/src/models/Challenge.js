import mongoose from 'mongoose';

const challengeFileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  language: { type: String, required: true },
  type: { type: String, required: true }, 
  buggyCode: { type: String, required: true },
  correctCode: { type: String, required: true },
  bugExplanation: { type: String }
});

const challengeFileRuleSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  mustIncludeAny: [{ type: String }],
  mustExclude: [{ type: String }]
});

const hintSchema = new mongoose.Schema({
  level: { type: Number, required: true }, 
  text: { type: String, required: true }
});

const challengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, enum: ['frontend', 'backend', 'both'] },
  difficulty: { type: String, required: true, enum: ['easy', 'medium', 'hard'] },
  tags: [{ type: String }],
  hints: [hintSchema],
  files: [challengeFileSchema],
  solutionFiles: [challengeFileSchema],
  evaluationRules: {
    fileRules: [challengeFileRuleSchema]
  },
  solvers: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 }
}, {
  timestamps: true
});

challengeSchema.index({ category: 1, difficulty: 1 });

export default mongoose.model('Challenge', challengeSchema);
