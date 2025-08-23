'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    /**
     * Add seed commands here.
     *
     * Example:
     * await queryInterface.bulkInsert('People', [{
     *   name: 'John Smith',
     *   isBetaMember: false
     * }], {});
     */
    return queryInterface.bulkInsert('payment_categories', [
      {
        type: 'MTN',
        description: 'MTN',
        createdAt: new Date(),
        UpdatedAt: new Date()
      },
      {
        type: 'ITC',
        description: 'ITC',
        createdAt: new Date(),
        UpdatedAt: new Date()
      },
    ]);
  },

  async down (queryInterface, Sequelize) {
    /**
     * Add commands to revert seed here.
     *
     * Example:
     * await queryInterface.bulkDelete('People', null, {});
     */
    return queryInterface.bulkDelete('payment_categories', {}, null);
  }
};
