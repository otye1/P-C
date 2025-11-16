const express = require('express');
const router = express.Router();
const fs = require("fs-extra");
const { toBuffer } = require("qrcode");
const uploadToPastebin = require('./Paste');  // Make sure this is correct
const pino = require("pino");
const { default: SuhailWASocket, useMultiFileAuthState, Browsers, delay, makeInMemoryStore } = require("@whiskeysockets/baileys");

const MESSAGE = process.env.MESSAGE || `
👋🏻 *ʜᴇʏ ᴛʜᴇʀᴇ, ᴀʟɪ-ᴍᴅ ʙᴏᴛ ᴜsᴇʀ!*

✨ *ʏᴏᴜʀ ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ / sᴇssɪᴏɴ ɪᴅ ɪs ɢᴇɴᴇʀᴀᴛᴇᴅ!* 

⚠️ *ᴅᴏ ɴᴏᴛ sʜᴀʀᴇ ᴛʜɪs ᴄᴏᴅᴇ ᴡɪᴛʜ ᴀɴʏᴏɴᴇ — ɪᴛ ɪs ᴘʀɪᴠᴀᴛᴇ!*

🪀 *ᴏғғɪᴄɪᴀʟ ᴄʜᴀɴɴᴇʟ:*  
 *Https://whatsapp.com/channel/0029VaoRxGmJpe8lgCqT1T2h*

🖇️ *ɢɪᴛʜᴜʙ ʀᴇᴘᴏ:*  
 *Https://github.com/ALI-INXIDE/ALI-MD*

> *ᴍᴀᴅᴇ ᴡɪᴛʜ ʟᴏᴠᴇ ʙʏ ᴀʟɪ ɪɴxɪᴅᴇ 🍉*
`;

if (fs.existsSync('./auth_info_baileys')) {
  fs.emptyDirSync('./auth_info_baileys');
}

router.get('/', async (req, res) => {
  const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) });
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

  const sock = SuhailWASocket({
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: Browsers.macOS("Desktop"),
    auth: state
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr } = update;

    if (qr && !res.headersSent) {
      try {
        const qrBuffer = await toBuffer(qr);
        const qrBase64 = `data:image/png;base64,${qrBuffer.toString('base64')}`;

        // Generate fallback session code (Pastebin URL)
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

    if (connection === "open") {
      await delay(3000);
      sock.ev.on('creds.update', saveCreds);
    }
  });
});

module.exports = router;
