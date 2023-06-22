const express = require('express')
const { channelAccessCheck, userAuth } = require('../middlewares/Auth')
const { createUsers, getUsers, deleteUser, createReview, updateReviews, deleteReview } = require('../controllers/user.Controller')
const router = express.Router()

router.post('/', channelAccessCheck, createUsers)
router.get('/', channelAccessCheck, getUsers)
router.delete('/:acc_id', channelAccessCheck, userAuth, deleteUser)
router.post('/:acc_id/review', channelAccessCheck, userAuth, createReview)
router.patch('/:acc_id/review/:id', channelAccessCheck, userAuth, updateReviews)
router.delete('/:acc_id/review/:id', channelAccessCheck, userAuth, deleteReview)

module.exports = router