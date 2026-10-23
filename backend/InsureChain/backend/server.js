const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

const userSchema = new mongoose.Schema({
  aadhaarNumber: { type: String, required: true, unique: true },
  dob: { type: String, required: true }
});

// Hash the DOB before saving (Treating DOB as the password)
userSchema.pre('save', async function () {
  if (!this.isModified('dob')) return;
  this.dob = await bcrypt.hash(this.dob, 10);
});

const User = mongoose.model('User', userSchema);

app.post('/register', async (req, res) => {
  try {
    const { aadhaarNumber, dob } = req.body;

    if (!/^\d{12}$/.test(aadhaarNumber)) {
      return res.status(400).json({ error: 'Aadhaar must be exactly 12 digits' });
    }

    const existingUser = await User.findOne({ aadhaarNumber });
    if (existingUser) return res.status(400).json({ error: 'Aadhaar number already registered' });

    const user = new User({ aadhaarNumber, dob });
    await user.save();
    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    console.error("REGISTRATION ERROR:", err); 
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { aadhaarNumber, dob } = req.body;
    const user = await User.findOne({ aadhaarNumber });

    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(dob, user.dob);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    res.json({ token, redirectUrl: '/metamask.html' }); 
  } catch (err) {
    console.error("LOGIN ERROR:", err); 
    res.status(500).json({ error: 'Server error during login.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));