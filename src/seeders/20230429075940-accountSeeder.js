const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Accounts', Array.from({ length: 10 }, () => {
      const firstName = faker.name.firstName();
      const lastName = faker.name.lastName();

      return {
        username: faker.internet.userName(firstName, lastName).toLowerCase(),
        email: faker.internet.email(firstName, lastName),
        name: `${firstName} ${lastName}`,
        password: bcrypt.hashSync('password', 10),
        account_type: faker.helpers.arrayElement(['free', 'premium']),
        created_at: new Date(),
        updated_at: new Date()
      }
    }))
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Accounts', null, {});
  }
};
