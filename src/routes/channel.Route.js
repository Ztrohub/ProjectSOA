const express = require('express')
const { createChannel, generateAccessToken, getChannels } = require('../controllers/channel.Controller')
const { accountAuthen, channelAuthen, channelAuthor } = require('../middlewares/Auth')
const router = express.Router()

router.post('/', accountAuthen, createChannel)
router.get('/', accountAuthen, getChannels)
router.get('/:id/generate-token', accountAuthen, channelAuthen, channelAuthor, generateAccessToken)

module.exports = router