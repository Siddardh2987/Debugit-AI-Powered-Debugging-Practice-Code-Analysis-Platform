import Stats from '../models/Stats.js';
import User from '../models/User.js';

// ─── Helper: Get or create stats doc ─────────────────────────────────────────

const getOrCreateStats = async (userId) => {
  let stats = await Stats.findOne({ userId });
  if (!stats) {
    stats = await Stats.create({ userId });
  }
  return stats;
};

// ─── Date / Category Helpers ────────────────────────────────────────────────

const toDateKey = (date = new Date()) => {
  return new Date(date).toISOString().split('T')[0];
};

const normalizeCategory = (category = '') => {
  const value = String(category || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/-/g, '');

  if (value.includes('frontend')) return 'frontend';
  if (value.includes('backend')) return 'backend';
  if (value.includes('fullstack') || value === 'both') return 'both';
  return category || '';
};

// ─── Helper: Build a consistent 6-month progress window ──────────────────────

const buildMonthlyProgress = (storedProgress) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();

  const window = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = months[d.getMonth()];
    const year = d.getFullYear();
    const formattedLabel = `${monthName} ${year}`;

    const entry = (storedProgress || []).find((m) => m.month === formattedLabel);
    window.push({ month: formattedLabel, solved: entry ? entry.solved : 0 });
  }

  return window;
};

// ─── GET /api/stats ───────────────────────────────────────────────────────────

