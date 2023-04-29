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
        foreignKey: 'accountUsername',
        as: 'account'
      });

      channel.hasMany(models.User, {
        foreignKey: 'channelId',
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
    accessToken: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    accountUsername: {
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Channel',
    underscored: true,
    paranoid: true,
    tableName: 'channels',
    timestamps: true,
    name: {
      singular: 'channel',
      plural: 'channels'
    }
  });
  return channel;
};