const express = require('express');
const models = require('../models');
const config = require('../config/config.json');
const ipValidationMiddleware = require('../middleware/ip-validation');
const checkAuthMiddleware = require('../middleware/check-auth');
const opayHelper = require('../helpers/opay-helper-functions');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentStatus:
 *       type: object
 *       required:
 *         - token
 *         - ref_id
 *       properties:
 *         token:
 *           type: string
 *           description: API token provided by API provider
 *         ref_id:
 *           type: string
 *           description: Unique ref_id previously sent in payment request
 *       example:
 *         token: "<API token>"
 *         ref_id: "143e5586-daad-11ed-afa1-0242ac120002"
 *
 *     PaymentStatusResponse:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           description: Status code indicating payment state
 *         msg:
 *           type: string
 *           description: Human-readable message describing payment status
 *         ref_id:
 *           type: string
 *           description: Original ref_id
 *         opay_status:
 *           type: string
 *           description: OPay status (for Nigerian payments)
 *         amount:
 *           type: number
 *           description: Transaction amount
 *         currency:
 *           type: string
 *           description: Transaction currency
 *       example:
 *         code: "03"
 *         msg: "Transaction is pending customer approval."
 *         ref_id: "9a06-4cb7-96fc-1742647e27af15407"
 *         opay_status: "PENDING"
 *         amount: 5000.00
 *         currency: "NGN"
 */

/**
 * @swagger
 * /payment-status:
 *   post:
 *     summary: Check payment status
 *     description: |
 *       Check the status of a payment transaction using the `ref ID`.
 *       Supports both Nsano (Ivory Coast) and OPay (Nigeria) payments.
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentStatus'
 *     responses:
 *       400:
 *         description: Bad request. Indicates that required fields were missing or ref ID is invalid.
 *       401:
 *         description: Unauthorized. Token provided is invalid.
 *       500:
 *         description: Server error. May include a message body indicating the cause.
 *       200:
 *         description: |
 *           **Sample Output (Nsano)**
 *           ```
 *           {
 *              "code": "03",
 *              "msg": "Transaction is pending customer approval.",
 *              "ref_id": "9a06-4cb7-96fc-1742647e27af15407"
 *           }
 *           ```
 *
 *           **Sample Output (OPay)**
 *           ```json
 *           {
 *              "ref_id": "TXN12345678",
 *              "code": "00",
 *              "msg": "Payment successful",
 *              "opay_status": "SUCCESS",
 *              "amount": 5000.00,
 *              "currency": "NGN"
 *           }
 *           ```
 *
 *           ### Code Reference Table
 *
 *           |  Code           | Description |
 *           |-----------------|-------------|
 *           | 00              | Successful  |
 *           | 03              | Pending     |
 *           | 01, 02, 05, etc | Failed      |
 */
router.post(
    '/',
    ipValidationMiddleware.ipValidation,
    checkAuthMiddleware.checkAuth,
    async (req, res) => {
        const { ref_id } = req.body;

        if (!ref_id) {
            return res.status(400).json({
                message: "Validation failed",
                errors: [
                    {
                        type: "required",
                        message: "The 'ref ID' field is required.",
                        field: "ref_id"
                    }
                ]
            });
        }

        try {
            // Find payment in database
            let payment = await models.Payment.findOne({
                where: { ref_id: ref_id }
            });

            if (!payment) {
                return res.status(400).json({
                    message: "Invalid ref id",
                    error: "Payment record not found"
                });
            }

            // Determine if this is an OPay payment (has OPay-specific fields)
            const isOpayPayment = payment.order_no || payment.opay_status || payment.user_email;

            if (isOpayPayment) {
                return await handleOpayStatusCheck(payment, ref_id, res);
            } else {
                return await handleNsanoStatusCheck(payment, ref_id, res);
            }

        } catch (error) {
            console.log(error);
            res.status(500).json({
                message: "Something went wrong!",
                error: error.message
            });
        }
    }
);

/**
 * Handle OPay payment status check
 */
