'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Payment.init({
    // Common fields
    name: DataTypes.STRING,
    payer_id: DataTypes.STRING,
    amount: DataTypes.DOUBLE,
    currency: DataTypes.STRING,
    ref_id: DataTypes.STRING,

    // OPay specific fields
    order_no: DataTypes.STRING,
    cashier_url: DataTypes.TEXT,
    opay_status: DataTypes.STRING,
    transaction_id: DataTypes.STRING,
    pay_method: DataTypes.STRING,
    payment_channel: DataTypes.STRING,
    fee: DataTypes.DECIMAL(10, 2),
    fee_currency: DataTypes.STRING,

    // User Info fields
    user_email: DataTypes.STRING,
    user_mobile: DataTypes.STRING,
    user_name: DataTypes.STRING,

    // Product Info fields
    product_name: DataTypes.STRING,
    product_description: DataTypes.TEXT,

    // OPay Response fields
    create_time: DataTypes.BIGINT,
    update_time: DataTypes.BIGINT,
    displayed_failure: DataTypes.TEXT,
    refunded: DataTypes.BOOLEAN,
    instrument_type: DataTypes.STRING,

    // Legacy fields (for backward compatibility)
    mno: DataTypes.STRING,
    msisdn: DataTypes.STRING,
    auth_token: DataTypes.STRING,
    sender_id_number: DataTypes.STRING,
    msg: DataTypes.STRING,
    code: DataTypes.STRING,
    reference: DataTypes.STRING,
    balance_before: DataTypes.STRING,
    map_id: DataTypes.STRING,
    va_version: DataTypes.STRING,
    map_name: DataTypes.STRING,
    date: DataTypes.STRING,
    system_msg: DataTypes.STRING,
    author_ref_id: DataTypes.STRING,
    system_code: DataTypes.STRING,
    type: DataTypes.STRING,
    user_id: DataTypes.STRING,
    network: DataTypes.STRING,
    balance_after: DataTypes.STRING,
    meta_data_id: DataTypes.STRING,
    author_ref: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Payment',
  });
  return Payment;
};