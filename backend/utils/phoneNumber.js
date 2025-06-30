const PhoneNumberUtil = require('google-libphonenumber').PhoneNumberUtil;
const PNF = require('google-libphonenumber').PhoneNumberFormat;

// Get instance of phone number utility
const phoneUtil = PhoneNumberUtil.getInstance();

/**
 * Validate a phone number
 * @param {String} phoneNumber - Phone number to validate
 * @param {String} countryCode - ISO 3166-1 alpha-2 country code (default: 'KE' for Kenya)
 * @returns {Boolean} - True if valid, false otherwise
 */
const validatePhoneNumber = (phoneNumber, countryCode = 'KE') => {
  try {
    const parsedNumber = phoneUtil.parse(phoneNumber, countryCode);
    return phoneUtil.isValidNumber(parsedNumber);
  } catch (error) {
    return false;
  }
};

/**
 * Format a phone number to E.164 international format
 * @param {String} phoneNumber - Phone number to format
 * @param {String} countryCode - ISO 3166-1 alpha-2 country code (default: 'KE' for Kenya)
 * @returns {String|null} - Formatted phone number or null if invalid
 */
const formatPhoneNumber = (phoneNumber, countryCode = 'KE') => {
  try {
    const parsedNumber = phoneUtil.parse(phoneNumber, countryCode);
    if (!phoneUtil.isValidNumber(parsedNumber)) {
      return null;
    }
    return phoneUtil.format(parsedNumber, PNF.E164);
  } catch (error) {
    return null;
  }
};

module.exports = {
  validatePhoneNumber,
  formatPhoneNumber
}; 