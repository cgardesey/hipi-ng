const axios = require('axios');
const config = require('../config/config.json');
const opayHelper = require('./opayHelper');

/**
 * Create payment with OPay
 * @param {object} paymentData - Payment data
 * @returns {object} - OPay API response
 */
async function createPayment(paymentData) {
    try {
        const { createUrl } = opayHelper.getApiUrls();
        const payload = opayHelper.createPaymentPayload(paymentData);

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
    try {
        const { statusUrl } = opayHelper.getApiUrls();
        const payload = {
            reference: reference,
            country: config.opay.country
        };

        const signature = opayHelper.generateSignature(
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

/**
 * Process OPay callback data
 * @param {object} callbackData - Callback data from OPay
 * @returns {object} - Processed callback data
 */
function processCallback(callbackData) {
    const { payload } = callbackData;

    return {
        reference: payload.reference,
        order_no: payload.transactionId,
        opay_status: payload.status,
        amount: parseFloat(payload.amount) / 100, // Convert from kobo to naira
        currency: payload.currency,
        transaction_id: payload.transactionId,
        payment_channel: payload.channel,
        instrument_type: payload.instrumentType,
        fee: parseFloat(payload.fee || 0) / 100,
        fee_currency: payload.feeCurrency,
        update_time: new Date(payload.updated_at).getTime(),
        displayed_failure: payload.displayedFailure,
        refunded: payload.refunded
    };
}

module.exports = {
    createPayment,
    queryPaymentStatus,
    processCallback
};