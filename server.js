const express = require("express");
const connectDb = require("./db.js");
const routes = require('./routes/index.js');
const cors = require("cors");
require('dotenv').config();

// chain/index.js is a standalone wallet key derivation demo — not used by the points API
// const getMemonic = require("./chain/index.js")

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const port = process.env.PORT || 4000;

const { watchPayments } = require("./hive/hive.js");

app.use(express.json());

app.use(cors());

app.use(express.urlencoded({ extended: true }));

// Socket.io connection handling
const onlineUsers = new Set();

const Message = require("./models/Message.js");
const Story = require("./models/Story.js");

io.on('connection', (socket) => {
  const { username } = socket.handshake.query;
  if (username) {
    socket.join(username);
    onlineUsers.add(username);
    io.emit('online_users', Array.from(onlineUsers));
    console.log(`📡 User @${username} connected to socket`);
  }

  // Handle off-chain private messages
  socket.on('send_message', async (data) => {
    console.log(`📩 [Socket] Received send_message from @${username || 'unknown'}:`, data);
    try {
      const { to, message, v } = data;
      const from = username;

      if (!from || !to || !message) {
        console.warn(`⚠️ [Socket] Missing fields: from=${from}, to=${to}, msg=${!!message}`);
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

      console.log(`✅ [Socket] Message saved: ${plainMsg.id}`);

      // Broadcast to both parties
      io.to(to).emit('new_message', plainMsg);
      socket.emit('new_message', plainMsg); // Echo to sender

      console.log(`🚀 [Socket] Broadcasted new_message to @${to} and @${from}`);
    } catch (err) {
      console.error("❌ [Socket] send_message error:", err.message);
    }
  });

  // Handle off-chain stories (Statuses)
  socket.on('send_story', async (data) => {
    console.log(`📸 [Socket] Received send_story from @${username || 'unknown'}:`, data);
    try {
      const { content, communityId } = data;
      const from = username;

      if (!from || !content) {
        console.warn(`⚠️ [Socket] Missing story fields: from=${from}`);
        return;
      }

      // Save to MongoDB
      const storyDoc = new Story({
        username: from,
        content,
        communityId: communityId || 'breakaway'
      });

      const saved = await storyDoc.save();
      const plainStory = saved.toObject();

      console.log(`✅ [Socket] Story saved for @${from}`);

      // Broadcast to EVERYONE in the community
      io.emit('new_story', plainStory);

      console.log(`🚀 [Socket] Broadcasted new_story to all connected users`);
    } catch (err) {
      console.error("❌ [Socket] send_story error:", err.message);
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

    server.listen(port, () => {
      console.log(`Server is running on port ${port}`);

      // Start watching for onboarding payments and messages
      const watcherAccount = process.env.HIVE_PAYMENT_RECEIVER || process.env.HIVE_ACCOUNT_CREATOR || 'oracle-d';
      watchPayments(watcherAccount, io).catch(err => {
        console.error("Failed to start Hive payment watcher:", err);
      });
    });
  } catch (err) {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  }
};

startServer();
