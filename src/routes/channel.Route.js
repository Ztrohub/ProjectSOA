const express = require('express')
const { createChannel, generateAccessToken, getChannels, getReviews } = require('../controllers/channel.Controller')
const { accountAuthen, channelAuthen, channelAuthor, channelAccessCheck } = require('../middlewares/Auth')
const router = express.Router()

router.post('/', accountAuthen, createChannel)
router.get('/', accountAuthen, getChannels)
router.get('/:id/generate-token', accountAuthen, channelAuthen, channelAuthor, generateAccessToken)
router.get('/reviews', channelAccessCheck, getReviews)

module.exports = router