'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('BundleRequests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      beneficiary_msisdn: {
        type: Sequelize.STRING
      },
      beneficiary_name: {
        type: Sequelize.STRING
      },
      voice: {
        type: Sequelize.STRING
      },
      data: {
        type: Sequelize.STRING
      },
      sms: {
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
    await queryInterface.dropTable('BundleRequests');
  }
};