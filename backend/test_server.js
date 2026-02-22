// Minimal test server to check if basic setup works
const express = require('express');
const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.post('/api/tg/notify-hit', (req, res) => {
  console.log('HIT NOTIFICATION RECEIVED:', req.body);
  res.json({ ok: true, message: 'Hit notification processed' });
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Test server running on http://0.0.0.0:${PORT}`);
});