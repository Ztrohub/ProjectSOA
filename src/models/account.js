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
    accountType: {
      type: DataTypes.ENUM('free', 'premium'),
      allowNull: false,
    }
  }, {
    sequelize,
    modelName: 'Account',
    underscored: true,
    paranoid: true,
    tableName: 'accounts',
    timestamps: true,
    name: {
      singular: 'account',
      plural: 'accounts'
    }
  });
  return Account;
};