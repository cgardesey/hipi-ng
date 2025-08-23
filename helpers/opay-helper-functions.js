const crypto = require('crypto');
const config = require('../config/config.json');

/**
 * Generate HMAC SHA512 signature for OPay API calls
 * @param {string} data - JSON string to sign
 * @param {string} secretKey - OPay private key
 * @returns {string} HMAC SHA512 signature
 */
function generateSignature(data, secretKey) {
    return crypto
        .createHmac('sha512', secretKey)
        .update(data)
        .digest('hex');
}

/**
 * Get OPay API base URL based on environment
 * @param {boolean} isTest - Whether to use test environment
 * @returns {string} Base URL
 */
function getBaseUrl(isTest = true) {
    return isTest ? config.opay.test_url : config.opay.live_url;
}

/**
 * Format phone number for Nigeria (+234 format)
 * @param {string} phoneNumber - Input phone number
 * @returns {string} Formatted phone number
 */
function formatNigerianPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';

    // Remove any spaces, dashes, or other characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Handle different formats
    if (cleaned.startsWith('234')) {
        return '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
        return '+234' + cleaned.substring(1);
    } else if (cleaned.length === 10) {
        return '+234' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('234')) {
        return '+' + cleaned;
    }

    return '+' + cleaned;
}

/**
 * Validate OPay callback signature
 * @param {object} payload - Callback payload
 * @param {string} receivedSignature - Signature from callback
 * @returns {boolean} Whether signature is valid
 */
function validateCallbackSignature(payload, receivedSignature) {
    try {
        const payloadString = JSON.stringify(payload);
        const expectedSignature = generateSignature(payloadString, config.opay.private_key);
        return expectedSignature === receivedSignature;
    } catch (error) {
        console.error('Error validating callback signature:', error);
        return false;
    }
}

/**
 * Map OPay status to standardized status codes
 * @param {string} opayStatus - Status from OPay
 * @returns {string} Standardized status code
 */
function mapOpayStatus(opayStatus) {
    const statusMap = {
        'INITIAL': '03',    // Pending
        'PENDING': '03',    // Pending
        'SUCCESS': '00',    // Successful
        'FAIL': '01',       // Failed
        'CLOSE': '01'       // Failed/Closed
    };

    return statusMap[opayStatus] || '03';
}

/**
 * Generate unique reference ID
 * @param {string} prefix - Optional prefix
 * @returns {string} Unique reference
 */
function generateReference(prefix = 'TXN') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}${timestamp}${random}`;
}

module.exports = {
    generateSignature,
    getBaseUrl,
    formatNigerianPhoneNumber,
    validateCallbackSignature,
    mapOpayStatus,
    generateReference
};