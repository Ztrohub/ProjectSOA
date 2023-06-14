'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class channel extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      channel.belongsTo(models.Account, {
        foreignKey: 'account_username',
        as: 'account'
      });

      channel.hasMany(models.User, {
        foreignKey: 'channel_id',
        as: 'users'
      });
    }
  }
  channel.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
      autoIncrement: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    user_prefix: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'US###'
    },
    access_token: {
      type: DataTypes.STRING,
      allowNull: false
    },
    account_username: {
      type: DataTypes.STRING,
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'Channel',
    underscored: true,
    paranoid: true,
    tableName: 'channels',
    timestamps: true,
    name: {
      singular: 'Channel',
      plural: 'Channel'
    }
  });
  return channel;
};