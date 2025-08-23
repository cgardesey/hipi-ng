const express = require('express');
const models = require('../models');
const config = require('../config/config.json');
const ipValidationMiddleware = require('../middleware/ip-validation');
const checkAuthMiddleware = require('../middleware/check-auth');
const { queryPaymentStatus } = require('../helpers/paymentStatus');
const { mapOpayStatus } = require('../helpers/opay-helper-functions');
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
 *         ref_id: "TXN12345678901234"
 *
 *     PaymentStatusResponse:
 *       type: object
 *       properties:
 *         ref_id:
 *           type: string
 *           description: Original payment reference
 *         code:
 *           type: string
 *           description: Status code indicating payment state
 *         msg:
 *           type: string
 *           description: Human-readable message describing payment status
 *         status:
 *           type: string
 *           description: OPay payment status
 *         order_no:
 *           type: string
 *           description: OPay order number
 *         transaction_id:
 *           type: string
 *           description: OPay transaction ID
 *         amount:
 *           type: object
 *           description: Payment amount details
 *       example:
 *         ref_id: "TXN12345678901234"
 *         code: "00"
 *         msg: "Payment completed successfully"
 *         status: "SUCCESS"
 *         order_no: "211009140896593010"
 *         transaction_id: "211215140485151728"
 *         amount:
 *           total: 1000.50
 *           currency: "NGN"
 */

/**
 * @swagger
 * /payment-status:
 *   post:
 *     summary: Check payment status
 *     description: |
 *       Check the status of a payment transaction using the reference ID from OPay Nigeria.
 *
 *       This endpoint queries the latest payment status from OPay and returns standardized status codes.
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
 *           **Sample Output**
 *           ```json
 *           {
 *              "ref_id": "TXN12345678901234",
 *              "code": "00",
 *              "msg": "Payment completed successfully",
 *              "status": "SUCCESS",
 *              "order_no": "211009140896593010",
 *              "transaction_id": "211215140485151728",
 *              "amount": {
 *                "total": 1000.50,
 *                "currency": "NGN"
 *              }
 *           }
 *           ```
 *
 *           ### Code Reference Table
 *
 *           |  Code           | Description | OPay Status |
 *           |-----------------|-------------|-------------|
 *           | 00              | Successful  | SUCCESS     |
 *           | 03              | Pending     | INITIAL, PENDING |
 *           | 01              | Failed      | FAIL, CLOSE |
 *
 *           ### OPay Payment Status Values
 *           - **INITIAL**: Payment created, waiting for customer action
 *           - **PENDING**: Payment in progress
 *           - **SUCCESS**: Payment completed successfully
 *           - **FAIL**: Payment failed
 *           - **CLOSE**: Payment cancelled or expired
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
                        message: "The 'ref_id' field is required.",
                        field: "ref_id"
                    }
                ]
            });
        }

        try {
            // Find payment record
            let payment = await models.Payment.findOne({
                where: { ref_id: ref_id }
            });

            if (!payment) {
                return res.status(400).json({
                    message: "Invalid ref_id",
                    code: "02006"
                });
            }

            // If payment status is not final, query OPay API for latest status
            const pendingStatuses = ['INITIAL', 'PENDING'];
            if (pendingStatuses.includes(payment.status) || !payment.status) {
                try {
                    console.log('Querying OPay API for status update:', ref_id);

                    const statusResult = await queryPaymentStatus(ref_id);

                    if (statusResult.success) {
                        const opayData = statusResult.data;

                        // Update payment record with latest status
                        const updateData = {
                            status: opayData.status,
                            order_no: opayData.order_no,
                            create_time: opayData.create_time
                        };

                        // Remove undefined values
                        Object.keys(updateData).forEach(key => {
                            if (updateData[key] === undefined) {
                                delete updateData[key];
                            }
                        });

                        await payment.update(updateData);

                        // Reload updated payment
                        payment = await models.Payment.findOne({
                            where: { ref_id: ref_id }
                        });

                        console.log('Payment status updated from OPay:', {
                            ref_id: ref_id,
                            old_status: payment.status,
                            new_status: opayData.status
                        });
                    } else {
                        console.error('OPay status query failed:', statusResult.error);
                        // Continue with local data if API call fails
                    }
                } catch (statusError) {
                    console.error('Error querying OPay status:', statusError.message);
                    // Continue with local data if status check fails
                }
            }

            // Prepare response
            const mappedCode = mapOpayStatus(payment.status);
            const statusMessage = getStatusMessage(payment.status);

            const response = {
                ref_id: payment.ref_id,
                code: mappedCode,
                msg: statusMessage,
                status: payment.status || 'INITIAL'
            };

            // Add optional fields if available
            if (payment.order_no) {
                response.order_no = payment.order_no;
            }
            if (payment.transaction_id) {
                response.transaction_id = payment.transaction_id;
            }
            if (payment.amount) {
                response.amount = {
                    total: payment.amount,
                    currency: payment.currency || 'NGN'
                };
            }

            res.status(200).json(response);

        } catch (error) {
            console.error('Payment status check error:', error);
            res.status(500).json({
                message: "Something went wrong!",
                error: error.message
            });
        }
    }
);

/**
 * Get human-readable status message
 * @param {string} status - OPay status
 * @returns {string} Status message
 */
function getStatusMessage(status) {
    const messageMap = {
        'INITIAL': 'Payment is being processed',
        'PENDING': 'Payment is pending customer approval',
        'SUCCESS': 'Payment completed successfully',
        'FAIL': 'Payment failed',
        'CLOSE': 'Payment was cancelled or expired'
    };

    return messageMap[status] || 'Payment status unknown';
}

module.exports = router;