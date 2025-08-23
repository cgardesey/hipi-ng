const express = require('express');
const router = express.Router();
const models = require('../models');
const config = require('../config/config.json');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { validateCallbackSignature, mapOpayStatus } = require('../helpers/opay-helper-functions');
const { updatePaymentFromCallback } = require('../helpers/paymentStatus');

// Create directory for storing callback responses
const dirPath = path.join(__dirname, 'opay_callback_responses');
if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
}

router.post("/callback", async (req, res) => {
    try {
        const responseBody = JSON.stringify(req.body, null, 2);
        console.log('OPay Callback Received:', responseBody);

        // Save callback to file for debugging
        const filePath = path.join(dirPath, `opay_callback_${Date.now()}.json`);
        fs.writeFile(filePath, responseBody, (err) => {
            if (err) {
                console.error("Error writing callback file:", err);
            } else {
                console.log("OPay callback saved to file:", filePath);
            }
        });

        const callbackData = req.body;

        // Validate callback structure
        if (!callbackData.payload || !callbackData.sha512 || !callbackData.type) {
            console.error('Invalid callback structure:', callbackData);
            return res.status(400).json({
                success: false,
                message: "Invalid callback structure"
            });
        }

        // Validate callback signature
        if (!validateCallbackSignature(callbackData.payload, callbackData.sha512)) {
            console.error('Invalid callback signature');
            return res.status(401).json({
                success: false,
                message: "Invalid signature"
            });
        }

        const payload = callbackData.payload;

        // Find payment record by reference
        const payment = await models.Payment.findOne({
            where: { ref_id: payload.reference }
        });

        if (!payment) {
            console.error('Payment not found for OPay callback:', payload.reference);
            return res.status(404).json({
                success: false,
                message: "Payment record not found"
            });
        }

        // Update payment record with callback data
        const updateObj = {
            status: payload.status,
            transaction_id: payload.transactionId,
            channel: payload.channel,
            instrument_type: payload.instrumentType,
            refunded: payload.refunded || false,
            displayed_failure: payload.displayedFailure || '',
            updated_at_timestamp: payload.updated_at,
            fee: payload.fee ? parseFloat(payload.fee) / 100 : null, // Convert from cents
            fee_currency: payload.feeCurrency
        };

        // Remove undefined values
        Object.keys(updateObj).forEach(key => {
            if (updateObj[key] === undefined || updateObj[key] === null) {
                delete updateObj[key];
            }
        });

        await payment.update(updateObj);

        console.log("OPay payment updated successfully:", {
            ref_id: payment.ref_id,
            status: payload.status,
            transaction_id: payload.transactionId
        });

        // Forward callback to application if configured
        if (config.opay.payment_callback_url) {
            try {
                const forwardData = {
                    ref_id: payment.ref_id,
                    code: mapOpayStatus(payload.status),
                    msg: getStatusMessage(payload.status),
                    status: payload.status,
                    transaction_id: payload.transactionId,
                    amount: payment.amount,
                    currency: payment.currency,
                    phone_number: payment.phone_number,
                    instrument_type: payload.instrumentType
                };

                await axios.post(config.opay.payment_callback_url, forwardData, {
                    timeout: 10000
                });
                console.log("Callback forwarded to application successfully");
            } catch (forwardError) {
                console.error("Error forwarding callback to application:", forwardError.message);
            }
        }

        // Respond with 200 OK as required by OPay
        res.status(200).json({
            success: true,
            message: "Callback processed successfully"
        });

    } catch (error) {
        console.error('OPay Callback processing error:', error);
        // Still respond with 200 OK to acknowledge receipt
        res.status(200).json({
            success: false,
            message: "Callback processing failed",
            error: error.message
        });
    }
});

/**
 * Get human-readable status message
 * @param {string} status - OPay status
 * @returns {string} Status message
 */
function getStatusMessage(status) {
    const messageMap = {
        'INITIAL': 'Payment initialized',
        'PENDING': 'Payment is pending',
        'SUCCESS': 'Payment completed successfully',
        'FAIL': 'Payment failed',
        'CLOSE': 'Payment was closed'
    };

    return messageMap[status] || 'Unknown payment status';
}

module.exports = router;