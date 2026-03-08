function formatPhoneNumber(phoneNumber) {
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, "");

  // Add country code if missing (assuming +251 for Ethiopia)
  if (!cleaned.startsWith("+")) {
    // Check if it starts with 0
    if (cleaned.startsWith("0")) {
      cleaned = "251" + cleaned.substring(1);
    } else if (cleaned.length === 10) {
      cleaned = "251" + cleaned;
    }
    cleaned = "+" + cleaned;
  }

  return cleaned;
}

module.exports = formatPhoneNumber;
