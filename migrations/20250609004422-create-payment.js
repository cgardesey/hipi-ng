'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Payments', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      // Common fields
      name: {
        type: Sequelize.STRING
      },
      payer_id: {
        type: Sequelize.STRING
      },
      amount: {
        type: Sequelize.DOUBLE
      },
      currency: {
        type: Sequelize.STRING,
        defaultValue: 'NGN'
      },
      ref_id: {
        type: Sequelize.STRING,
        unique: true
      },

      // OPay specific fields
      order_no: {
        type: Sequelize.STRING
      },
      cashier_url: {
        type: Sequelize.TEXT
      },
      opay_status: {
        type: Sequelize.STRING
      },
      transaction_id: {
        type: Sequelize.STRING
      },
      pay_method: {
        type: Sequelize.STRING
      },
      payment_channel: {
        type: Sequelize.STRING
      },
      fee: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      fee_currency: {
        type: Sequelize.STRING
      },

      // User Info fields
      user_email: {
        type: Sequelize.STRING
      },
      user_mobile: {
        type: Sequelize.STRING
      },
      user_name: {
        type: Sequelize.STRING
      },

      // Product Info fields
      product_name: {
        type: Sequelize.STRING
      },
      product_description: {
        type: Sequelize.TEXT
      },

      // OPay Response fields
      create_time: {
        type: Sequelize.BIGINT
      },
      update_time: {
        type: Sequelize.BIGINT
      },
      displayed_failure: {
        type: Sequelize.TEXT
      },
      refunded: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      instrument_type: {
        type: Sequelize.STRING
      },

      // Legacy fields (for backward compatibility)
      mno: {
        type: Sequelize.STRING
      },
      msisdn: {
        type: Sequelize.STRING
      },
      auth_token: {
        type: Sequelize.STRING
      },
      sender_id_number: {
        type: Sequelize.STRING
      },
      msg: {
        type: Sequelize.STRING
      },
      code: {
        type: Sequelize.STRING
      },
      reference: {
        type: Sequelize.STRING
      },
      balance_before: {
        type: Sequelize.STRING
      },
      map_id: {
        type: Sequelize.STRING
      },
      va_version: {
        type: Sequelize.STRING
      },
      map_name: {
        type: Sequelize.STRING
      },
      date: {
        type: Sequelize.STRING
      },
      system_msg: {
        type: Sequelize.STRING
      },
      author_ref_id: {
        type: Sequelize.STRING
      },
      system_code: {
        type: Sequelize.STRING
      },
      type: {
        type: Sequelize.STRING
      },
      user_id: {
        type: Sequelize.STRING
      },
      network: {
        type: Sequelize.STRING
      },
      balance_after: {
        type: Sequelize.STRING
      },
      meta_data_id: {
        type: Sequelize.STRING
      },
      author_ref: {
        type: Sequelize.STRING
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Payments');
  }
};