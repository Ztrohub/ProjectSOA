'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Account extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Account.hasMany(models.Channel, {
        foreignKey: 'accountUsername',
        as: 'channels'
      });
    }
  }
  Account.init({
    username: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      primaryKey: true,
      autoIncrement: false
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    account_type: {
      type: DataTypes.ENUM('free', 'premium'),
      allowNull: false,
    },
    credit: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    modelName: 'Account',
    underscored: true,
    paranoid: true,
    tableName: 'accounts',
    timestamps: true,
    name: {
      singular: 'Account',
      plural: 'Account'
    }
  });
  return Account;
};