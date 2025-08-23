const {Op} = require("sequelize");
const models = require('../models');
const config = require('../config/config.json');
const axios = require('axios');
const Validator = require("fastest-validator");
const fetchSafaricomAccessToken = require('./fetchSafaricomAccessToken').fetchSafaricomAccessToken;
const opayHelper = require('./opay-helper-functions');

/**
 * Legacy pay function for M-Pesa/Safaricom (Kenya)
 * This function is kept for backward compatibility
 */
async function pay(req, res) {
    // Extract phone number - ensure it's in the correct format (2547XXXXXXXX)
    let phoneNumber = req.body.msisdn || req.body.phone_number;
    if (phoneNumber.startsWith('0')) {
        phoneNumber = '254' + phoneNumber.substring(1);
    } else if (phoneNumber.startsWith('+254')) {
        phoneNumber = phoneNumber.substring(1);
    }

    const payment = {
        name: req.body.name,
        payer_id: req.body.payer_id,
        party_a: phoneNumber,
        party_b: config.mpesa.business_short_code,
        phone_number: phoneNumber,
        amount: parseFloat(req.body.amount),
        transaction_desc: req.body.transaction_desc,
    };

    const schema = {
        name: { type: "string", optional: false },
        payer_id: { type: "string", optional: false },
        party_a: { type: "string", optional: false, pattern: /^254[0-9]{9}$/ },
        phone_number: { type: "string", optional: false, pattern: /^254[0-9]{9}$/ },
        amount: { type: "number", optional: false, min: 1 },
        transaction_desc: { type: "string", optional: false, max: 13 }
    };

    const v = new Validator();
    const validationResponse = v.validate(payment, schema);

    if (validationResponse !== true) {
        return res.status(400).json({
            message: "Validation failed",
            errors: validationResponse
        });
    }

    let created_payment = await models.Payment.create(payment);

    try {
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);
        const password = Buffer.from(config.mpesa.business_short_code + config.mpesa.passkey + timestamp).toString('base64');

        const stkResponse = await axios.post(config.mpesa.ni_push_url, {
            BusinessShortCode: config.mpesa.business_short_code,
            Password: password,
            Timestamp: timestamp,
            TransactionType: config.mpesa.transaction_type,
            Amount: payment.amount,
            PartyA: payment.party_a,
            PartyB: payment.party_b,
            PhoneNumber: payment.phone_number,
            CallBackURL: config.mpesa.callback_url,
            AccountReference: config.mpesa.account_reference,
            TransactionDesc: payment.transaction_desc
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await fetchSafaricomAccessToken()}`
            }
        });

        const updateObj = {};

        if ('ResponseCode' in stkResponse.data) {
            updateObj.response_code = stkResponse.data.ResponseCode;
        }
        if ('ResponseDescription' in stkResponse.data) {
            updateObj.response_description = stkResponse.data.ResponseDescription;
        }
        if ('MerchantRequestID' in stkResponse.data) {
            updateObj.merchant_request_id = stkResponse.data.MerchantRequestID;
        }
        if ('CheckoutRequestID' in stkResponse.data) {
            updateObj.checkout_request_id = stkResponse.data.CheckoutRequestID;
        }
        if ('ResultCode' in stkResponse.data) {
            updateObj.result_code = stkResponse.data.ResultCode;
        }
        if ('ResultDesc' in stkResponse.data) {
            updateObj.result_description = stkResponse.data.ResultDesc;
        }

        await created_payment.update(updateObj);

        // Check if STK Push was successful
        if (stkResponse.data.ResponseCode === "0") {
            res.status(200).json({
                response_code: stkResponse.data.ResponseCode,
                response_description: stkResponse.data.ResponseDescription,
                merchant_request_id: stkResponse.data.MerchantRequestID,
                checkout_request_id: stkResponse.data.CheckoutRequestID
            });
        } else {
            res.status(500).json({
                message: "Something went wrong!"
            });
        }

    } catch (e) {
        console.log(e);
        res.status(500).json({
            message: "Something went wrong!"
        });
    }
}

/**
 * Multi-provider payment function
 * Supports OPay (Nigeria), Nsano (Ivory Coast), and M-Pesa (Kenya)
 */
async function multiProviderPay(req, res) {
    try {
        // Determine payment provider based on request data
        const provider = determineProvider(req.body);

        switch (provider) {
            case 'opay':
                return await handleOpayPayment(req, res);
            case 'nsano':
                return await handleNsanoPayment(req, res);
            case 'mpesa':
                return await pay(req, res);
            default:
                return res.status(400).json({
                    message: "Unable to determine payment provider",
                    error: "Please specify country or use appropriate fields"
                });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({
            message: "Something went wrong!"
        });
    }
}

/**
 * Determine payment provider based on request data
 */
function determineProvider(body) {
    // Check for OPay indicators (Nigeria)
    if (body.user_email || body.product_name || body.pay_method ||
        (body.msisdn && body.msisdn.includes('234')) ||
        (body.user_mobile && body.user_mobile.includes('234')) ||
        body.country === 'NG') {
        return 'opay';
    }

    // Check for Nsano indicators (Ivory Coast)
    if (body.mno && ['MTNCI', 'VODAFONE', 'AIRTEL', 'GMONEY'].includes(body.mno) ||
        (body.msisdn && body.msisdn.includes('225')) ||
        body.country === 'CI') {
        return 'nsano';
    }

    // Check for M-Pesa indicators (Kenya)
    if (body.transaction_desc ||
        (body.msisdn && body.msisdn.includes('254')) ||
        (body.phone_number && body.phone_number.includes('254')) ||
        body.country === 'KE') {
        return 'mpesa';
    }

    return null;
}

/**
 * Handle OPay payment for Nigeria
 */
async function handleOpayPayment(req, res) {
    const formattedPhone = opayHelper.formatNigerianPhone(req.body.user_mobile || req.body.msisdn);

    const payment = {
        name: req.body.name,
        payer_id: req.body.payer_id,
        amount: parseFloat(req.body.amount),
        currency: config.opay.currency,
        ref_id: req.body.ref_id,
        user_email: req.body.user_email,
        user_mobile: formattedPhone,
        user_name: req.body.name,
        product_name: req.body.product_name || "Payment",
        product_description: req.body.product_description || "Payment for services",
        pay_method: req.body.pay_method
    };

    const schema = {
        name: { type: "string", optional: false, min: 1 },
        payer_id: { type: "string", optional: false, min: 1 },
        amount: { type: "number", optional: false, min: 1 },
        currency: { type: "string", optional: false, enum: ["NGN"] },
        ref_id: { type: "string", optional: false, min: 1 }
    };

    const v = new Validator();
    const validationResponse = v.validate(payment, schema);

    if (validationResponse !== true) {
        return res.status(400).json({
            message: "Validation failed",
            errors: validationResponse
        });
    }

    const created_payment = await models.Payment.create(payment);
    const opayResponse = await opayHelper.createPayment(payment);

    const updateObj = {
        order_no: opayResponse.data.orderNo,
        cashier_url: opayResponse.data.cashierUrl,
        opay_status: opayResponse.data.status,
        create_time: Date.now()
    };

    const statusMapping = opayHelper.mapOpayStatus(opayResponse.data.status);
    updateObj.code = statusMapping.code;
    updateObj.msg = statusMapping.msg;

    await created_payment.update(updateObj);

    res.status(200).json({
        code: opayResponse.code,
        message: opayResponse.message,
        data: opayResponse.data
    });
}

/**
 * Handle Nsano payment for Ivory Coast
 */
async function handleNsanoPayment(req, res) {
    let msisdn = req.body.msisdn;
    if (msisdn.startsWith('0')) {
        msisdn = '225' + msisdn.substring(1);
    } else if (msisdn.startsWith('+225')) {
        msisdn = msisdn.substring(1);
    }

    const payment = {
        name: req.body.name,
        payer_id: req.body.payer_id,
        amount: parseFloat(req.body.amount),
        mno: req.body.mno,
        ref_id: req.body.ref_id,
        msisdn: msisdn,
        auth_token: req.body.auth_token || "",
        sender_id_number: req.body.sender_id_number || ""
    };

    const schema = {
        name: { type: "string", optional: false, min: 1 },
        payer_id: { type: "string", optional: false, min: 1 },
        amount: { type: "number", optional: false, min: 0.1 },
        mno: { type: "string", optional: false, enum: ["MTNCI", "VODAFONE", "AIRTEL", "GMONEY"] },
        ref_id: { type: "string", optional: false, min: 1 },
        msisdn: { type: "string", optional: false, pattern: /^225[0-9]{9}$/ }
    };

    const v = new Validator();
    const validationResponse = v.validate(payment, schema);

    if (validationResponse !== true) {
        return res.status(400).json({
            message: "Validation failed",
            errors: validationResponse
        });
    }

    const created_payment = await models.Payment.create(payment);

    const nsanoPayload = {
        kuwaita: config.nsano.kuwaita,
        amount: payment.amount.toString(),
        mno: payment.mno,
        refID: payment.ref_id,
        msisdn: payment.msisdn
    };

    if (payment.auth_token) {
        nsanoPayload.authToken = payment.auth_token;
    }
    if (payment.sender_id_number) {
        nsanoPayload.senderIDNumber = payment.sender_id_number;
    }
    if (config.nsano.recipient) {
        nsanoPayload.recipient = config.nsano.recipient;
    }

    const baseUrl = config.nsano.base_url;
    const debitUrl = `${baseUrl}/api/fusion/tp/${config.nsano.api_key}`;

    const nsanoResponse = await axios.post(
        debitUrl,
        new URLSearchParams(nsanoPayload).toString(),
        {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
    );

    const updateObj = {
        msg: nsanoResponse.data.msg,
        code: nsanoResponse.data.code,
        reference: nsanoResponse.data.reference
    };

    if ('sendingHouseMap' in nsanoResponse.data) {
        const sendingHouse = nsanoResponse.data.sendingHouseMap;
        if ('balance' in sendingHouse) {
            updateObj.balance_before = sendingHouse.balance.toString();
        }
        if ('mapID' in sendingHouse) {
            updateObj.map_id = sendingHouse.mapID;
        }
        if ('VAVersion' in sendingHouse) {
            updateObj.va_version = sendingHouse.VAVersion.toString();
        }
        if ('mapName' in sendingHouse) {
            updateObj.map_name = sendingHouse.mapName;
        }
    }

    await created_payment.update(updateObj);

    if (nsanoResponse.data.code === "00" || nsanoResponse.data.code === "03") {
        res.status(200).json({
            msg: nsanoResponse.data.msg,
            code: nsanoResponse.data.code
        });
    } else {
        res.status(400).json({
            message: "Payment request failed",
            error: nsanoResponse.data.msg || "Unknown error occurred",
            code: nsanoResponse.data.code
        });
    }
}

module.exports = {
    pay: pay,
    multiProviderPay: multiProviderPay
};