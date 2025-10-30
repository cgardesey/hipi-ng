const express = require('express');
const checkAuthMiddleware = require('../middleware/check-auth');
const ipValidationMiddleware = require('../middleware/ip-validation');
const models = require("../models");
const Validator = require("fastest-validator");
const { createPayment } = require('../helpers/pay');
const { formatNigerianPhoneNumber } = require('../helpers/opay-helper-functions');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Payment:
 *       type: object
 *       required:
 *         - token
 *         - name
 *         - payer_id
 *         - phone_number
 *         - email
 *         - amount
 *       properties:
 *         token:
 *           type: string
 *           description: API token provided by API provider
 *         name:
 *           type: string
 *           description: Payer's name
 *         payer_id:
 *           type: string
 *           description: User id of the payer
 *         phone_number:
 *           type: string
 *           description: Payer's phone number (e.g. +2348012345678, 08012345678)
 *         email:
 *           type: string
 *           format: email
 *           description: Payer's email address
 *         amount:
 *           type: number
 *           format: double
 *           description: Transaction amount in Naira (e.g. 1000.00)
 *           minimum: 1
 *         currency:
 *           type: string
 *           description: Payment currency (default NGN)
 *           default: NGN
 *         ref_id:
 *           type: string
 *           description: Unique transaction reference ID (auto-generated if not provided)
 *         pay_method:
 *           type: string
 *           description: Payment method (BankCard, BankTransfer, USSD, etc.) - optional
 *         product_name:
 *           type: string
 *           description: Name of product/service being paid for
 *         product_description:
 *           type: string
 *           description: Description of product/service
 *         customer_visit_source:
 *           type: string
 *           description: Source of customer visit (nativeApp, web)
 *           default: nativeApp
 *         evoke_opay:
 *           type: boolean
 *           description: Whether to evoke OPay app if available
 *           default: true
 *         expire_at:
 *           type: integer
 *           description: Payment expiration time in seconds
 *           default: 300
 *         display_name:
 *           type: string
 *           description: Sub merchant display name
 *         sn:
 *           type: string
 *           description: Device serial number
 *       example:
 *         token: "<API token>"
 *         name: "John Doe"
 *         payer_id: "12345"
 *         phone_number: "+2348012345678"
 *         email: "john.doe@example.com"
 *         amount: 1000.50
 *         currency: "NGN"
 *         ref_id: "TXN12345"
 *         pay_method: "BankCard"
 *         product_name: "Premium Service"
 *         product_description: "Premium service subscription"
 *         customer_visit_source: "nativeApp"
 *         evoke_opay: true
 *         expire_at: 300
 */

/**
 * @swagger
 * /payments:
 *   post:
 *     description: Create payment using OPay Cashier API for Nigeria
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Payment'
 *     responses:
 *       500:
 *         description: Some server error occurred
 *       401:
 *         description: Unauthorized - Invalid token
 *       400:
 *         description: Validation failed
 *       200:
 *         description: |
 *           **Sample Output**
 *           ```json
 *           {
 *              "reference": "TXN12345678901234",
 *              "order_no": "211009140896553163",
 *              "cashier_url": "https://sandboxcashier.opaycheckout.com/apiCashier/redirect/payment/checkout?orderToken=TOKEN",
 *              "status": "INITIAL",
 *              "amount": {
 *                "total": 1000.50,
 *                "currency": "NGN"
 *              }
 *           }
 *           ```
 *
 *           **The below table interprets the error codes and error message parameters this API may return**
 *
 *           | Error Code  | Error Message
 *           | ------------| -------------------------------------------------------------|
 *           | 02000       | authentication failed.                                       |
 *           | 02001       | request params not valid.                                    |
 *           | 02003       | payMethod not support.                                       |
 *           | 02004       | the payment reference(merchant order number) already exists. |
 *           | 02002       | merchant not configured with this function.                  |
 *           | 02007       | merchant not available.                                      |
 *           | 50003       | service not available, please try again.                     |
 *
 *           **Payment Methods Supported in Nigeria:**
 *           - BankCard (Visa, MasterCard, Verve)
 *           - BankTransfer
 *           - USSD
 *           - OPay Wallet
 *           - POS (Pay at retail locations)
 *
 *           **Payment Status:**
 *           - INITIAL: Payment created, waiting for customer action
 *           - PENDING: Payment in progress
 *           - SUCCESS: Payment completed successfully
 *           - FAIL: Payment failed
 *           - CLOSE: Payment cancelled or expired
 */
router.post("/", ipValidationMiddleware.ipValidation, checkAuthMiddleware.checkAuth, async (req, res) => {
    try {
        // Format phone number for Nigeria
        const phoneNumber = formatNigerianPhoneNumber(req.body.phone_number || req.body.msisdn);

        const payment = {
            name: req.body.name,
            payer_id: req.body.payer_id,
            amount: parseFloat(req.body.amount),
            currency: req.body.currency || 'NGN',
            phone_number: phoneNumber,
            email: req.body.email,
            ref_id: req.body.ref_id,
            pay_method: req.body.pay_method,
            product_name: req.body.product_name || req.body.name,
            product_description: req.body.product_description || `Payment for ${req.body.name}`,
            customer_visit_source: req.body.customer_visit_source || 'nativeApp',
            evoke_opay: req.body.evoke_opay !== false,
            expire_at: req.body.expire_at || 300,
            display_name: req.body.display_name,
            sn: req.body.sn
        };

        // Validation schema
        const schema = {
            name: { type: "string", optional: false, min: 1 },
            payer_id: { type: "string", optional: false, min: 1 },
            amount: { type: "number", optional: false, min: 1 },
            currency: { type: "string", optional: true, default: "NGN" },
            phone_number: { type: "string", optional: false, pattern: /^\+234[0-9]{10}$/ },
            email: { type: "email", optional: false },
            ref_id: { type: "string", optional: true },
            pay_method: { type: "string", optional: true },
            product_name: { type: "string", optional: false, min: 1 },
            product_description: { type: "string", optional: true },
            customer_visit_source: { type: "string", optional: true, enum: ["nativeApp", "web"] },
            evoke_opay: { type: "boolean", optional: true },
            expire_at: { type: "number", optional: true, min: 60, max: 3600 },
            display_name: { type: "string", optional: true },
            sn: { type: "string", optional: true }
        };

        const v = new Validator();
        const validationResponse = v.validate(payment, schema);

        if (validationResponse !== true) {
            return res.status(400).json({
                message: "Validation failed",
                errors: validationResponse
            });
        }

        // Check if reference already exists
        if (payment.ref_id) {
            const existingPayment = await models.Payment.findOne({
                where: { ref_id: payment.ref_id }
            });

            if (existingPayment) {
                return res.status(400).json({
                    message: "Payment reference already exists",
                    code: "02004"
                });
            }
        }

        // Create payment using OPay
        const result = await createPayment(req, res);

        if (result.success) {
            // Save payment to database
            await models.Payment.create(result.payment);

            res.status(200).json(result.data);
        } else {
            res.status(400).json({
                message: "Payment creation failed",
                error: result.error,
                code: result.code
            });
        }

    } catch (e) {
        console.error('Payment creation error:', e);
        res.status(500).json({
            message: "Something went wrong!"
        });
    }
});

module.exports = router;