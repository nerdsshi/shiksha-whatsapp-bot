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
    executablePath: '/usr/bin/google-chrome-stable' ,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ]
  }
});

client.on('qr', async (qr) => {
  console.log('QR code generated');
  qrCodeData = await qrcode.toDataURL(qr);
});

client.on('ready', () => {
  console.log('WhatsApp client is ready!');
  isReady = true;
});

client.on('disconnected', () => {
  console.log('WhatsApp disconnected');
  isReady = false;
});

app.get('/', (req, res) => {
  if (isReady) {
    res.send('<h1>✅ WhatsApp Connected!</h1><p>Bot is running and ready to send messages.</p>');
  } else if (qrCodeData) {
    res.send(`
      <h1>Scan QR Code with WhatsApp</h1>
      <p>Open WhatsApp → Linked Devices → Link a Device</p>
      <img src="${qrCodeData}" style="width:300px"/>
      <p>Refresh this page after scanning</p>
    `);
  } else {
    res.send('<h1>Starting up... Refresh in 10 seconds</h1>');
  }
});

app.post('/send', async (req, res) => {
  const { phone, message } = req.body;
  if (!isReady) {
    return res.status(503).json({ error: 'WhatsApp not connected' });
  }
  try {
    const chatId = phone.replace('+', '') + '@c.us';
    await client.sendMessage(chatId, message);
    res.json({ success: true, phone, message });
    console.log(`Message sent to ${phone}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/status', (req, res) => {
  res.json({ connected: isReady });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

client.initialize();
