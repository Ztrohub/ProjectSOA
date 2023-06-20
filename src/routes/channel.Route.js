const express = require('express')
const { createChannel, generateAccessToken, getChannels, createUsers, getUsers, deleteUser } = require('../controllers/channel.Controller')
const { accountAuthen, channelAuthen, channelAuthor, channelAccessCheck } = require('../middlewares/Auth')
const router = express.Router()

router.post('/', accountAuthen, createChannel)
router.get('/', accountAuthen, getChannels)
router.get('/:id/generate-token', accountAuthen, channelAuthen, channelAuthor, generateAccessToken)
router.post('/:id/users', channelAuthen, channelAccessCheck, createUsers)
router.get('/:id/users', channelAuthen, channelAccessCheck, getUsers)
router.delete('/:id/users/:acc_id', channelAuthen, channelAccessCheck, deleteUser)

module.exports = router