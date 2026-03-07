const express = require("express");
const connectDb = require("./db.js");
const routes = require('./routes/index.js');
const cors = require("cors");
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const CommunityConfig = require("./models/CommunityConfig");

// chain/index.js is a standalone wallet key derivation demo — not used by the points API
// const getMemonic = require("./chain/index.js")

const http = require('http');
const { Server } = require('socket.io');

const app = express();
app.set('trust proxy', true); // Trust headers from Nginx (Cloudflare, etc.)
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'https://conf.breakaway.community',
      'https://breakaway.community',
      'https://sovraniche.com',
      'https://beta.sovraniche.com',
      /\.breakaway\.community$/,
      /\.sovraniche\.com$/
    ],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true
  },
  allowEIO3: true
});
const port = process.env.PORT || 4000;

const { watchPayments } = require("./hive/hive.js");
const { ensureDailyContainer, ensureDailyShortsContainer } = require("./hive/storyChain.js");

app.use(express.json());

// Explicit app-level CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.urlencoded({ extended: true }));

// Socket.io connection handling
const onlineUsers = new Set();

const Message = require("./models/Message.js");
const Story = require("./models/Story.js");
const Short = require("./models/Short.js");

io.on('connection', (socket) => {
  const { username } = socket.handshake.query;
  if (username) {
    socket.join(username);
    onlineUsers.add(username);
    io.emit('online_users', Array.from(onlineUsers));

  }

  // Handle off-chain private messages
  socket.on('send_message', async (data) => {

    try {
      const { to, message, v } = data;
      const from = username;

      if (!from || !to || !message) {

        return;
      }

      // Save directly to MongoDB
      const msgDoc = new Message({
        from,
        to,
        message,
        timestamp: new Date().toISOString(),
        v: v || '1.0',
        trx_id: `offchain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      const saved = await msgDoc.save();
      const plainMsg = saved.toObject();
      plainMsg.id = plainMsg.trx_id; // Add explicit id for frontend



      // Broadcast to both parties
      io.to(to).emit('new_message', plainMsg);
      socket.emit('new_message', plainMsg); // Echo to sender


    } catch (err) {
      console.error("❌ [Socket] send_message error:", err.message);
    }
  });

  socket.on('send_story', async (data) => {

    try {
      const { content, communityId, username: dataUsername } = data;
      const from = username || dataUsername;

      if (!from || !content) {

        return;
      }


      // Save to MongoDB
      const storyDoc = new Story({
        username: from,
        content,
        communityId: communityId || 'breakaway',
        hiveTrxId: data.hiveTrxId || null,
        permlink: data.permlink || null
      });

      const saved = await storyDoc.save();
      const plainStory = saved.toObject();



      // Broadcast to EVERYONE in the community
      io.emit('new_story', plainStory);


    } catch (err) {
      console.error("❌ [Socket] send_story error:", err.message);
    }
  });

  // Handle off-chain shorts (Video Shorts)
  socket.on('send_short', async (data) => {

    try {
      const { content, communityId, username: dataUsername } = data;
      const from = username || dataUsername;

      if (!from || !content || !content.videoUrl) {

        return;
      }

      // Save to MongoDB
      const shortDoc = new Short({
        username: from,
        content: { ...content, type: 'video' },
        communityId: communityId || 'breakaway',
        hiveTrxId: data.hiveTrxId || null,
        permlink: data.permlink || null
      });

      const saved = await shortDoc.save();
      const plainShort = saved.toObject();



      // Broadcast to EVERYONE in the community
      io.emit('new_short', plainShort);


    } catch (err) {
      console.error("❌ [Socket] send_short error:", err.message);
    }
  });

  socket.on('disconnect', () => {
    if (username) {
      onlineUsers.delete(username);
      io.emit('online_users', Array.from(onlineUsers));
    }
    console.log('🔌 Socket disconnected');
  });
});

// 🚀 Connect to Database first
const startServer = async () => {
  try {
    await connectDb();

    app.use('/', routes);

    // Dynamic Meta Injection Middleware for Frontend
    // This serves the index.html and replaces placeholders with community config
    app.get('*', async (req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api') || req.path.includes('.')) {
        return next();
      }

      try {
        // Skip injection if it's clearly not a page request (has extension other than .html)
        const ext = path.extname(req.path).toLowerCase();
        if (ext && ext !== '.html') {
          return next();
        }

        const domain = req.hostname;
        const frontendPath = process.env.FRONTEND_PATH || 'public';

        // Fix: handle absolute paths correctly
        const indexPath = path.isAbsolute(frontendPath)
          ? path.join(frontendPath, 'index.html')
          : path.resolve(__dirname, frontendPath, 'index.html');


        if (process.env.DEBUG_META === 'true') {

        }

        if (!fs.existsSync(indexPath)) {
          if (process.env.DEBUG_META === 'true') {

          }
          return next(); // Fall back to default static serving
        }

        let html = fs.readFileSync(indexPath, 'utf8');

        // Fetch community config
        let cleanedDomain = domain.toLowerCase().replace(/^(https?:\/\/)/, "").split(":")[0];

        // Debug: Log headers to see what we're getting from proxy


        const config = await CommunityConfig.findOne({ domain: cleanedDomain });

        if (config) {

          const name = config.communityName || "Breakaway Community";
          const description = config.communityDescription || "A decentralized community powered by Breakaway.";
          let logo = config.logoUrl || "/sovraniche-logo.png";

          // Robust domain detection
          const host = req.headers['x-forwarded-host'] || req.headers.host || domain;

          // Force absolute URL for the logo (required by Telegram/Twitter/FB)
          if (logo.startsWith('http')) {
            // Already absolute, do nothing
          } else if (logo.startsWith('/')) {
            logo = `https://${host}${logo}`;
          } else {
            // Relative like "logo.png"
            logo = `https://${host}/${logo}`;
          }



          html = html.replace(/{{COMMUNITY_NAME}}/g, name);
          html = html.replace(/{{COMMUNITY_DESCRIPTION}}/g, description);
          html = html.replace(/{{COMMUNITY_LOGO}}/g, logo);

          if (process.env.DEBUG_META === 'true') {

          }
        } else {
          console.warn(`⚠️ [Meta] No config found in DB for domain: "${cleanedDomain}" - using defaults`);
          const defaultName = "Breakaway Community";
          const defaultDesc = "A decentralized community powered by Breakaway infrastructure.";

          html = html.replace(/{{COMMUNITY_NAME}}/g, defaultName);
          html = html.replace(/{{COMMUNITY_DESCRIPTION}}/g, defaultDesc);

          const host = req.headers['x-forwarded-host'] || req.headers.host || domain;
          const fallbackLogo = `https://${host}/sovraniche-logo.png`;
          html = html.replace(/{{COMMUNITY_LOGO}}/g, fallbackLogo);
        }

        // Final check: did we actually replace anything?
        if (html.includes('{{COMMUNITY_NAME}}')) {

        } else {

        }

        // Log the first 400 chars of the head to verify


        res.set('Content-Type', 'text/html');
        return res.send(html);
      } catch (error) {
        console.error("❌ [Meta] Injection Error:", error.message);
        next();
      }
    });

    // Static assets
    const frontendPath = process.env.FRONTEND_PATH || 'public';
    const staticPath = path.isAbsolute(frontendPath) ? frontendPath : path.join(__dirname, frontendPath);
    app.use(express.static(staticPath));

    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);

      // Start watching for onboarding payments and messages
      const watcherAccount = process.env.HIVE_PAYMENT_RECEIVER || process.env.HIVE_ACCOUNT_CREATOR || 'oracle-d';
      watchPayments(watcherAccount, io).catch(err => {
        console.error("Failed to start Hive payment watcher:", err);
      });

      // 🗓️ Daily story container cron — runs immediately then every hour
      // Creates today's container post on Hive if it doesn't exist yet
      ensureDailyContainer().catch(err => console.error('Story container init error:', err.message));
      ensureDailyShortsContainer().catch(err => console.error('Shorts container init error:', err.message));

      setInterval(() => {
        ensureDailyContainer().catch(err => console.error('Story container cron error:', err.message));
        ensureDailyShortsContainer().catch(err => console.error('Shorts container cron error:', err.message));
      }, 60 * 60 * 1000); // every hour (safe to re-run, skips if already exists)
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