async function handleOpayStatusCheck(payment, ref_id, res) {
    // If payment is still pending or initial, query OPay for latest status
    if (payment.opay_status === 'INITIAL' || payment.opay_status === 'PENDING' || !payment.opay_status) {
        try {
            console.log(`Querying OPay status for reference: ${ref_id}`);

            const statusResponse = await opayHelper.queryPaymentStatus(ref_id);

            if (statusResponse.data) {
                const updateData = {
                    opay_status: statusResponse.data.status,
                    order_no: statusResponse.data.orderNo,
                    create_time: statusResponse.data.createTime,
                    update_time: Date.now()
                };

                // Map OPay status to internal codes
                const statusMapping = opayHelper.mapOpayStatus(statusResponse.data.status);
                updateData.code = statusMapping.code;
                updateData.msg = statusMapping.msg;

                // Remove undefined values
                Object.keys(updateData).forEach(key => {
                    if (updateData[key] === undefined || updateData[key] === null) {
                        delete updateData[key];
                    }
                });

                await payment.update(updateData);

                console.log(`Payment status updated: ${ref_id} -> ${statusResponse.data.status}`);
            }
        } catch (statusError) {
            console.error('OPay status query error:', {
                ref_id: ref_id,
                error: statusError.message,
                response: statusError.response?.data
            });
            // Continue with local data if status check fails
        }
    }

    // Refresh payment data from database
    payment = await models.Payment.findOne({
        where: { ref_id: ref_id }
    });

    // Prepare response
    const response = {
        ref_id: payment.ref_id,
        code: payment.code || "03",
        msg: payment.msg || "Payment status unknown",
        opay_status: payment.opay_status || "INITIAL",
        amount: payment.amount,
        currency: payment.currency || config.opay.currency
    };

    // Add optional fields if available
    if (payment.order_no) {
        response.order_no = payment.order_no;
    }
    if (payment.transaction_id) {
        response.transaction_id = payment.transaction_id;
    }
    if (payment.payment_channel) {
        response.payment_channel = payment.payment_channel;
    }
    if (payment.fee !== null && payment.fee !== undefined) {
        response.fee = payment.fee;
        response.fee_currency = payment.fee_currency;
    }

    res.status(200).json(response);
}

/**
 * Handle Nsano payment status check (Legacy)
 */
async function handleNsanoStatusCheck(payment, ref_id, res) {
    if (payment.code === "03" || !payment.code) {
        try {
            const authorRefID = `${config.nsano.short_name}${ref_id}`;
            const baseUrl = config.nsano.base_url;
            const statusUrl = `${baseUrl}/fusion/tp/metadata/house/receiving/refID/${authorRefID}/${config.nsano.api_key}`;

            const axios = require('axios');
            const statusResponse = await axios.get(statusUrl);

            if (statusResponse.data.code === "00" && statusResponse.data.msg) {
                const nsanoData = statusResponse.data.msg;
                let updateData = {};

                if (nsanoData) {
                    updateData = {
                        date: nsanoData.date,
                        type: nsanoData.type,
                    };
                }

                if (nsanoData.sendingHse?.result) {
                    updateData = {
                        ...updateData,
                        code: nsanoData.sendingHse.result.code,
                        msg: nsanoData.sendingHse.result.msg,
                        system_code: nsanoData.sendingHse.result.system_code,
                        system_msg: nsanoData.sendingHse.result.system_msg,
                        transaction_id: nsanoData.sendingHse.result.transactionID,
                        balance_after: nsanoData.sendingHse.balAfter,
                        user_id: nsanoData.sendingHse.userID
                    };
                }

                if (Object.keys(updateData).length > 0) {
                    Object.keys(updateData).forEach(key => {
                        if (updateData[key] === undefined || updateData[key] === null) {
                            delete updateData[key];
                        }
                    });

                    await payment.update(updateData);
                }
            }
        } catch (statusError) {
            console.error('Nsano status check error:', {
                error: statusError.message,
                response: statusError.response?.data,
                status: statusError.response?.status
            });
            // Continue with local data if status check fails
        }
    }

    // Refresh payment data
    payment = await models.Payment.findOne({
        where: { ref_id: ref_id }
    });

    res.status(200).json({
        ref_id: payment.ref_id,
        code: payment.code || "03",
        msg: payment.msg || "Payment status unknown",
    });
}

module.exports = router;