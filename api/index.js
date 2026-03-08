require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("../routes/authRoutes");

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

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/test", (req, res) => {
  return res.json({ hi: "Helli thereafjahd!" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong!" });
});

// const PORT = process.env.PORT || 7002;
// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`Server running on port ${PORT}`);
// });

// Export the app for Vercel
module.exports = app;
