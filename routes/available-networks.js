const express = require('express');
const checkAuthMiddleware = require('../middleware/check-auth');
const ipValidationMiddleware = require('../middleware/ip-validation');

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AvailableNetworks:
 *       type: object
 *       required:
 *         - token
 *       properties:
 *         token:
 *           type: string
 *           description: API token provided by API provider
 *       example:
 *         token: "<API token>"
 *
 *     NetworksResponse:
 *       type: object
 *       properties:
 *         ivory_coast:
 *           type: object
 *           properties:
 *             networks:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   name:
 *                     type: string
 *                   country:
 *                     type: string
 *         nigeria:
 *           type: object
 *           properties:
 *             payment_methods:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   code:
 *                     type: string
 *                   name:
 *                     type: string
 *                   country:
 *                     type: string
 */

/**
 * @swagger
 * /available-networks:
 *   post:
 *     summary: Get available payment networks and methods
 *     description: |
 *       Returns the available payment networks for Ivory Coast (Nsano)
 *       and payment methods for Nigeria (OPay).
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AvailableNetworks'
 *     responses:
 *       401:
 *         description: Unauthorized - Invalid token
 *       200:
 *         description: |
 *           **Sample Output**
 *           ```json
 *           {
 *             "ivory_coast": {
 *               "provider": "Nsano",
 *               "currency": "XOF",
 *               "networks": [
 *                 {
 *                   "code": "MTNCI",
 *                   "name": "MTN Côte d'Ivoire",
 *                   "country": "CI"
 *                 },
 *                 {
 *                   "code": "VODAFONE",
 *                   "name": "Vodafone Côte d'Ivoire",
 *                   "country": "CI"
 *                 },
 *                 {
 *                   "code": "AIRTEL",
 *                   "name": "Airtel Côte d'Ivoire",
 *                   "country": "CI"
 *                 },
 *                 {
 *                   "code": "GMONEY",
 *                   "name": "Green Money",
 *                   "country": "CI"
 *                 }
 *               ]
 *             },
 *             "nigeria": {
 *               "provider": "OPay",
 *               "currency": "NGN",
 *               "payment_methods": [
 *                 {
 *                   "code": "BankCard",
 *                   "name": "Bank Cards (Visa, MasterCard, Verve)",
 *                   "country": "NG"
 *                 },
 *                 {
 *                   "code": "BankAccount",
 *                   "name": "Bank Account Direct Debit",
 *                   "country": "NG"
 *                 },
 *                 {
 *                   "code": "BankTransfer",
 *                   "name": "Bank Transfer",
 *                   "country": "NG"
 *                 },
 *                 {
 *                   "code": "USSD",
 *                   "name": "USSD Payment",
 *                   "country": "NG"
 *                 },
 *                 {
 *                   "code": "OWealth",
 *                   "name": "OPay Wallet",
 *                   "country": "NG"
 *                 },
 *                 {
 *                   "code": "QR",
 *                   "name": "QR Code Payment",
 *                   "country": "NG"
 *                 }
 *               ]
 *             }
 *           }
 *           ```
 */
router.post("/", ipValidationMiddleware.ipValidation, checkAuthMiddleware.checkAuth, (req, res) => {
    const networks = {
        ivory_coast: {
            provider: "Nsano",
            currency: "XOF",
            country_code: "CI",
            networks: [
                {
                    code: "MTNCI",
                    name: "MTN Côte d'Ivoire",
                    country: "CI",
                    description: "MTN Mobile Money Côte d'Ivoire"
                },
                {
                    code: "VODAFONE",
                    name: "Vodafone Côte d'Ivoire",
                    country: "CI",
                    description: "Vodafone Cash Côte d'Ivoire"
                },
                {
                    code: "AIRTEL",
                    name: "Airtel Côte d'Ivoire",
                    country: "CI",
                    description: "Airtel Money Côte d'Ivoire"
                },
                {
                    code: "GMONEY",
                    name: "Green Money",
                    country: "CI",
                    description: "Green Money Mobile Payment"
                }
            ]
        },
        nigeria: {
            provider: "OPay",
            currency: "NGN",
            country_code: "NG",
            payment_methods: [
                {
                    code: "BankCard",
                    name: "Bank Cards (Visa, MasterCard, Verve)",
                    country: "NG",
                    description: "Credit and Debit card payments"
                },
                {
                    code: "BankAccount",
                    name: "Bank Account Direct Debit",
                    country: "NG",
                    description: "Direct debit from Nigerian bank accounts"
                },
                {
                    code: "BankTransfer",
                    name: "Bank Transfer",
                    country: "NG",
                    description: "Bank-to-bank transfer payments"
                },
                {
                    code: "USSD",
                    name: "USSD Payment",
                    country: "NG",
                    description: "USSD code-based mobile payments"
                },
                {
                    code: "OWealth",
                    name: "OPay Wallet",
                    country: "NG",
                    description: "OPay digital wallet payments"
                },
                {
                    code: "QR",
                    name: "QR Code Payment",
                    country: "NG",
                    description: "QR code scan-to-pay method"
                }
            ]
        }
    };

    res.status(200).json(networks);
});

module.exports = router;
*       Returns the available payment networks for Ivory Coast (