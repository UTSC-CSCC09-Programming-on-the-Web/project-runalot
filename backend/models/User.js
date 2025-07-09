import { sequelize } from "../datasource.js";
import { DataTypes } from "sequelize";

export const User = sequelize.define("User", {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  customerId: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subscription: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: true,
  },
  inRoom: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});
