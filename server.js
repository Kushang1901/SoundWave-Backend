
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

// MongoDB connection
mongoose
  .connect(MONGO_URI, {
    dbName: "soundwaveDB",
  })
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
      timestamp: { type: Date, default: Date.now },
    },
  ],
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
});

const UserSession = mongoose.model("UserSession", userSessionSchema);

// Routes
app.get("/", (req, res) => {
  res.send("✅ SoundWave Backend is running");
});

// Example: track page visit
app.post("/track", async (req, res) => {
  try {
    const { sessionId, productId } = req.body;

    let session = await UserSession.findOne({ sessionId });

    if (!session) {
      session = new UserSession({
        sessionId,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        actions: [],
        startedAt: new Date(),
      });
    }

    session.actions.push({
      action: "visit_page",
      productId,
      timestamp: new Date(),
    });

    session.endedAt = new Date();
    await session.save();

    res.json({ message: "Action tracked successfully", session });
  } catch (err) {
    console.error("Error tracking action:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
