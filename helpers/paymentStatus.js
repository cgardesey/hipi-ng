const axios = require('axios');
const config = require('../config/config.json');
const { generateSignature, getBaseUrl, mapOpayStatus } = require('./opay-helper-functions');

/**
 * Query payment status from OPay API
 * @param {string} reference - Payment reference
 * @returns {object} Payment status data
 */
async function queryPaymentStatus(reference) {
    try {
        const payload = {
            reference: reference,
            country: config.opay.country
        };

        const payloadString = JSON.stringify(payload);
        const signature = generateSignature(payloadString, config.opay.private_key);

        const baseUrl = getBaseUrl(true); // Use test environment for now
        const apiUrl = `${baseUrl}/api/v1/international/cashier/status`;

        const response = await axios.post(apiUrl, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${signature}`,
                'MerchantId': config.opay.merchant_id
            }
        });

        if (response.data.code === '00000') {
            const opayData = response.data.data;

            return {
                success: true,
                data: {
                    reference: opayData.reference,
                    order_no: opayData.orderNo,
                    status: opayData.status,
                    amount: opayData.amount,
                    vat: opayData.vat,
                    create_time: opayData.createTime,
                    mapped_code: mapOpayStatus(opayData.status)
                }
            };
        } else {
            return {
                success: false,
                error: response.data.message || 'Status query failed',
                code: response.data.code
            };
        }

    } catch (error) {
        console.error('OPay status query error:', error);
        return {
            success: false,
            error: error.response?.data?.message || error.message || 'Status query failed',
            code: error.response?.data?.code
        };
    }
}

/**
 * Update payment status from callback data
 * @param {object} callbackData - OPay callback data
 * @param {object} models - Sequelize models
 * @returns {object} Update result
 */
async function updatePaymentFromCallback(callbackData, models) {
    try {
        const payment = await models.Payment.findOne({
            where: { ref_id: callbackData.reference }
        });

        if (!payment) {
            console.error('Payment not found for callback:', callbackData.reference);
            return {
                success: false,
                error: 'Payment record not found'
            };
        }

        // Map callback data to database fields
        const updateData = {
            status: callbackData.status,
            transaction_id: callbackData.transactionId,
            channel: callbackData.channel,
            fee: parseFloat(callbackData.fee) / 100, // Convert from cents
            fee_currency: callbackData.feeCurrency,
            instrument_type: callbackData.instrumentType,
            refunded: callbackData.refunded,
            displayed_failure: callbackData.displayedFailure,
            updated_at_timestamp: callbackData.updated_at
        };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined || updateData[key] === null) {
                delete updateData[key];
            }
        });

        await payment.update(updateData);

        return {
            success: true,
            payment: payment,
            mapped_code: mapOpayStatus(callbackData.status)
        };

    } catch (error) {
        console.error('Payment update error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    queryPaymentStatus,
    updatePaymentFromCallback
};