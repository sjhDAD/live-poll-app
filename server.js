require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Twilio client
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
const twilioPhone = process.env.TWILIO_PHONE;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory OTP store
const otpStore = new Map();

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(phone, { code, expires: Date.now() + 300000 });
  try {
    await client.messages.create({
      body: `Your verification code is ${code}`,
      from: twilioPhone,
      to: phone
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send SMS' });
  }
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { phone, code } = req.body;
  const record = otpStore.get(phone);
  if (!record) return res.status(400).json({ success: false, message: 'No OTP request found' });
  if (Date.now() > record.expires) {
    otpStore.delete(phone);
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }
  if (record.code !== code) {
    return res.status(400).json({ success: false, message: 'Invalid code' });
  }
  otpStore.delete(phone);
  res.json({ success: true });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(port, () => console.log(`Server running on port ${port}`));