export const getStats = async (req, res) => {
  try {
    const [stats, user] = await Promise.all([
      getOrCreateStats(req.user._id),
      User.findById(req.user._id).select('name email avatar problems_solved').lean()
    ]);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const statsPayload = {
      name:             user.name,
      email:            user.email,
      avatar:           user.avatar,
      solvedQuestions:  stats.solvedQuestions,
      averageScore:     stats.averageScore,
      currentStreak:    stats.currentStreak,
      bestStreak:       stats.bestStreak,
      hintsUsed:        stats.hintsUsed,
      questionsAsked:   stats.questionsAsked,
      projectsUploaded: stats.projectsUploaded,
      totalSessions:    stats.totalSessions,
      frontendSkill:    stats.frontendSkill,
      backendSkill:     stats.backendSkill,
      fullstackSkill:   stats.fullstackSkill,
      strengthAreas:    stats.strengthAreas,
      weakAreas:        stats.weakAreas,
      monthlyProgress:  buildMonthlyProgress(stats.monthlyProgress),
      recentActivity:   stats.recentActivity,
      problems_solved:  user.problems_solved || { frontend: 0, backend: 0, both: 0 }
    };

    return res.json({
      success: true,
      stats: statsPayload
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/stats/activity ──────────────────────────────────────────────────

export const getActivity = async (req, res) => {
  try {
    const stats = await getOrCreateStats(req.user._id);

    const today = new Date();
    const weeklyActivity = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = toDateKey(date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const activitiesOnDay = (stats.recentActivity || []).filter((act) => {
        const actDate = toDateKey(act.date);
        return actDate === dateStr;
      });

      weeklyActivity.push({
        day:       dayName,
        date:      dateStr,
        solved:    activitiesOnDay.filter((a) => a.score >= 70).length,
        attempted: activitiesOnDay.length,
        avgScore:  activitiesOnDay.length
          ? Math.round(
              activitiesOnDay.reduce((sum, a) => sum + a.score, 0) /
              activitiesOnDay.length
            )
          : 0
      });
    }

    const recentSubmissions = [...(stats.recentActivity || [])]
      .reverse()
      .slice(0, 20);

    return res.json({
      success: true,
      activity: {
        weeklyActivity,
        recentSubmissions,
        monthlyProgress: buildMonthlyProgress(stats.monthlyProgress),
        currentStreak:   stats.currentStreak,
        bestStreak:      stats.bestStreak
      }
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/stats/skills ────────────────────────────────────────────────────

export const getSkills = async (req, res) => {
  try {
    const stats = await getOrCreateStats(req.user._id);

    const radarData = [
      { subject: 'React',   A: Math.max(10, stats.frontendSkill) },
      { subject: 'Node.js', A: Math.max(10, stats.backendSkill) },
      { subject: 'MongoDB', A: Math.max(10, Math.round(stats.backendSkill * 0.9)) },
      { subject: 'Auth',    A: Math.max(10, stats.fullstackSkill) },
      { subject: 'Async',   A: Math.max(10, Math.round(stats.backendSkill * 0.85)) },
      { subject: 'CSS',     A: Math.max(10, Math.round(stats.frontendSkill * 0.8)) }
    ];

    const improvements = [];
    const strongAreas = [];

    if (stats.frontendSkill >= 60) strongAreas.push('Frontend');
    else improvements.push('Frontend');

    if (stats.backendSkill >= 60) strongAreas.push('Backend');
    else improvements.push('Backend');

    if (stats.fullstackSkill >= 60) strongAreas.push('Full Stack');
    else improvements.push('Full Stack');

    let recommendedCategory = 'both';
    if (improvements.includes('Frontend')) recommendedCategory = 'frontend';
    else if (improvements.includes('Backend')) recommendedCategory = 'backend';

    const recommendations = {
      strongAreas: strongAreas.length
        ? strongAreas
        : ['Keep practicing to build strong areas!'],
      improvements: improvements.length
        ? improvements
        : ['You are well-rounded — keep it up!'],
      weakAreas:           stats.weakAreas || [],
      recommendedCategory,
      message: improvements.length
        ? `Focus on ${improvements.join(' and ')} challenges to level up your weak areas.`
        : 'Great job! You are strong across all areas. Try harder challenges to push further!'
    };

    return res.json({
      success: true,
      skills: {
        frontendSkill:  stats.frontendSkill,
        backendSkill:   stats.backendSkill,
        fullstackSkill: stats.fullstackSkill,
        radarData,
        strengthAreas:  stats.strengthAreas || [],
        weakAreas:      stats.weakAreas || [],
        recommendations
      }
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Helper: Update stats after submission ────────────────────────────────────

export const updateStatsAfterSubmission = async (
  userId,
  challengeId,
  challengeTitle,
  category,
  score,
  feedback,
  strengths = [],
  improvements = []
) => {
  try {
    const stats = await getOrCreateStats(userId);
    const todayStr = toDateKey(new Date());
    const normalizedCategory = normalizeCategory(category);
    const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
    const passed = safeScore >= 70;

    const alreadySolved = (stats.recentActivity || []).some(
      (a) => String(a.challengeId) === String(challengeId) && a.score >= 70
    );

    const isNewSolve = passed && !alreadySolved;

    // 1. Solved count: increment only once per challenge.
    if (isNewSolve) {
      stats.solvedQuestions += 1;
    }

    // 2. Total sessions: every submission counts.
    stats.totalSessions += 1;

    // 3. Recent activity: every submission is recorded, capped to 50.
    stats.recentActivity.push({
      challengeId:    String(challengeId || ''),
      challengeTitle,
      category:       normalizedCategory,
      score:          safeScore,
      date:           new Date()
    });

    if (stats.recentActivity.length > 50) {
      stats.recentActivity.shift();
    }

    const totalEntries = stats.recentActivity.length;
    const scoreSum = stats.recentActivity.reduce((sum, a) => sum + (Number(a.score) || 0), 0);
    stats.averageScore = totalEntries ? Math.round(scoreSum / totalEntries) : 0;

    // 4. Streak calculation.
    const lastActivityKey = stats.lastActivityDate
      ? toDateKey(stats.lastActivityDate)
      : null;

    if (!lastActivityKey) {
      stats.currentStreak = 1;
    } else if (lastActivityKey !== todayStr) {
      const last = new Date(lastActivityKey);
      const todayD = new Date(todayStr);
      const diffDays = Math.round(Math.abs(todayD - last) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) stats.currentStreak += 1;
      else stats.currentStreak = 1;
    }

    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }

    stats.lastActivityDate = todayStr;

    // 5. Skill update.
    if (normalizedCategory === 'frontend') {
      stats.frontendSkill = Math.min(100, Math.max(0, Math.round((stats.frontendSkill + safeScore) / 2)));
    } else if (normalizedCategory === 'backend') {
      stats.backendSkill = Math.min(100, Math.max(0, Math.round((stats.backendSkill + safeScore) / 2)));
    } else if (normalizedCategory === 'both') {
      stats.fullstackSkill = Math.min(100, Math.max(0, Math.round((stats.fullstackSkill + safeScore) / 2)));
      stats.frontendSkill = Math.min(100, Math.max(0, Math.round((stats.frontendSkill + safeScore * 0.6) / 2)));
      stats.backendSkill = Math.min(100, Math.max(0, Math.round((stats.backendSkill + safeScore * 0.6) / 2)));
    }

    // 6. Weak areas.
    if (safeScore < 60) {
      if (normalizedCategory && !stats.weakAreas.includes(normalizedCategory)) {
        stats.weakAreas.push(normalizedCategory);
      }

      if (Array.isArray(improvements)) {
        improvements.forEach(item => {
          if (item && !stats.weakAreas.includes(item)) {
            stats.weakAreas.push(item);
          }
        });
      }
    }

    if (passed) {
      if (normalizedCategory) {
        const recentInCat = stats.recentActivity
          .filter((a) => a.category === normalizedCategory)
          .slice(-3);

        if (recentInCat.length >= 2 && recentInCat.every((a) => a.score >= 70)) {
          stats.weakAreas = stats.weakAreas.filter((a) => a !== normalizedCategory);
        }
      }

      if (Array.isArray(strengths)) {
        strengths.forEach(item => {
          stats.weakAreas = stats.weakAreas.filter(w => w !== item);
        });
      }
    }

    if (stats.weakAreas.length > 5) {
      stats.weakAreas = stats.weakAreas.slice(-5);
    }

    // 7. Strength areas.
    if (safeScore >= 80) {
      if (normalizedCategory && !stats.strengthAreas.includes(normalizedCategory)) {
        stats.strengthAreas.push(normalizedCategory);
      }

      if (Array.isArray(strengths)) {
        strengths.forEach(item => {
          if (item && !stats.strengthAreas.includes(item)) {
            stats.strengthAreas.push(item);
          }
        });
      }
    }

    if (stats.strengthAreas.length > 5) {
      stats.strengthAreas = stats.strengthAreas.slice(-5);
    }

    // 8. Monthly progress: increment solved count only for a new solve,
    // not for repeat successful submissions of the same challenge.
    const monthName = new Date().toLocaleDateString('en-US', { month: 'short' });
    const currentYear = new Date().getFullYear();
    const formattedMonthLabel = `${monthName} ${currentYear}`;
    const monthEntry = stats.monthlyProgress.find((m) => m.month === formattedMonthLabel);

    if (monthEntry) {
      if (isNewSolve) monthEntry.solved += 1;
    } else {
      stats.monthlyProgress.push({
        month: formattedMonthLabel,
        solved: isNewSolve ? 1 : 0
      });
    }

    // 9. Update embedded User problems_solved only for new solves.
    const user = await User.findById(userId);
    if (user && isNewSolve) {
      user.problems_solved = user.problems_solved || { frontend: 0, backend: 0, both: 0 };

      if (normalizedCategory === 'frontend') user.problems_solved.frontend += 1;
      else if (normalizedCategory === 'backend') user.problems_solved.backend += 1;
      else if (normalizedCategory === 'both') user.problems_solved.both += 1;

      await user.save();
    }

    await stats.save();
    console.log(`📊 Stats updated for ${userId} — score: ${safeScore}, streak: ${stats.currentStreak}`);

  } catch (err) {
    console.error('❌ updateStatsAfterSubmission failed:', err.message);
  }
};

// ─── Helper: Increment a single stat field ────────────────────────────────────

export const incrementStat = async (userId, field) => {
  const allowedFields = ['questionsAsked', 'hintsUsed', 'projectsUploaded', 'totalSessions', 'solvedQuestions'];

  if (!allowedFields.includes(field)) {
    console.warn(`⚠️ Blocked stat increment request for unauthorized field: ${field}`);
    return;
  }

  try {
    await Stats.findOneAndUpdate(
      { userId },
      { $inc: { [field]: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.error(`❌ incrementStat(${field}) failed:`, err.message);
  }
};

export default { getStats, getActivity, getSkills, updateStatsAfterSubmission, incrementStat };
