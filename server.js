import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json());

// ================== MongoDB Connection ==================
mongoose
  .connect(MONGO_URI, { dbName: "soundwaveDB" })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ================== Schemas ==================

// User Schema (for authentication)
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
});

const User = mongoose.model("User", userSchema);

// User Session Schema (for tracking)
const userSessionSchema = new mongoose.Schema({
  userId: { type: String, default: "guest" },
  sessionId: String,
  userAgent: String,
  ip: String,
  actions: [
    {
      action: String,
      productId: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
});

const UserSession = mongoose.model("UserSession", userSessionSchema);

// ================== Routes ==================

// Root route
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "✅ SoundWave Backend is running 🚀" });
});

// -------- AUTH ROUTES --------

// Signup Route
app.post("/auth/signup", async (req, res) => {
  try {
    console.log("📥 Signup request received:", req.body);

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    const newUser = new User({ name, email, password });
    await newUser.save();

    res.json({ success: true, message: "Signup successful!" });
  } catch (err) {
    console.error("❌ Signup error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Login Route
app.post("/auth/login", async (req, res) => {
  try {
    console.log("📥 Login request received:", req.body);

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email, password });
    if (!user) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    res.json({ success: true, message: "Login successful", userId: user._id, name: user.name });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// -------- TRACKING ROUTES --------

// Track user actions
app.post("/track", async (req, res) => {
  try {
    const { sessionId, userId, action, productId } = req.body;

    let session = await UserSession.findOne({ sessionId });

    if (!session) {
      session = new UserSession({
        sessionId,
        userId: userId || "guest",
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        actions: [],
        startedAt: new Date(),
      });
    }

    session.actions.push({
      action,
      productId,
      timestamp: new Date(),
    });

    session.endedAt = new Date();
    await session.save();

    res.json({ message: "Action tracked successfully", session });
  } catch (err) {
    console.error("❌ Error tracking action:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ================== Start Server ==================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
