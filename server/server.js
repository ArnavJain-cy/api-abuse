require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const redis = require('redis');

const app = express();

/* ---------------- REDIS SETUP ---------------- */
const redisClient = redis.createClient({
    url: process.env.REDIS_URL
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect()
    .then(() => console.log("✅ Redis Connected"))
    .catch(err => console.error(err));

/* ---------------- DATABASE ---------------- */
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error(err));

/* ---------------- MODELS ---------------- */
const Log = mongoose.model('Log', new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    ip: String,
    endpoint: String,
    method: String,
    status: Number,
    reason: String
}));

const Alert = mongoose.model('Alert', new mongoose.Schema({
    timestamp: { type: Date, default: Date.now },
    ip: String,
    type: String,
    severity: String
}));

/* ---------------- MIDDLEWARE ---------------- */
app.use(cors({
    origin: ["http://localhost:3000", "https://api-abuse-frontend.vercel.app"],
    credentials: true
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 1. LOGGER (MUST BE AT THE TOP to capture blocked requests)
app.use((req, res, next) => {
    const oldSend = res.send;
    res.send = function (data) {
        let ip = req.ip;
        if (ip === '::1') ip = '127.0.0.1';
        if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');

        // Only log if we haven't logged this request yet
        if (!res.headersSent) { 
             new Log({
                ip: ip,
                endpoint: req.originalUrl,
                method: req.method,
                status: res.statusCode,
                reason: res.statusCode === 403 || res.statusCode === 429 ? "Security Violation" : "Standard Access"
            }).save().catch(err => console.log("Log Error:", err));
        }
        oldSend.apply(res, arguments);
    };
    next();
});

/* ---------------- SECURITY CHECKS ---------------- */

// 2. CHECK IF IP IS BANNED
const checkBan = async (req, res, next) => {
    const ip = req.ip;
    // Check both manual bans and automatic blocks
    const isBanned = await redisClient.get(`banned:${ip}`);
    const isBlocked = await redisClient.get(`blocked:${ip}`); 
    
    if (isBanned || isBlocked) {
        return res.status(403).json({ 
            error: "⛔ YOUR IP IS BANNED. Security violation detected." 
        });
    }
    next();
};

app.use('/api', checkBan);

// 3. RATE LIMITER
const rateLimiter = async (req, res, next) => {
    if (req.path.startsWith('/dashboard') || req.path === '/reset-redis') {
        return next();
    }

    const ip = req.ip;
    const key = `rate:${ip}`;
    const blockKey = `blocked:${ip}`; 

    const isBlocked = await redisClient.get(blockKey);
    if (isBlocked) {
        return res.status(403).json({ error: "IP Blocked due to traffic abuse" });
    }

    const count = await redisClient.incr(key);
    if (count === 1) {
        await redisClient.expire(key, 60);
    }

    if (count > 100) {
        if (count === 101) {
            // Block for 60 seconds
            await redisClient.set(blockKey, "true", { EX: 60 }); 
            
            // Create Alert
            new Alert({
                ip,
                type: "Rate Limit Exceeded",
                severity: "High"
            }).save().catch(e => console.error(e));

            return res.status(429).json({ error: "Too Many Requests" });
        }
        return res.status(403).json({ error: "IP Blocked due to traffic abuse" });
    }
    next();
};

app.use(rateLimiter);

/* ---------------- ROUTES ---------------- */

// Reset Redis
app.get('/reset-redis', async (req, res) => {
    try {
        await redisClient.flushDb(); 
        res.send("✅ Redis memory cleared! You are no longer banned.");
    } catch (error) {
        res.status(500).send("Error clearing Redis: " + error.message);
    }
});

// Dashboard Stats
app.get('/dashboard/stats', async (_, res) => {
    const logs = await Log.find().sort({ timestamp: -1 }).limit(50);
    const alerts = await Alert.find().sort({ timestamp: -1 }).limit(10);
    res.json({ logs, alerts });
});

// Get Banned IPs (Merges both ban types)
app.get('/dashboard/banned-ips', async (_, res) => {
  try {
      const bannedKeys = await redisClient.keys('banned:*');
      const blockedKeys = await redisClient.keys('blocked:*');

      const bannedIPs = bannedKeys.map(key => key.replace('banned:', ''));
      const blockedIPs = blockedKeys.map(key => key.replace('blocked:', ''));
      
      // Combine unique IPs
      const uniqueIPs = [...new Set([...bannedIPs, ...blockedIPs])];

      res.json({ bannedIPs: uniqueIPs });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Unban IP
app.post('/dashboard/unban-ip', async (req, res) => {
  try {
      const { ip } = req.body;
      if (!ip) return res.status(400).json({ error: 'IP address is required' });

      // Clean up ALL restrictions for this IP
      await redisClient.del(`banned:${ip}`);
      await redisClient.del(`blocked:${ip}`);
      await redisClient.del(`rate:${ip}`);
      await redisClient.del(`login_failures:${ip}`);
      await redisClient.del(`session:${ip}:checked_balance`);

      // Optionally clear alerts for this IP to clean up dashboard
      await Alert.deleteMany({ ip });

      res.json({ success: true, message: `IP ${ip} unbanned` });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Mock User
const MOCK_USER = { username: "admin", password: "password123" };

// --- LOGIN ROUTE (FIXED FOR DASHBOARD VISIBILITY) ---
app.post('/api/login', async (req, res) => {
    const ip = req.ip;
    const failKey = `login_failures:${ip}`;
    const blockKey = `blocked:${ip}`; // Key used for dashboard visibility

    try {
        // 1. Check existing failures
        const failures = await redisClient.get(failKey);
        
        if (failures && parseInt(failures) >= 5) {
            
            // ✅ FIX: Create Alert in MongoDB (So it shows in 'Security Alerts')
            await new Alert({
                ip: ip,
                type: "Brute Force Attempt",
                severity: "High"
            }).save();

            // ✅ FIX: Set Block Key in Redis (So it shows in 'Manage Banned IPs')
            // Blocking for 10 minutes (600s)
            await redisClient.set(blockKey, 'true', { EX: 600 });

            return res.status(429).json({ error: "Too many failed attempts. IP blocked for 10 minutes." });
        }

        const { username, password } = req.body;

        // 2. Verify Credentials
        if (username === MOCK_USER.username && password === MOCK_USER.password) {
            await redisClient.del(failKey); 
            await redisClient.del(blockKey); // Clear block if they eventually succeed
            return res.json({ message: "Login Successful", token: "mock-jwt-token" });
        } else {
            // Failure
            const currentCount = await redisClient.incr(failKey);
            if (currentCount === 1) await redisClient.expire(failKey, 600); 

            return res.status(401).json({ error: `Invalid credentials. Attempt ${currentCount}/5` });
        }

    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

// Balance Check
app.get('/api/balance', async (req, res) => {
    try {
        const ip = req.ip;
        await redisClient.set(`session:${ip}:checked_balance`, 'true', { EX: 300 });
        res.json({ balance: 5000, currency: "USD", message: "Balance verified" });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// Transaction
app.post('/api/transaction', async (req, res) => {
  const ip = req.ip;
  try {
      const hasCheckedBalance = await redisClient.get(`session:${ip}:checked_balance`);

      if (!hasCheckedBalance) {
          // Log Flow Violation
          await new Alert({
              ip: ip,
              type: "Unusual Access Order",
              severity: "Critical"
          }).save();

          // Ban IP
          await redisClient.set(`banned:${ip}`, 'true', { EX: 3600 });
          
          return res.status(403).json({ 
              error: "SECURITY ALERT: Abnormal behavior detected. Your IP has been flagged and blocked." 
          });
      }

      res.json({ status: "success", message: "Transaction completed successfully", amount: 100 });

  } catch (err) {
      res.status(500).json({ error: "Server Error" });
  }
});

app.listen(5000, () => {
    console.log("🚀 Server running on http://localhost:5000");
});