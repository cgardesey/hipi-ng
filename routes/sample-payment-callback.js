const express = require('express');
const checkAuthMiddleware = require('../middleware/check-auth');
const ipValidationMiddleware = require('../middleware/ip-validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     SamplePaymentCallback:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: API token provided by API provider
 *       example:
 *         token: "<API token>"
 */

/**
 * @swagger
 * /sample-payment-callback:
 *   post:
 *     description: |
 *       **Sample Payment Callback Responses**
 *
 *       This endpoint returns samples of what you can expect to receive
 *       in your callback URL for both Nsano and OPay payments.
 *
 *       **Nsano Sample Output (Ivory Coast)**
 *       ```json
 *       {
 *         "code": "03",
 *         "msg": "Transaction is pending customer approval.",
 *         "ref_id": "9a06-4cb7-96fc-1742647e27af15407"
 *       }
 *       ```
 *
 *       **OPay Sample Output (Nigeria)**
 *       ```json
 *       {
 *         "ref_id": "TXN12345678",
 *         "code": "00",
 *         "msg": "Payment successful",
 *         "status": "SUCCESS",
 *         "amount": 5000.00,
 *         "currency": "NGN",
 *         "transaction_id": "211009140896553163",
 *         "payment_channel": "BankCard",
 *         "updated_at": "2024-01-15T10:30:45Z"
 *       }
 *       ```
 *
 *       **OPay Full Callback Structure**
 *
 *       The actual callback from OPay will have this structure:
 *       ```json
 *       {
 *         "payload": {
 *           "amount": "500000",
 *           "channel": "BankCard",
 *           "country": "NG",
 *           "currency": "NGN",
 *           "displayedFailure": "",
 *           "fee": "2500",
 *           "feeCurrency": "NGN",
 *           "instrumentType": "BankCard",
 *           "reference": "TXN12345678",
 *           "refunded": false,
 *           "status": "SUCCESS",
 *           "timestamp": "2024-01-15T10:30:45Z",
 *           "token": "211009140896553163",
 *           "transactionId": "211009140896553163",
 *           "updated_at": "2024-01-15T10:30:45Z"
 *         },
 *         "sha512": "signature_hash_here",
 *         "type": "transaction-status"
 *       }
 *       ```
 *
 *       ### Code Reference Table
 *
 *       | Code            | Description                               |
 *       |-----------------|-------------------------------------------|
 *       | 00              | Successful                                |
 *       | 03              | Pending                                   |
 *       | 01, 02, 05, etc | Failed                                    |
 *
 *       ### Payment Channels
 *       **Nigeria (OPay):**
 *       - BankCard, BankAccount, BankTransfer, USSD, OWealth, QR
 *
 *       **Ivory Coast (Nsano):**
 *       - MTNCI, VODAFONE, AIRTEL, GMONEY
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SamplePaymentCallback'
 *     responses:
 *       200:
 *         description: Sample response returned successfully.
 */
router.post("/", ipValidationMiddleware.ipValidation, checkAuthMiddleware.checkAuth, (req, res) => {
    // Return both sample formats for demonstration
    res.status(200).json({
        nsano_sample: {
            ref_id: "9a06-4cb7-96fc-1742647e27af15407",
            code: "03",
            msg: "Transaction is pending customer approval."
        },
        opay_sample: {
            ref_id: "TXN12345678",
            code: "00",
            msg: "Payment successful",
            status: "SUCCESS",
            amount: 5000.00,
            currency: "NGN",
            transaction_id: "211009140896553163",
            payment_channel: "BankCard",
            updated_at: new Date().toISOString()
        },
        note: "Your actual callback will receive one format based on the payment provider used."
    });
});

module.exports = router;