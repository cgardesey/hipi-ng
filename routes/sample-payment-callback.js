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
 *       **Sample Payment Callback Response for OPay Nigeria Integration**
 *
 *       This endpoint demonstrates the structure of callback data you'll receive
 *       when payment status changes in the OPay system.
 *
 *       **Sample Output**

 *       ```json
 *       {
 *         "ref_id": "TXN12345678901234",
 *         "code": "00",
 *         "msg": "Payment completed successfully",
 *         "status": "SUCCESS",
 *         "transaction_id": "211215140485151728",
 *         "amount": 1000.50,
 *         "currency": "NGN",
 *         "phone_number": "+2348012345678",
 *         "instrument_type": "BankCard"
 *       }
 *       ```

 *       ### Code Reference Table

 *       | Code            | Description | OPay Status |
 *       |-----------------|-------------|-------------|
 *       | 00              | Successful  | SUCCESS     |
 *       | 03              | Pending     | INITIAL, PENDING |
 *       | 01              | Failed      | FAIL, CLOSE |
 *
 *       ### Payment Methods in Nigeria
 *       - **BankCard**: Visa, MasterCard, Verve cards
 *       - **BankTransfer**: Direct bank transfer
 *       - **USSD**: Mobile banking via USSD codes
 *       - **OPay Wallet**: OPay digital wallet
 *       - **POS**: Pay at OPay retail locations
 *
 *       ### Integration Notes
 *       - Callbacks are sent via POST to your configured callback URL
 *       - Always respond with HTTP 200 to acknowledge receipt
 *       - Validate signatures using your OPay private key
 *       - Handle duplicate callbacks gracefully
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SamplePaymentCallback'
 *     responses:
 *       200:
 *         description: Sample callback response returned successfully.
 */
router.post("/", ipValidationMiddleware.ipValidation, checkAuthMiddleware.checkAuth, (req, res) => {
    res.status(200).json({
        ref_id: "TXN12345678901234",
        code: "00",
        msg: "Payment completed successfully",
        status: "SUCCESS",
        transaction_id: "211215140485151728",
        amount: 1000.50,
        currency: "NGN",
        phone_number: "+2348012345678",
        instrument_type: "BankCard"
    });
});

module.exports = router;