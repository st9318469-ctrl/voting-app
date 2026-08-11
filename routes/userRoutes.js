const express = require('express');
const router = express.Router();
const User = require('./../models/user');
const { jwtAuthMiddleware, generateToken } = require('./../jwt');

const sanitizeUser = (user) => {
  const data = user.toObject ? user.toObject() : user;
  delete data.password;
  return data;
};

const getDuplicateMessage = (err) => {
  const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
  if (field === 'aadharCardNumber') return 'Aadhaar number is already registered';
  if (field === 'email') return 'Email is already registered';
  return 'Duplicate value for unique field';
};

const validateSignup = ({ name, email, mobile, address, aadharCardNumber, password }) => {
  if (!name || !email || !mobile || !address || !aadharCardNumber || !password) {
    return 'Please fill all required fields';
  }

  if (!/^\d{12}$/.test(String(aadharCardNumber))) {
    return 'Aadhaar number must be exactly 12 digits';
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return 'Please enter a valid email address';
  }

  if (String(password).length < 6) {
    return 'Password must be at least 6 characters';
  }

  return '';
};

const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.get('/', (req, res) => {
  res.json({ message: 'User routes are working' });
});

router.post(['/signup', '/register'], async (req, res) => {
  try {
    const validationError = validateSignup(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const newUser = new User(req.body);
    const response = await newUser.save();
    const token = generateToken({ id: response.id });
    const user = sanitizeUser(response);

    res.status(201).json({ response: user, user, token });
  } catch (err) {
    console.log(err);

    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: 'Validation failed', details: err.message });
    }
    if (err.code === 11000) {
      return res.status(400).json({ error: getDuplicateMessage(err), details: err.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, aadharCardNumber, password } = req.body;

    if ((!email && !aadharCardNumber) || !password) {
      return res.status(400).json({ error: 'Email/Aadhaar and password are required' });
    }

    const user = await User.findOne(
      email ? { email: email.toLowerCase() } : { aadharCardNumber: aadharCardNumber }
    );

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken({ id: user.id });
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/forgot-password', async (req, res) => {
  try {
    const { email, aadharCardNumber, newPassword } = req.body;

    if (!email || !aadharCardNumber || !newPassword) {
      return res.status(400).json({ error: 'Email, Aadhaar number, and new password are required' });
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (!/^\d{12}$/.test(String(aadharCardNumber))) {
      return res.status(400).json({ error: 'Aadhaar number must be exactly 12 digits' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      aadharCardNumber,
    });

    if (!user) {
      return res.status(404).json({ error: 'No account found with this email and Aadhaar number' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password reset successfully. Please login with your new password.' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', jwtAuthMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/users', jwtAuthMiddleware, requireAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'voter' }).select('-password').sort({ name: 1 });
    res.status(200).json(users);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/admin/stats', jwtAuthMiddleware, requireAdmin, async (req, res) => {
  try {
    const [totalVoters, votedCount] = await Promise.all([
      User.countDocuments({ role: 'voter' }),
      User.countDocuments({ role: 'voter', isVoted: true }),
    ]);

    res.status(200).json({
      totalVoters,
      votedCount,
      pendingVoters: totalVoters - votedCount,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile/password', jwtAuthMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);

    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated' });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
