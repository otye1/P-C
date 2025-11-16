const express = require('express');
const router = express.Router();
const fs = require("fs-extra");
const { toBuffer } = require("qrcode");
const uploadToPastebin = require('./Paste');  
const pino = require("pino");
const { default: SuhailWASocket, useMultiFileAuthState, Browsers, delay, makeInMemoryStore } = require("@whiskeysockets/baileys");

// Default message
const MESSAGE = process.env.MESSAGE || `
👋🏻 Hey there, ALI-MD Bot user!
✨ Your pairing code / session ID is generated!
⚠️ Do not share this code with anyone.
`;

router.get('/', async (req, res) => {
  try {
    // Make sure auth folder exists
    await fs.ensureDir('./auth_info_baileys');

    const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

    const sock = SuhailWASocket({
      printQRInTerminal: false,
      logger: pino({ level: "silent" }),
      browser: Browsers.macOS("Desktop"),
      auth: state
    });

    // Save credentials whenever updated
    sock.ev.on('creds.update', saveCreds);

    let sentQR = false; // Flag to send QR only once

    sock.ev.on("connection.update", async (update) => {
      const { connection, qr } = update;

      // QR code generated
      if (qr && !sentQR) {
        sentQR = true;
        try {
          const qrBuffer = await toBuffer(qr);
          const qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`;

          // Generate Pastebin fallback session code
          const credsFile = './auth_info_baileys/creds.json';
          const sessionCode = await uploadToPastebin(credsFile, 'creds.json', 'json', '1');

          return res.json({
            success: true,
            qr: qrBase64,
            code: sessionCode
          });
        } catch (err) {
          console.error(err);
          return res.json({ success: false, error: 'Failed to generate QR code' });
        }
      }

      // Connection opened
      if (connection === "open") {
        console.log("✅ WhatsApp connected!");
      }
    });
  } catch (err) {
    console.error(err);
    res.json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
