const crypto = require("crypto");

class OTPGenerator {
  // Generate 6-digit OTP
  static generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Generate OTP hash for verification
  static generateHash(otp) {
    return crypto.createHash("sha256").update(otp).digest("hex");
  }

  // Verify OTP
  static verifyOTP(inputOTP, storedHash) {
    const inputHash = crypto
      .createHash("sha256")
      .update(inputOTP)
      .digest("hex");
    return inputHash === storedHash;
  }

  // Calculate expiry time
  static getExpiryTime(minutes = 10) {
    return new Date(Date.now() + minutes * 60000);
  }
}

module.exports = OTPGenerator;
