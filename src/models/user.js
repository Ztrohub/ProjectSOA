'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class user extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      user.belongsTo(models.Channel, {
        foreignKey: 'channel_id',
        as: 'channel'
      });
      user.hasMany(models.Review, {
        foreignKey: 'user_id',
        as: 'reviews'
      });
    }
  }
  user.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    acc_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    channel_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
  }, {
    sequelize,
    modelName: 'User',
    underscored: true,
    paranoid: true,
    tableName: 'users',
    timestamps: true,
    name: {
      singular: 'User',
      plural: 'User'
    }
  });
  return user;
};