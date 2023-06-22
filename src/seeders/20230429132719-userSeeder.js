const { faker } = require('@faker-js/faker');
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const channels = await queryInterface.sequelize.query(
      `SELECT c.id as id, a.account_type as account_type from channels c join accounts a on a.username = c.account_username;`
    );
    
    let totalUsers = 0;
    const minUsers = 10;

    for (const channel of channels[0]) {
      let numUsers = 0;
      let maxUsers = 5;
      if (channel.account_type === 'free') {
        maxUsers = 3;
      } else if (channel.account_type === 'premium') {
        if (totalUsers < minUsers) {
          bonusUsers = Math.floor(Math.random() * (minUsers - totalUsers - 1)) + 1;
          numUsers += bonusUsers;
        }
      }

      numUsers += Math.floor(Math.random() * maxUsers);
    
      for (let i = 0; i < numUsers; i++) {
        await queryInterface.bulkInsert('users', [{
          acc_id: `US${(i+1).toString().padStart(3, '0')}`,
          channel_id: channel.id,
          created_at: new Date(),
          updated_at: new Date()
        }]);
        totalUsers++;
        // if (totalUsers >= minUsers) {
        //   break;
        // }
      }
      // if (totalUsers >= minUsers) {
      //   break;
      // }
    }
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};
