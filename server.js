import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// ✅ Session Schema
const sessionSchema = new mongoose.Schema({
  userId: String, // guest or logged-in user
  sessionId: String, // unique per browser session
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  durationSeconds: Number,
  userAgent: String,
  ip: String,
  actions: [
    {
      action: String, // visit_page, search, add_to_cart, etc.
      productId: String, // optional (like product name or page)
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const Session = mongoose.model("Session", sessionSchema);

// ✅ API: Log Action
app.post("/log", async (req, res) => {
  try {
    let { userId, sessionId, action, productId } = req.body;

    // generate sessionId if missing
    if (!sessionId) sessionId = uuidv4();

    // find existing session
    let session = await Session.findOne({ sessionId });

    // if not found → create new session
    if (!session) {
      session = new Session({
        userId: userId || "guest",
        sessionId,
        userAgent: req.headers["user-agent"],
        ip: req.ip,
        actions: [],
      });
    }

    // push new action
    session.actions.push({ action, productId });

    // update endedAt on every event
    session.endedAt = new Date();

    // if user is leaving → compute duration
    if (action === "session_end") {
      session.durationSeconds = Math.round(
        (session.endedAt - session.startedAt) / 1000
      );
    }

    await session.save();

    res.status(201).send({ message: "Action logged!", sessionId });
  } catch (err) {
    console.error("Error logging action:", err);
    res.status(400).send(err);
  }
});

// ✅ API: View all sessions in UTC (default)
app.get("/sessions", async (req, res) => {
  const sessions = await Session.find().sort({ startedAt: -1 });
  res.send(sessions);
});

// ✅ API: View all sessions in IST (converted)
app.get("/sessions-local", async (req, res) => {
  const sessions = await Session.find().sort({ startedAt: -1 }).lean();
  const fmt = (d) =>
    d
      ? new Date(d).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
      : null;

  const shaped = sessions.map((s) => ({
    ...s,
    startedAtIST: fmt(s.startedAt),
    endedAtIST: fmt(s.endedAt),
    durationSeconds:
      s.startedAt && s.endedAt
        ? Math.round((new Date(s.endedAt) - new Date(s.startedAt)) / 1000)
        : null,
  }));

  res.json(shaped);
});

// ✅ Run Server
app.listen(5000, () => console.log("Server running on port 5000"));
