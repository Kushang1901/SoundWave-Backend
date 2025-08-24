import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { DateTime } from "luxon";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose
  .connect(MONGO_URI, { dbName: "soundwaveDB" })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Schema for user tracking
const userSessionSchema = new mongoose.Schema({
  userId: { type: String, default: "guest" },
  sessionId: String,
  userAgent: String,
  ip: String,
  actions: [
    {
      action: String,
      productId: String,
      timestampUTC: { type: Date, default: Date.now },
      timestampIST: String, // human-readable IST timestamp
    },
  ],
  startedAtUTC: { type: Date, default: Date.now },
  startedAtIST: String,
  endedAtUTC: Date,
  endedAtIST: String,
});

const UserSession = mongoose.model("UserSession", userSessionSchema);

// Root route
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "✅ SoundWave Backend is running 🚀" });
});

// ✅ Log events (frontend calls /log)
app.post("/log", async (req, res) => {
  try {
    const { sessionId, userId = "guest", action, productId } = req.body;

    // Format current time in IST
    const nowUTC = new Date();
    const nowIST = DateTime.fromJSDate(nowUTC)
      .setZone("Asia/Kolkata")
      .toFormat("dd/MM/yyyy, hh:mm:ss a");

    let session = await UserSession.findOne({ sessionId });

    if (!session) {
      session = new UserSession({
        userId,
        sessionId,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        actions: [],
        startedAtUTC: nowUTC,
        startedAtIST: nowIST,
      });
    }

    // Push action
    session.actions.push({
      action,
      productId,
      timestampUTC: nowUTC,
      timestampIST: nowIST,
    });

    // Update session end time
    session.endedAtUTC = nowUTC;
    session.endedAtIST = nowIST;

    await session.save();

    res.json({ message: "✅ Action tracked successfully", session });
  } catch (err) {
    console.error("❌ Error logging event:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
