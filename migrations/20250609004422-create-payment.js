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
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      payer_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      amount: {
        type: Sequelize.DOUBLE,
        allowNull: false
      },
      currency: {
        type: Sequelize.STRING,
        defaultValue: 'NGN'
      },
      ref_id: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: false
      },
      phone_number: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING
      },
      order_no: {
        type: Sequelize.STRING,
        unique: true
      },
      cashier_url: {
        type: Sequelize.TEXT
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: 'INITIAL'
      },
      pay_method: {
        type: Sequelize.STRING
      },
      transaction_id: {
        type: Sequelize.STRING,
        unique: true
      },
      channel: {
        type: Sequelize.STRING
      },
      fee: {
        type: Sequelize.DOUBLE
      },
      fee_currency: {
        type: Sequelize.STRING
      },
      instrument_type: {
        type: Sequelize.STRING
      },
      refunded: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      displayed_failure: {
        type: Sequelize.TEXT
      },
      create_time: {
        type: Sequelize.BIGINT
      },
      updated_at_timestamp: {
        type: Sequelize.STRING
      },
      product_name: {
        type: Sequelize.STRING
      },
      product_description: {
        type: Sequelize.TEXT
      },
      country: {
        type: Sequelize.STRING,
        defaultValue: 'NG'
      },
      user_client_ip: {
        type: Sequelize.STRING
      },
      customer_visit_source: {
        type: Sequelize.STRING
      },
      evoke_opay: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      expire_at: {
        type: Sequelize.INTEGER
      },
      display_name: {
        type: Sequelize.STRING
      },
      sn: {
        type: Sequelize.STRING
      },
      vat_total: {
        type: Sequelize.DOUBLE
      },
      vat_currency: {
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

    // Add indexes for better performance
    await queryInterface.addIndex('Payments', ['ref_id']);
    await queryInterface.addIndex('Payments', ['order_no']);
    await queryInterface.addIndex('Payments', ['transaction_id']);
    await queryInterface.addIndex('Payments', ['payer_id']);
    await queryInterface.addIndex('Payments', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Payments');
  }
};