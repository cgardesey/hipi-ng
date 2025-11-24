const express = require('express');
const checkAuthMiddleware = require('../middleware/check-auth');
const ipValidationMiddleware = require('../middleware/ip-validation');
const { BundleRequest } = require('../models');
const Validator = require("fastest-validator");
const config = require("../config/config.json");
const axios = require("axios");

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Bundle Request:
 *       type: object
 *       required:
 *         - token
 *         - beneficiary_msisdn
 *         - beneficiary_name
 *       properties:
 *         token:
 *           type: string
 *           description: API token provided by API provider
 *         beneficiary_msisdn:
 *           type: string
 *           description: Phone number of beneficiary
 *         beneficiary_name:
 *           type: string
 *           description: Beneficiary name
 *         voice:
 *           type: string
 *           description: Voice bundle in minutes
 *         data:
 *           type: string
 *           description: Data bundle in MB
 *         sms:
 *           type: string
 *           description: Sms bundle
 *       example:
 *         token: <API token>
 *         beneficiary_msisdn: "233546676098"
 *         beneficiary_name: John Doe
 *         voice: "200"
 *         data: "250"
 *         sms: ""
 */

/**
 * @swagger
 * /bundle-requests:
 *   post:
 *     description: Request bundle
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Bundle Request'
 *     responses:
 *       500:
 *         description: Some server error occurred. (May include a message body indicating the cause of the error)
 *       401:
 *         description: Unauthorized. (Indicates that token is invalid)
 *       204:
 *         description: Success response
 */

router.post("/", ipValidationMiddleware.ipValidation, checkAuthMiddleware.checkAuth, async (req, res) => {
    req.body.beneficiary_msisdn = req.body.beneficiary_msisdn || req.body.msisdn;
    const bundleRequest = {
        beneficiary_msisdn: req.body.beneficiary_msisdn,
        beneficiary_name: req.body.beneficiary_name,
        voice: req.body.voice,
        data: req.body.data,
        sms: req.body.sms
    }

    const schema = {
        beneficiary_msisdn: { type: "string", optional: false },
        beneficiary_name: { type: "string", optional: false },
        voice: { type: "string", optional: true },
        data: { type: "string", optional: true },
        sms: { type: "string", optional: true },
    };

    const v = new Validator();

    const validationResponse = v.validate(bundleRequest, schema);

    if (validationResponse !== true) {
        return res.status(400).json({
            message: "Validation failed",
            errors: validationResponse
        });
    }
    await BundleRequest.create(bundleRequest);
    try {
        res.status(204).send();
    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
});

module.exports = router;
