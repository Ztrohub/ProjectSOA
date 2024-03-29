const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const accounts = await queryInterface.sequelize.query(
      `SELECT username, account_type from accounts;`
    );
    
    let totalChannels = 0;
    const minChannels = 10;
    const numAccounts = accounts[0].length;
    let extraChannels = minChannels - (Math.floor(Math.random() * 4) * numAccounts); // calculate the remaining channels after generating random channels for each account
    extraChannels = Math.max(extraChannels, 0); // ensure that extraChannels is not negative
    
    for (const account of accounts[0]) {
      let numChannels = 0;
      if (account.account_type === 'free') {
        numChannels = 1;
      } else if (account.account_type === 'premium') {
        numChannels = Math.floor(Math.random() * 4); // generate a random number of channels between 0 and 3
        if (extraChannels > 0) {
          numChannels += 1;
          extraChannels -= 1;
        }
      }
    
      for (let i = 0; i < numChannels; i++) {
        await queryInterface.bulkInsert('channels', [{
          id: faker.datatype.uuid(),
          name: faker.internet.domainWord().replace('-', ' '),
          user_prefix: 'US###',
          access_token: bcrypt.hashSync(`r-${crypto.randomBytes(16).toString('hex')}`, 10),
          account_username: account.username,
          created_at: new Date(),
          updated_at: new Date()
        }]);
        totalChannels++;
        if (totalChannels >= minChannels) {
          break;
        }
      }
      if (totalChannels >= minChannels) {
        break;
      }
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Channels', null, {});
  }
};
