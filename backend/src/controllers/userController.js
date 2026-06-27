import bcrypt from 'bcryptjs';
import User from '../models/User.js';


export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-refreshToken -verifyOtp -verifyOtpExpireAt -resetOtp -resetOtpExpireAt')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hasPassword = !!user.passwordHash;

    return res.json({
      success: true,
      user: {
        id:                user._id,
        name:              user.name,
        email:             user.email,
        username:          user.username || null,
        usernameSet:       user.usernameSet || false,
        avatar:            user.avatar,
        authProvider:      user.authProvider,
        isAccountVerified: user.isAccountVerified,
        createdAt:         user.createdAt,
        hasPassword
      }
    });

  } catch (err) {
    console.error('getUserProfile error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { name, avatar, username } = req.body;

    if (name !== undefined && typeof name !== 'string') {
      return res.status(400).json({ success: false, message: 'Name must be a string' });
    }
    if (avatar !== undefined && typeof avatar !== 'string') {
      return res.status(400).json({ success: false, message: 'Avatar must be a string' });
    }
    if (username !== undefined && typeof username !== 'string') {
      return res.status(400).json({ success: false, message: 'Username must be a string' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name !== undefined) {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      }
      if (trimmedName.length > 100) {
        return res.status(400).json({ success: false, message: 'Name must be less than 100 characters' });
      }
      user.name = trimmedName;
    }

    if (username !== undefined) {
      if (user.usernameSet) {
        return res.status(400).json({ success: false, message: 'Username can only be set once and cannot be changed.' });
      }

      const trimmedUsername = username.trim().toLowerCase();

      if (!trimmedUsername) {
        return res.status(400).json({ success: false, message: 'Username cannot be empty' });
      }
      if (trimmedUsername.length < 3) {
        return res.status(400).json({ success: false, message: 'Username must be at least 3 characters' });
      }
      if (trimmedUsername.length > 30) {
        return res.status(400).json({ success: false, message: 'Username must be less than 30 characters' });
      }
      if (!/^[a-z0-9_.-]+$/.test(trimmedUsername)) {
        return res.status(400).json({ success: false, message: 'Username can only contain lowercase letters, numbers, underscores, dots, and hyphens' });
      }

      // Check uniqueness
      const existing = await User.findOne({ username: trimmedUsername, _id: { $ne: user._id } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'This username is already taken. Please choose another.' });
      }

      user.username = trimmedUsername;
      user.usernameSet = true;
    }

    if (avatar !== undefined) {
      const trimmedAvatar = avatar.trim();
      if (trimmedAvatar.length > 500) {
        return res.status(400).json({ success: false, message: 'Avatar string is too long (max 500 characters)' });
      }
      user.avatar = trimmedAvatar || user.name.charAt(0).toUpperCase();
    }

    await user.save();

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id:          user._id,
        name:        user.name,
        email:       user.email,
        username:    user.username || null,
        usernameSet: user.usernameSet,
        avatar:      user.avatar
      }
    });

  } catch (err) {
    console.error('updateUserProfile error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const hasPassword = !!user.passwordHash;

    if (hasPassword) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: 'Current password is required' });
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }
      if (newPassword === currentPassword) {
        return res.status(400).json({ success: false, message: 'New password must be different from current password' });
      }
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirmation are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must contain at least one uppercase letter' });
    }

    if (!/[0-9]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: 'New password must contain at least one number' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    if (user.authProvider === 'google') {
      user.authProvider = 'local_google';
    }
    await user.save();

    return res.json({ success: true, message: 'Password saved successfully!' });

  } catch (err) {
    console.error('changePassword error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

export default { getUserProfile, updateUserProfile, changePassword };