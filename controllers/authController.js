const User = require("../models/User");
const OTPGenerator = require("../utils/otpGenerator");
const jwt = require("jsonwebtoken");
const formatPhoneNumber = require("../utils/numberFormatter");
// const twilio = require("twilio");

// Initialize Twilio client
// const client = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

class AuthController {
  // Send OTP to phone number
  async sendOTP(req, res) {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Format phone number (remove spaces, add country code if missing)
      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Generate OTP
      const otp = OTPGenerator.generateOTP();
      const otpHash = OTPGenerator.generateHash(otp);
      const expiresAt = OTPGenerator.getExpiryTime(10);

      // Find or create user
      let user = await User.findOne({ phoneNumber: formattedPhone });

      if (!user) {
        user = new User({
          phoneNumber: formattedPhone,
          otp: {
            code: otpHash,
            expiresAt,
            attempts: 0,
          },
        });
      } else {
        user.otp = {
          code: otpHash,
          expiresAt,
          attempts: 0,
        };
      }

      await user.save();

      // Send OTP via Twilio (in production) or log it (in development)
      if (process.env.NODE_ENV === "production") {
        // await client.messages.create({
        //   body: `Your verification code is: ${otp}. Valid for 10 minutes.`,
        //   from: process.env.TWILIO_PHONE_NUMBER,
        //   to: formattedPhone,
        // });
      } else {
        console.log(`DEV OTP for ${formattedPhone}: ${otp}`);
      }

      res.json({
        success: true,
        message: "OTP sent successfully",
        // In production, don't send OTP back
        otp: process.env.NODE_ENV === "development" ? otp : undefined,
      });
    } catch (error) {
      console.error("Send OTP error:", error);
      res.status(500).json({
        message: "Failed to send OTP",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  // Verify OTP
  async verifyOTP(req, res) {
    try {
      const { phoneNumber, otp } = req.body;

      if (!phoneNumber || !otp) {
        return res
          .status(400)
          .json({ message: "Phone number and OTP are required" });
      }

      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Find user
      const user = await User.findOne({ phoneNumber: formattedPhone });

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if OTP exists and is not expired
      if (!user.otp || !user.otp.code || new Date() > user.otp.expiresAt) {
        return res.status(400).json({ message: "OTP expired or invalid" });
      }

      // Check attempt limit
      if (user.otp.attempts >= 5) {
        return res
          .status(429)
          .json({ message: "Too many attempts. Please request new OTP." });
      }

      // Verify OTP
      const isValid = OTPGenerator.verifyOTP(otp, user.otp.code);

      if (!isValid) {
        // Increment attempt counter
        user.otp.attempts += 1;
        await user.save();

        const remainingAttempts = 5 - user.otp.attempts;
        return res.status(400).json({
          message: "Invalid OTP",
          remainingAttempts,
        });
      }

      // OTP is valid
      user.isVerified = true;
      user.otp = undefined; // Clear OTP after successful verification
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: user._id, phoneNumber: user.phoneNumber },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE }
      );

      res.json({
        success: true,
        message: "OTP verified successfully",
        token,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
          profile: user.profile,
        },
      });
    } catch (error) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  }

  // Resend OTP
  async resendOTP(req, res) {
    try {
      const { phoneNumber } = req.body;

      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Check if last OTP was sent less than 1 minute ago
      const user = await User.findOne({
        phoneNumber: formatPhoneNumber(phoneNumber),
      });

      if (user && user.otp && user.otp.expiresAt) {
        const timeSinceLastOTP =
          Date.now() - user.otp.expiresAt.getTime() + 10 * 60000;
        if (timeSinceLastOTP < 60000) {
          // 1 minute cooldown
          const waitTime = Math.ceil((60000 - timeSinceLastOTP) / 1000);
          return res.status(429).json({
            message: `Please wait ${waitTime} seconds before requesting new OTP`,
          });
        }
      }

      // Send new OTP
      return this.sendOTP(req, res);
    } catch (error) {
      console.error("Resend OTP error:", error);
      res.status(500).json({ message: "Failed to resend OTP" });
    }
  }

  // Check authentication status
  async checkAuth(req, res) {
    try {
      const token = req.headers.authorization?.split(" ")[1];

      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-otp");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        isAuthenticated: true,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          isVerified: user.isVerified,
          profile: user.profile,
        },
      });
    } catch (error) {
      res.status(401).json({ message: "Invalid or expired token" });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { name, email } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      user.profile = {
        ...user.profile,
        name,
        email,
      };

      await user.save();

      res.json({
        success: true,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          profile: user.profile,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  }
}

module.exports = new AuthController();
