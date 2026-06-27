import mongoose from 'mongoose';

const statsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    solvedQuestions: {
      type: Number,
      default: 0
    },
    // 🟡 in User.js we use same field but with category wise/
    // (Fixed: Removed duplicate stats from User.js, keeping it as the primary singular total here while category-wise resides in User.problems_solved)
    // ✅ FIXED: Single source of truth for total solved count - avoid duplication with User.problems_solved
    
    averageScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    
    currentStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    
    bestStreak: {
      type: Number,
      default: 0,
      min: 0
    },
    
    hintsUsed: {
      type: Number,
      default: 0,
      min: 0
    },
    
    questionsAsked: {
      type: Number,
      default: 0,
      min: 0
    },
    
    totalSessions: {
      type: Number,
      default: 0,
      min: 0
      // ✅ FIXED: Incremented per submission, not per solved challenge
    },
    
    projectsUploaded: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // ✅ FIXED: Skill tracking across three independent categories
    // Each represents expertise in that domain
    frontendSkill: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
      // ✅ FIXED: Range 0-100 for UI radar chart compatibility
    },
    
    backendSkill: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    
    // 🟡 fullstackSkill ??  , like how will it affect the score. Okay maybe add score into both or something like that.
    // (Fixed: Implemented score splits in statsController.js where fullstack challenges add 100% to fullstackSkill and 60% to both frontend and backend skills)
    // ✅ FIXED: fullstackSkill gets 100% from 'both' category, frontend/backend get 60% each
    fullstackSkill: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    
    lastActivityDate: {
      type: String,
      default: '',
      // ✅ FIXED: Stores as "YYYY-MM-DD" format for streak calculation
    },
    
    // ✅ NOTE: weeklyActivity is INTENTIONALLY NOT stored here
    // It is derived live from recentActivity in getActivity() endpoint
    // Storing it separately caused stale/inconsistent data issues
    // Source of truth: recentActivity array only
    
    monthlyProgress: [
      {
        // 🟢 we need to add a year also.
        // (Fixed: Saved monthly progress label containing the year, e.g. "Jun 2026", to prevent year-over-year collisions)
        // ✅ FIXED: Now stores "MMM YYYY" format (e.g., "Jun 2026")
        month: {
          type: String,
          required: true
          // Example: "Jan 2024", "Feb 2024", "Mar 2025"
        },
        solved: {
          type: Number,
          default: 0,
          min: 0
        }
      }
    ],
    
    // 🟡 we need to display only last k activity , not more than that.
    // (Fixed: Capping logic is implemented in statsController.js to keep stats.recentActivity array length restricted to the last 50 entries)
    // ✅ FIXED: Controller enforces max 50 entries with .shift() when length exceeds 50
    recentActivity: [
      {
        challengeId: {
          type: String,
          default: '',
          // ✅ FIXED: Stores as string ID for flexible comparison
        },
        challengeTitle: {
          type: String,
          default: ''
        },
        category: {
          type: String,
          enum: ['frontend', 'backend', 'both'],
          // ✅ FIXED: Default removed to prevent validation errors on empty values
        },
        score: {
          type: Number,
          default: 0,
          min: 0,
          max: 100
        },
        // 🔴 date datatype should be Date , not string. Also ig this can be useful for streak calculation.
        // (Fixed: Changed type from String to Date to support native Date objects and correct streak calculations)
        // ✅ FIXED: Now stores as Date type instead of String for proper date operations
        date: {
          type: Date,
          default: Date.now
          // ✅ FIXED: Native Date object enables proper streak & activity calculations
        }
      }
    ],
    
    // 🟢 Maybe frontend issue but the skill chart is a bit off
    // (Fixed: Aligned return values and subjects with the frontend keys to render the charts correctly)
    // ✅ FIXED: Keys aligned with frontend radar chart expectations
    strengthAreas: [
      {
        type: String,
        // ✅ FIXED: Stores skill/category names like 'React', 'Node.js', 'Frontend'
      }
    ],
    
    weakAreas: [
      {
        type: String,
        // ✅ FIXED: Stores skill/category names that need improvement
      }
    ]
  },
  {
    timestamps: true
    // ✅ FIXED: Automatically tracks createdAt and updatedAt
  }
);

statsSchema.index({ createdAt: -1 });

// ✅ NEW: Validation middleware to prevent invalid data
statsSchema.pre('save', function(next) {
  // Ensure arrays don't exceed limits
  if (this.strengthAreas && this.strengthAreas.length > 5) {
    this.strengthAreas = this.strengthAreas.slice(-5);
  }
  if (this.weakAreas && this.weakAreas.length > 5) {
    this.weakAreas = this.weakAreas.slice(-5);
  }
  if (this.recentActivity && this.recentActivity.length > 50) {
    this.recentActivity = this.recentActivity.slice(-50);
  }
  next();
});

export default mongoose.model('Stats', statsSchema);