const models = require('../models');
const config = require("../config/config.json");
const opayHelper = require('./opay-helper-functions');

/**
 * Update payment status from Nsano callback
 * @param {object} callbackData - Nsano callback data
 */
async function nsanoPaymentStatusUpdate(callbackData) {
    let updateObj = {};

    // Map Nsano callback fields to database fields based on your model
    const fieldMapping = {
        'msg': 'msg',
        'code': 'code',
        'system_msg': 'system_msg',
        'system_code': 'system_code',
        'authorRefID': 'author_ref_id',
        'userID': 'user_id',
        'transactionID': 'transaction_id',
        'network': 'network',
        'reference': 'reference',
        'balBefore': 'balance_before',
        'balAfter': 'balance_after',
        'metadataID': 'meta_data_id',
        'refID': 'ref_id',
        'author_ref': 'author_ref',
        'date': 'date',
        'type': 'type'
    };

    // Build update object
    Object.keys(fieldMapping).forEach(nsanoField => {
        if (nsanoField in callbackData && callbackData[nsanoField] !== undefined) {
            updateObj[fieldMapping[nsanoField]] = callbackData[nsanoField];
        }
    });

    // Find payment by refID or authorRefID
    let whereClause = {};
    if (callbackData.refID) {
        whereClause.ref_id = callbackData.refID;
    } else if (callbackData.authorRefID) {
        const shortName = config.nsano.short_name;
        if (callbackData.authorRefID.startsWith(shortName)) {
            whereClause.ref_id = callbackData.authorRefID.substring(shortName.length);
        }
    }

    if (Object.keys(whereClause).length > 0) {
        await models.Payment.update(updateObj, { where: whereClause });
    }
}

/**
 * Update payment status from OPay callback
 * @param {object} callbackData - OPay callback data
 */
async function opayPaymentStatusUpdate(callbackData) {
    const { payload } = callbackData;

    const updateObj = {
        opay_status: payload.status,
        transaction_id: payload.transactionId,
        payment_channel: payload.channel,
        instrument_type: payload.instrumentType,
        fee: parseFloat(payload.fee || 0) / 100,
        fee_currency: payload.feeCurrency,
        update_time: new Date(payload.updated_at).getTime(),
        displayed_failure: payload.displayedFailure || '',
        refunded: payload.refunded || false
    };

    // Map OPay status to internal codes
    const statusMapping = opayHelper.mapOpayStatus(payload.status);
    updateObj.code = statusMapping.code;
    updateObj.msg = statusMapping.msg;

    // Remove undefined values
    Object.keys(updateObj).forEach(key => {
        if (updateObj[key] === undefined || updateObj[key] === null) {
            delete updateObj[key];
        }
    });

    // Find and update payment by reference
    await models.Payment.update(updateObj, {
        where: { ref_id: payload.reference }
    });
}

/**
 * Generic payment status update function
 * @param {object} callbackData - Callback data
 * @param {string} source - Source of callback ('nsano', 'opay')
 */
async function paymentStatusUpdate(callbackData, source = 'nsano') {
    try {
        if (source === 'opay') {
            await opayPaymentStatusUpdate(callbackData);
        } else {
            await nsanoPaymentStatusUpdate(callbackData);
        }
    } catch (error) {
        console.error(`Payment status update error (${source}):`, error);
        throw error;
    }
}

module.exports = {
    paymentStatusUpdate,
    nsanoPaymentStatusUpdate,
    opayPaymentStatusUpdate
};