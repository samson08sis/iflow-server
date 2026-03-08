require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("../routes/authRoutes");
const serverless = require("serverless-http");

const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:8081",
      "http://localhost:8082",
      "exp://localhost:8081",
      "exp://localhost:8082",
    ],
    credentials: true,
  })
);
app.use(express.json());

// Cached DB connection
let isConnected;

async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  isConnected = true;
  console.log("MongoDB connected");
}

// Routes
app.use("/api/auth", async (req, res, next) => {
  await connectDB();
  return authRoutes(req, res, next);
});
app.use("/", (req, res) => {
  return res.json({ message: "Welcome to iFlow's server!" });
});
app.use("/test", (req, res) => {
  return res.json({ hi: "Helli thereafjahd!" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// Export wrapped handler for Vercel
module.exports = serverless(app);
