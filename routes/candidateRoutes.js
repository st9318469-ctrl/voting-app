const express = require('express');
const router = express.Router();

const { jwtAuthMiddleware } = require('./../jwt');
const User = require('./../models/user');
const Candidate = require('./../models/candidate');

const checkAdminRole = async (userID) => {
  const user = await User.findById(userID);
  return user?.role === 'admin';
};

const validateCandidate = ({ name, party, age }) => {
  if (!name || !party || !age) return 'Candidate name, party, and age are required';
  if (Number(age) < 18) return 'Candidate age must be at least 18';
  return '';
};

router.get('/', async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ voteCount: -1, name: 1 });
    res.status(200).json(candidates);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/results', async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ voteCount: -1, name: 1 });
    const totalVotes = candidates.reduce((sum, candidate) => sum + (candidate.voteCount || 0), 0);
    const topVotes = candidates[0]?.voteCount || 0;

    const results = candidates.map((candidate) => ({
      _id: candidate._id,
      name: candidate.name,
      party: candidate.party,
      age: candidate.age,
      voteCount: candidate.voteCount || 0,
      percentage: totalVotes ? Math.round(((candidate.voteCount || 0) / totalVotes) * 10000) / 100 : 0,
      isWinner: totalVotes > 0 && candidate.voteCount === topVotes,
    }));

    res.status(200).json({ totalVotes, winner: results.find((candidate) => candidate.isWinner) || null, results });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', jwtAuthMiddleware, async (req, res) => {
  try {
    if (!(await checkAdminRole(req.user.id))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const validationError = validateCandidate(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const response = await new Candidate(req.body).save();
    res.status(201).json({ response });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:candidateID', jwtAuthMiddleware, async (req, res) => {
  try {
    if (!(await checkAdminRole(req.user.id))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const validationError = validateCandidate(req.body);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const response = await Candidate.findByIdAndUpdate(req.params.candidateID, req.body, {
      new: true,
      runValidators: true,
    });

    if (!response) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.status(200).json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:candidateID', jwtAuthMiddleware, async (req, res) => {
  try {
    if (!(await checkAdminRole(req.user.id))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const response = await Candidate.findByIdAndDelete(req.params.candidateID);

    if (!response) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.status(200).json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/vote/:candidateID', jwtAuthMiddleware, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateID);
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Admin is not allowed to vote' });
    }

    if (user.isVoted) {
      return res.status(400).json({ error: 'You have already voted' });
    }

    candidate.votes.push({ user: user._id });
    candidate.voteCount += 1;
    await candidate.save();

    user.isVoted = true;
    await user.save();

    res.status(200).json({
      message: 'Vote recorded successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        address: user.address,
        aadharCardNumber: user.aadharCardNumber,
        role: user.role,
        isVoted: user.isVoted,
      },
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/vote/count', async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ voteCount: -1 });

    const voteRecord = candidates.map((data) => ({
      party: data.party,
      count: data.voteCount,
    }));

    return res.status(200).json(voteRecord);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
