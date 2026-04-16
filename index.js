const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const qrcode = require('qrcode');
const app = express();
app.use(express.json());

let qrCodeData = '';
let isReady = false;

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-software-rasterizer'
    ]
  }
});

client.on('qr', async (qr) => {
  console.log('QR code generated — visit the URL to scan');
  qrCodeData = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
  console.log('WhatsApp client is ready!');
  isReady = true;
});

client.on('auth_failure', (msg) => {
  console.error('Auth failure:', msg);
  isReady = false;
});

client.on('disconnected', () => {
  console.log('WhatsApp disconnected');
  isReady = false;
});

// QR code page
app.get('/', (req, res) => {
  if (isReady) {
    res.send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:40px">
          <h1 style="color:green">✅ WhatsApp Connected!</h1>
          <p>Shiksha Nerd bot is running and ready to send messages.</p>
        </body>
      </html>
    `);
  } else if (qrCodeData) {
    res.send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:40px">
          <h1>Scan QR Code with WhatsApp</h1>
          <p>Open WhatsApp → Settings → Linked Devices → Link a Device</p>
          <img src="${qrCodeData}" style="width:300px;border:1px solid #ddd;border-radius:8px"/>
          <p style="color:gray">Refresh this page after scanning</p>
          <script>setTimeout(() => location.reload(), 5000)</script>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:40px">
          <h1>Starting up...</h1>
          <p>Refresh in 15 seconds</p>
          <script>setTimeout(() => location.reload(), 5000)</script>
        </body>
      </html>
    `);
  }
});

// Send message endpoint - called by n8n
app.post('/send', async (req, res) => {
  const { phone, message } = req.body;

  if (!isReady) {
    return res.status(503).json({ error: 'WhatsApp not connected yet' });
  }

  try {
    const chatId = phone.replace('+', '').replace(/\s/g, '') + '@c.us';
    await client.sendMessage(chatId, message);
    console.log(`Message sent to ${phone}`);
    res.json({ success: true, phone, message });
  } catch (err) {
    console.error('Send error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({ connected: isReady, qrReady: !!qrCodeData });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

client.initialize().catch(err => {
  console.error('Failed to initialize client:', err.message);
});
