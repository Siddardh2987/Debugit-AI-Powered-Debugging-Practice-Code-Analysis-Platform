import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  language: { type: String, required: true },
  type: { type: String, required: true }, // 'frontend' or 'backend'
  buggyCode: { type: String, required: true },
  correctCode: { type: String }, // 🟡 user only gives buggy code , so are we storing the correct code here??.
  bugExplanation: { type: String }
});

const fileRuleSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  mustIncludeAny: [{ type: String }],
  mustExclude: [{ type: String }]
});

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, enum: ['frontend', 'backend', 'both'] }, // 'frontend', 'backend', 'both'
  // 🔴 why does project have difficulty. Only challenges should have it.
  // 🔴 Also why are we keeping this as string , we should keep it string-enum similar to challenge , or else any value is valid.
  tags: [{ type: String }],
  hint: { type: String }, // 🟡 hint is optional , so no required field.
  files: [fileSchema],
  evaluationRules: {
    fileRules: [fileRuleSchema]
  },
  // 🔴 why does project have solvers and accuracy. Only challenges should have them.
}, {
  timestamps: true
});

export default mongoose.model('Project', projectSchema);
