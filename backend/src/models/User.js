import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // ─── Auth Fields ───────────────────────────────────────────────────────────
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  username: { type: String, default: null, sparse: true }, 
  usernameSet: { type: Boolean, default: false },             
  passwordHash: { type: String },
  googleId: { type: String },
  authProvider: { type: String, default: 'local' },
  avatar: { type: String, default: 'U' },
  isAccountVerified: { type: Boolean, default: false },
  verifyOtp: { type: String, default: '' },
  verifyOtpExpireAt: { type: Date, default: null },
  refreshToken: { type: String, default: null },
  resetOtp: { type: String, default: '' },
  resetOtpExpireAt: { type: Date, default: null },

  problems_solved: {
    frontend: { type: Number, default: 0 },
    backend: { type: Number, default: 0 },
    both: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);