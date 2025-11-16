const { exec } = require("child_process");
const uploadToPastebin = require('./Paste');
const express = require('express');
let router = express.Router();
const pino = require("pino");
let { toBuffer } = require("qrcode");
const fs = require("fs-extra");
const path = require("path");
const { Boom } = require("@hapi/boom");

// MESSAGE
const MESSAGE = process.env.MESSAGE || `
*SESSION GENERATED SUCCESSFULY* ✅

*Gɪᴠᴇ ᴀ ꜱᴛᴀʀ ᴛᴏ ʀᴇᴘᴏ ꜰᴏʀ ᴄᴏᴜʀᴀɢᴇ* 🌟
https://github.com/GuhailTechInfo/MEGA-AI

*Sᴜᴘᴘᴏʀᴛ Gʀᴏᴜᴘ ꜰᴏʀ ϙᴜᴇʀʏ*
https://t.me/Global_TechInfo
https://whatsapp.com/channel/0029VagJIAr3bbVBCpEkAM07
`;

// Clear auth folder
if (fs.existsSync('./auth_info_baileys')) {
  fs.emptyDirSync(path.join(__dirname, 'auth_info_baileys'));
}

// Serve QR Page
router.get('/qr', (req, res) => {
  res.sendFile(path.join(__dirname, "./qr.html"));
});

// Serve Latest QR PNG
router.get('/qr.png', (req, res) => {
  if (!global.latestQR) return res.send("QR Not Generated Yet!");
  res.setHeader("Content-Type", "image/png");
  res.end(global.latestQR);
});

// Main Route
router.get('/', async (req, res) => {
  const { default: SuhailWASocket, useMultiFileAuthState, Browsers, delay, DisconnectReason } = require("@whiskeysockets/baileys");

  async function SUHAIL() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth_info_baileys'));

    try {
      let Smd = SuhailWASocket({
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop"),
        auth: state
      });

      Smd.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {

        // When QR is generated
        if (qr) {
          const qrBuffer = await toBuffer(qr);
          global.latestQR = qrBuffer;

          if (!res.headersSent) {
            return res.redirect("/qr");
          }
        }

        // When Connected
        if (connection === "open") {
          await delay(2000);

          let user = Smd.user.id;
          const credsPath = path.join(__dirname, 'auth_info_baileys/creds.json');

          const pasteUrl = await uploadToPastebin(credsPath, 'creds.json', 'json', '1');

          await Smd.sendMessage(user, { text: pasteUrl });
          await Smd.sendMessage(user, { text: MESSAGE });

          await delay(800);
          fs.emptyDirSync(path.join(__dirname, 'auth_info_baileys'));
        }

        Smd.ev.on("creds.update", saveCreds);

        // Handle Disconnect
        if (connection === "close") {
          let reason = new Boom(lastDisconnect?.error)?.output.statusCode;

          if (reason === DisconnectReason.restartRequired) {
            return SUHAIL();
          }

          exec("pm2 restart qasim");
        }
      });

    } catch (err) {
      console.log(err);
      fs.emptyDirSync(path.join(__dirname, 'auth_info_baileys'));
      exec("pm2 restart qasim");
    }
  }

  await SUHAIL();
});

module.exports = router;
