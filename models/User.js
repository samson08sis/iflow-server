const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    otp: {
      code: String,
      expiresAt: Date,
      attempts: {
        type: Number,
        default: 0,
      },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    profile: {
      name: String,
      email: String,
      avatar: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastLogin: Date,
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
// userSchema.index({ phoneNumber: 1 });
// userSchema.index({ "otp.expiresAt": 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("User", userSchema);
