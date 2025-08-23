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
    name: DataTypes.STRING,
    payer_id: DataTypes.STRING,
    amount: DataTypes.DOUBLE,
    currency: DataTypes.STRING,
    ref_id: DataTypes.STRING,
    phone_number: DataTypes.STRING,
    email: DataTypes.STRING,
    order_no: DataTypes.STRING,
    cashier_url: DataTypes.TEXT,
    status: DataTypes.STRING,
    pay_method: DataTypes.STRING,
    transaction_id: DataTypes.STRING,
    channel: DataTypes.STRING,
    fee: DataTypes.DOUBLE,
    fee_currency: DataTypes.STRING,
    instrument_type: DataTypes.STRING,
    refunded: DataTypes.BOOLEAN,
    displayed_failure: DataTypes.TEXT,
    create_time: DataTypes.BIGINT,
    updated_at_timestamp: DataTypes.STRING,
    product_name: DataTypes.STRING,
    product_description: DataTypes.TEXT,
    country: DataTypes.STRING,
    user_client_ip: DataTypes.STRING,
    customer_visit_source: DataTypes.STRING,
    evoke_opay: DataTypes.BOOLEAN,
    expire_at: DataTypes.INTEGER,
    display_name: DataTypes.STRING,
    sn: DataTypes.STRING,
    vat_total: DataTypes.DOUBLE,
    vat_currency: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Payment',
  });
  return Payment;
};