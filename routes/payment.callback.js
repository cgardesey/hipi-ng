const express = require('express');
const router = express.Router();
const models = require('../models');
const config = require('../config/config.json');
const fs = require('fs');
const path = require('path');
const opayHelper = require('../helpers/opay-helper-functions');
const { opayPaymentStatusUpdate } = require('../helpers/paymentStatus');

// Create directories for callback responses if they don't exist
const nsanoDirPath = path.join(__dirname, 'nsano_callback_responses');
const opayDirPath = path.join(__dirname, 'opay_callback_responses');

if (!fs.existsSync(nsanoDirPath)) {
    fs.mkdirSync(nsanoDirPath, { recursive: true });
}

if (!fs.existsSync(opayDirPath)) {
    fs.mkdirSync(opayDirPath, { recursive: true });
}

/**
 * Nsano Payment Callback Endpoint (Legacy support)
 */
router.post("/nsano", async (req, res) => {
    try {
        let responseBody = JSON.stringify(req.body, null, 2);
        console.log('Nsano Callback Received:', responseBody);

        const filePath = path.join(nsanoDirPath, `nsano_callback_${Date.now()}.json`);

        fs.writeFile(filePath, responseBody, (err) => {
            if (err) {
                console.error("Error writing callback file:", err);
            } else {
                console.log("Nsano callback saved to file:", filePath);
            }
        });

        const callbackData = req.body;

        // Find payment record by reference, refID, or authorRefID
        let payment = null;

        if (callbackData.reference) {
            payment = await models.Payment.findOne({
                where: { reference: callbackData.reference }
            });
        }

        if (!payment && callbackData.refID) {
            payment = await models.Payment.findOne({
                where: { ref_id: callbackData.refID }
            });
        }

        if (!payment && callbackData.authorRefID) {
            const shortName = config.nsano.short_name;
            if (callbackData.authorRefID.startsWith(shortName)) {
                const extractedRefID = callbackData.authorRefID.substring(shortName.length);
                payment = await models.Payment.findOne({
                    where: { ref_id: extractedRefID }
                });
            }
        }

        if (!payment) {
            console.error('Payment not found for Nsano callback:', {
                reference: callbackData.reference,
                refID: callbackData.refID,
                authorRefID: callbackData.authorRefID
            });

            return res.status(200).json({
                code: "01",
                msg: "Payment record not found",
                system_code: "NOT_FOUND",
                system_msg: "No matching payment record found in database"
            });
        }

        const updateObj = {
            msg: callbackData.msg || payment.msg,
            date: callbackData.date,
            code: callbackData.code,
            system_msg: callbackData.system_msg,
            author_ref_id: callbackData.authorRefID,
            system_code: callbackData.system_code,
            type: callbackData.type,
            user_id: callbackData.userID,
            transaction_id: callbackData.transactionID,
            network: callbackData.network,
            reference: callbackData.reference || payment.reference,
            balance_before: callbackData.balBefore,
            balance_after: callbackData.balAfter,
            meta_data_id: callbackData.metadataID || callbackData.reference,
            author_ref: callbackData.author_ref
        };

        // Remove undefined values to avoid overwriting existing data with null
        Object.keys(updateObj).forEach(key => {
            if (updateObj[key] === undefined || updateObj[key] === null) {
                delete updateObj[key];
            }
        });

        // Update payment record
        await payment.update(updateObj);
        console.log("Nsano payment updated successfully:", {
            ref_id: payment.ref_id,
            code: callbackData.code,
            msg: callbackData.msg,
            transaction_id: callbackData.transactionID
        });

        if (config.nsano.payment_callback_url) {
            try {
                const axios = require('axios');
                await axios.post(config.nsano.payment_callback_url, {
                    ref_id: payment.ref_id,
                    code: callbackData.code,
                    msg: callbackData.msg,
                });
                console.log("Callback forwarded to application successfully");
            } catch (forwardError) {
                console.error("Error forwarding callback to application:", forwardError.message);
            }
        }
        res.status(200).json({
            code: "00",
            msg: "Callback processed successfully",
            system_code: "",
            system_msg: ""
        });

    } catch (error) {
        console.error('Nsano Callback processing error:', error);
        res.status(200).json({
            code: "03",
            msg: "Callback processing failed",
            system_code: "ERROR",
            system_msg: error.message
        });
    }
});

/**
 * OPay Payment Callback Endpoint
 */
router.post("/opay", async (req, res) => {
    try {
        const responseBody = JSON.stringify(req.body, null, 2);
        console.log('OPay Callback Received:', responseBody);

        // Save callback to file for debugging
        const filePath = path.join(opayDirPath, `opay_callback_${Date.now()}.json`);
        fs.writeFile(filePath, responseBody, (err) => {
            if (err) {
                console.error("Error writing OPay callback file:", err);
            } else {
                console.log("OPay callback saved to file:", filePath);
            }
        });

        const callbackData = req.body;

        // Validate callback structure
        if (!callbackData.payload || !callbackData.sha512 || !callbackData.type) {
            console.error('Invalid OPay callback structure:', callbackData);
            return res.status(400).json({
                message: "Invalid callback structure"
            });
        }

        // Verify callback signature
        const isValidSignature = opayHelper.validateCallbackSignature(
            callbackData.payload,
            callbackData.sha512
        );

        if (!isValidSignature) {
            console.error('Invalid OPay callback signature');
            return res.status(401).json({
                message: "Invalid signature"
            });
        }

        const { payload } = callbackData;

        // Find payment record by reference
        const payment = await models.Payment.findOne({
            where: { ref_id: payload.reference }
        });

        if (!payment) {
            console.error('Payment not found for OPay callback:', {
                reference: payload.reference,
                transactionId: payload.transactionId
            });

            return res.status(404).json({
                message: "Payment record not found"
            });
        }

        // Update payment record with callback data
        await opayPaymentStatusUpdate(callbackData);

        console.log("OPay payment updated successfully:", {
            ref_id: payload.reference,
            status: payload.status,
            amount: payload.amount,
            transaction_id: payload.transactionId
        });

        // Forward callback to application if configured
        if (config.opay.payment_callback_url) {
            try {
                const axios = require('axios');
                const statusMapping = opayHelper.mapOpayStatus(payload.status);

                await axios.post(config.opay.payment_callback_url, {
                    ref_id: payload.reference,
                    code: statusMapping.code,
                    msg: statusMapping.msg,
                    status: payload.status,
                    amount: parseFloat(payload.amount) / 100,
                    currency: payload.currency,
                    transaction_id: payload.transactionId,
                    payment_channel: payload.channel,
                    updated_at: payload.updated_at
                });

                console.log("OPay callback forwarded to application successfully");
            } catch (forwardError) {
                console.error("Error forwarding OPay callback to application:", forwardError.message);
            }
        }

        // Respond with 200 OK to acknowledge receipt
        res.status(200).json({
            message: "Callback processed successfully"
        });

    } catch (error) {
        console.error('OPay Callback processing error:', error);
        res.status(500).json({
            message: "Callback processing failed",
            error: error.message
        });
    }
});

module.exports = router;