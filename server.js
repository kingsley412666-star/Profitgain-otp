/**
 * ProfitGain – TXTARO OTP Backend
 * Run: node server.js
 * Keep this file private. Never upload the API key to a public repo.
 */

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ========== PUT YOUR KEYS HERE (keep private) ==========
const TXTARO_API_KEY = process.env.TXTARO_API_KEY || 'txt_live_sk_EWWGP8wiDGB6SDFRJ6dIu9s1bFlOTYr2';
const TXTARO_WEBHOOK_SECRET = process.env.TXTARO_WEBHOOK_SECRET || 'whsec_okgJbiqxA2uAmNqKvPx7KnWIAc0Oooxt';
// ======================================================

const OTP_SEND_URL = 'https://otp.txtaro.com/api/v1/send';
const OTP_VERIFY_URL = 'https://otp.txtaro.com/api/v1/otp/verify';

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'ProfitGain OTP Backend' });
});

// SEND OTP
app.post('/api/otp/send', async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number is required' });
  }

  // Basic Ghana number check
  if (!phone.startsWith('+233') || phone.length < 12) {
    return res.status(400).json({ success: false, message: 'Please use a valid Ghana number (+233...)' });
  }

  try {
    const response = await fetch(OTP_SEND_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TXTARO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        identifier: phone,
        channel: 'sms'
      })
    });

    const data = await response.json();
    console.log('TXTARO send response:', JSON.stringify(data));

    if (data.success) {
      return res.json({
        success: true,
        message: 'OTP sent successfully',
        otp_id: data.data?.otp_id || null
      });
    }

    return res.status(400).json({
      success: false,
      message: data.message || data.error?.message || 'Failed to send OTP'
    });
  } catch (err) {
    console.error('Send OTP error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error while sending OTP' });
  }
});

// VERIFY OTP
app.post('/api/otp/verify', async (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ success: false, message: 'Phone and code are required' });
  }

  try {
    const response = await fetch(OTP_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + TXTARO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        identifier: phone,
        code: String(code)
      })
    });

    const data = await response.json();
    console.log('TXTARO verify response:', JSON.stringify(data));

    if (data.success) {
      return res.json({ success: true, message: 'OTP verified successfully' });
    }

    return res.status(400).json({
      success: false,
      message: data.message || data.error?.message || 'Invalid or expired OTP'
    });
  } catch (err) {
    console.error('Verify OTP error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error while verifying OTP' });
  }
});

// Optional: Webhook receiver (for TXTARO status updates)
app.post('/api/webhooks/txtaro', (req, res) => {
  const crypto = require('crypto');
  const signature = req.headers['x-txtaro-signature'] || '';
  const payload = JSON.stringify(req.body);

  // Verify signature if secret is set
  if (TXTARO_WEBHOOK_SECRET && TXTARO_WEBHOOK_SECRET.startsWith('whsec_')) {
    const expected = crypto
      .createHmac('sha256', TXTARO_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    if (signature && signature !== expected) {
      console.warn('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  console.log('Webhook event:', req.body?.event, req.body?.data);
  res.json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('ProfitGain OTP Backend running on http://localhost:' + PORT);
  console.log('Endpoints:');
  console.log('  POST /api/otp/send');
  console.log('  POST /api/otp/verify');
  console.log('  POST /api/webhooks/txtaro');
});
