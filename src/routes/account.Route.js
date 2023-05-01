const express = require('express')
const { registerAccount, loginAccount, getAccount, updateAccount, topUpAccount } = require('../controllers/account.Controller')
const { accountAuthen } = require('../middlewares/Auth')
const router = express.Router()

router.post('/register', registerAccount)
router.post('/login', loginAccount)
router.get('/', accountAuthen, getAccount)
router.patch('/', accountAuthen, updateAccount)
router.post('/topup', accountAuthen, topUpAccount)
router.get('/upgrade', accountAuthen, updateAccount)

module.exports = router