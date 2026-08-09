const express = require('express');
const router = express.Router();

const { jwtAuthMiddleware, generateToken } = require('./../jwt');
const User = require('./../models/user');
const Candidate = require('./../models/candidate');

const checkAdminRole = async (userID) => {
  try {
    const user = await User.findById(userID);
    return user.role === 'admin';
  } catch (err) {
    return false;
  }
};

router.get('/', (req, res) => {
  res.json({ message: 'Candidate routes are working' });
});

router.post('/', jwtAuthMiddleware, async (req, res) => {
  try {
    if (!checkAdminRole(req.user.id)){
      console.log("admin role not found ")
      return res.status(403).json({ message: 'user has not admin role' });
    }
    const data = req.body;

    // create a new candidate document using the mongoose model
    const newCandidate = new Candidate(data);

    // save the new candidate to the database
    const response = await newCandidate.save();
    console.log('data saved');

    const payload = {
      id: response.id,
    };

    console.log(JSON.stringify(payload));
    const token = generateToken(payload);
    console.log('token is:', token);

    res.status(200).json({ response: response });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:candidateID', jwtAuthMiddleware, async (req, res) => {
  try {
    if (!(await checkAdminRole(req.user.id)))
      return res.status(403).json({ message: 'user does not have admin role' });

    const candidateId = req.params.candidateID;
    const updateCandidateData = req.body;

    const response = await Candidate.findByIdAndUpdate(candidateId, updateCandidateData, {
      new: true,
      runValidators: true,
    });

    if (!response) {
      return res.status(404).json({ error: 'candidate not found' });
    }

    console.log('data updated');
    res.status(200).json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.delete('/:candidateID', jwtAuthMiddleware, async (req, res) => {
  try {
    if (!(await checkAdminRole(req.user.id)))
      return res.status(403).json({ message: 'user does not have admin role' });

    const candidateId = req.params.candidateID;

    const response = await Candidate.findByIdAndDelete(candidateId);

    if (!response) {
      return res.status(404).json({ error: 'candidate not found' });
    }

    console.log('candidate deleted');
    res.status(200).json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
