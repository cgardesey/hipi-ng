const axios = require('axios');
const config = require('../config/config.json');
const { generateSignature, getBaseUrl, formatNigerianPhoneNumber, generateReference } = require('./opay-helper-functions');

async function createPayment(req, res) {
    try {
        // Format phone number for Nigeria
        const phoneNumber = formatNigerianPhoneNumber(req.body.phone_number || req.body.msisdn);

        const payment = {
            name: req.body.name,
            payer_id: req.body.payer_id,
            amount: parseFloat(req.body.amount),
            currency: req.body.currency || config.opay.currency,
            phone_number: phoneNumber,
            email: req.body.email,
            ref_id: req.body.ref_id || generateReference(),
            product_name: req.body.product_name || req.body.name,
            product_description: req.body.product_description || `Payment for ${req.body.name}`,
            pay_method: req.body.pay_method,
            user_client_ip: req.ip || req.body.user_client_ip,
            customer_visit_source: req.body.customer_visit_source || 'nativeApp',
            evoke_opay: req.body.evoke_opay !== false, // Default to true
            expire_at: req.body.expire_at || 300, // 5 minutes default
            display_name: req.body.display_name,
            sn: req.body.sn,
            country: config.opay.country
        };

        // Prepare OPay API payload
        const opayPayload = {
            country: payment.country,
            reference: payment.ref_id,
            amount: {
                total: Math.round(payment.amount * 100), // Convert to cents
                currency: payment.currency
            },
            returnUrl: config.opay.return_url,
            callbackUrl: config.opay.callback_url,
            cancelUrl: config.opay.cancel_url,
            customerVisitSource: payment.customer_visit_source,
            evokeOpay: payment.evoke_opay,
            expireAt: payment.expire_at,
            userInfo: {
                userEmail: payment.email,
                userId: payment.payer_id,
                userMobile: payment.phone_number,
                userName: payment.name
            },
            product: {
                name: payment.product_name,
                description: payment.product_description
            }
        };

        // Add optional fields
        if (payment.pay_method) {
            opayPayload.payMethod = payment.pay_method;
        }
        if (payment.user_client_ip) {
            opayPayload.userClientIP = payment.user_client_ip;
        }
        if (payment.display_name) {
            opayPayload.displayName = payment.display_name;
        }
        if (payment.sn) {
            opayPayload.sn = payment.sn;
        }

        // Make request to OPay API
        const baseUrl = getBaseUrl(true); // Use test environment for now
        const apiUrl = `${baseUrl}/api/v1/international/cashier/create`;

        const response = await axios.post(apiUrl, opayPayload, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.opay.public_key}`,
                'MerchantId': config.opay.merchant_id
            }
        });

        if (response.data.code === '00000') {
            const opayData = response.data.data;

            // Update payment object with OPay response
            payment.order_no = opayData.orderNo;
            payment.cashier_url = opayData.cashierUrl;
            payment.status = opayData.status;
            payment.create_time = Date.now();
            if (opayData.vat) {
                payment.vat_total = opayData.vat.total;
                payment.vat_currency = opayData.vat.currency;
            }

            return {
                success: true,
                data: {
                    reference: payment.ref_id,
                    order_no: payment.order_no,
                    cashier_url: payment.cashier_url,
                    status: payment.status,
                    amount: {
                        total: payment.amount,
                        currency: payment.currency
                    }
                },
                payment: payment
            };
        } else {
            return {
                success: false,
                error: response.data.message || 'Payment creation failed',
                code: response.data.code
            };
        }

    } catch (error) {
        console.error('OPay payment creation error:', error);
        return {
            success: false,
            error: error.response?.data?.message || error.message || 'Something went wrong!',
            code: error.response?.data?.code
        };
    }
}

module.exports = {
    createPayment
};