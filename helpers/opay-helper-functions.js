const crypto = require('crypto');
const config = require('../config/config.json');

/**
 * Generate HMAC SHA512 signature for OPay API calls
 * @param {string} data - The data to sign
 * @param {string} secretKey - The secret key for signing
 * @returns {string} - The generated signature
 */
function generateSignature(data, secretKey) {
    return crypto
        .createHmac('sha512', secretKey)
        .update(data)
        .digest('hex');
}

/**
 * Get OPay API URLs based on environment
 * @returns {object} - Object containing API URLs
 */
function getApiUrls() {
    const isProduction = config.opay.environment === 'production';

    return {
        createUrl: `${isProduction ? config.opay.live_base_url : config.opay.test_base_url}/api/v1/international/cashier/create`,
        statusUrl: `${isProduction ? config.opay.live_query_url : config.opay.test_query_url}/api/v1/international/cashier/status`
    };
}

/**
 * Create payment request payload for OPay
 * @param {object} paymentData - Payment data from request
 * @returns {object} - OPay formatted payment request
 */
function createPaymentPayload(paymentData) {
    return {
        country: config.opay.country,
        reference: paymentData.ref_id,
        amount: {
            total: Math.round(paymentData.amount * 100), // Convert to kobo/cents
            currency: config.opay.currency
        },
        returnUrl: config.opay.return_url,
        callbackUrl: config.opay.callback_url,
        cancelUrl: config.opay.cancel_url,
        displayName: "Payment Gateway",
        customerVisitSource: "web",
        evokeOpay: true,
        expireAt: config.opay.expire_minutes,
        userInfo: {
            userEmail: paymentData.user_email || "user@example.com",
            userId: paymentData.payer_id,
            userMobile: paymentData.user_mobile || paymentData.msisdn || "",
            userName: paymentData.user_name || paymentData.name || "Customer"
        },
        product: {
            name: paymentData.product_name || "Payment",
            description: paymentData.product_description || "Payment for services"
        },
        ...(paymentData.pay_method && { payMethod: paymentData.pay_method })
    };
}

/**
 * Format phone number for Nigeria
 * @param {string} phone - The phone number to format
 * @returns {string} - Formatted phone number
 */
function formatNigerianPhone(phone) {
    if (!phone) return "";

    // Remove any non-digit characters
    phone = phone.replace(/\D/g, '');

    // Handle different formats
    if (phone.startsWith('234')) {
        return '+' + phone;
    } else if (phone.startsWith('0')) {
        return '+234' + phone.substring(1);
    } else if (phone.length === 10) {
        return '+234' + phone;
    } else if (phone.length === 11 && phone.startsWith('0')) {
        return '+234' + phone.substring(1);
    }

    return '+234' + phone;
}

/**
 * Map OPay status to internal status codes
 * @param {string} opayStatus - OPay status
 * @returns {object} - Internal status mapping
 */
function mapOpayStatus(opayStatus) {
    const statusMap = {
        'INITIAL': { code: '03', msg: 'Payment initialized' },
        'PENDING': { code: '03', msg: 'Payment pending' },
        'SUCCESS': { code: '00', msg: 'Payment successful' },
        'FAIL': { code: '01', msg: 'Payment failed' },
        'CLOSE': { code: '02', msg: 'Payment closed' }
    };

    return statusMap[opayStatus] || { code: '03', msg: 'Unknown status' };
}

/**
 * Validate OPay callback signature
 * @param {object} payload - Callback payload
 * @param {string} receivedSignature - Received signature
 * @returns {boolean} - Whether signature is valid
 */
function validateCallbackSignature(payload, receivedSignature) {
    const expectedSignature = generateSignature(
        JSON.stringify(payload),
        config.opay.private_key
    );

    return expectedSignature === receivedSignature;
}

/**
 * Create payment with OPay API
 * @param {object} paymentData - Payment data
 * @returns {object} - OPay API response
 */
async function createPayment(paymentData) {
    const axios = require('axios');

    try {
        const { createUrl } = getApiUrls();
        const payload = createPaymentPayload(paymentData);

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.opay.public_key}`,
            'MerchantId': config.opay.merchant_id
        };

        const response = await axios.post(createUrl, payload, { headers });

        if (response.data.code !== '00000') {
            throw new Error(`OPay API Error: ${response.data.message}`);
        }

        return response.data;
    } catch (error) {
        console.error('OPay Payment Creation Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Query payment status from OPay
 * @param {string} reference - Payment reference
 * @returns {object} - Payment status response
 */
async function queryPaymentStatus(reference) {
    const axios = require('axios');

    try {
        const { statusUrl } = getApiUrls();
        const payload = {
            reference: reference,
            country: config.opay.country
        };

        const signature = generateSignature(
            JSON.stringify(payload),
            config.opay.private_key
        );

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${signature}`,
            'MerchantId': config.opay.merchant_id
        };

        const response = await axios.post(statusUrl, payload, { headers });

        if (response.data.code !== '00000') {
            throw new Error(`OPay Query API Error: ${response.data.message}`);
        }

        return response.data;
    } catch (error) {
        console.error('OPay Status Query Error:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    generateSignature,
    getApiUrls,
    createPaymentPayload,
    formatNigerianPhone,
    mapOpayStatus,
    validateCallbackSignature,
    createPayment,
    queryPaymentStatus
};