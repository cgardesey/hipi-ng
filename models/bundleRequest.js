'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BundleRequest extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {

    }
  }

  BundleRequest.init({
    beneficiary_msisdn: {
      type: DataTypes.STRING,
      allowNull: true
    },
    beneficiary_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    voice: {
      type: DataTypes.STRING,
      allowNull: true
    },
    data: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sms: {
      type: DataTypes.STRING,
      allowNull: true
    },
    createdAt: {
      type: DataTypes.DATE,
      // field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      // field: 'updated_at'
    }
  }, {
    sequelize,
    modelName: 'BundleRequest',
    // tableName: 'bundle_requests',
    // timestamps: true
  });

  return BundleRequest;
};
