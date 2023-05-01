const jwt = require('jsonwebtoken');
const { Account }  = require('../models');
const base64url = require('base64url');
const createError = require('http-errors');

module.exports = {
    accountAuthen : async (req, res, next) => {
        const token = req.headers["x-auth-token"]
        if (!token) {
            return next(createError.Unauthorized("Token is required"))
        }

        try {
            const decoded = jwt.verify(token, process.env.PRIVATE_KEY)
            
            const account = await Account.findOne({
                where: {
                    username: decoded.username
                }
            })

            req.account = account
            next()
        } catch (error) {
            return next(createError.Unauthorized("Invalid token"))
        }
    },
    channelAuthen : async (req, res, next) => {
        if (!req.params.id) {
            return next(createError.BadRequest("Channel ID is required"))
        }

        let id = ""
        try {
            id = base64url.decode(req.params.id)
        } catch (error) {
            return next(createError.Unauthorized("Invalid channel ID"))
        }

        const channel = await Channel.findOne({
            where: {
                id: id
            }
        })

        if (!channel){
            return next(createError.NotFound("Channel not found"))
        }

        req.channel = channel

        next()
    },
    channelAuthor : async (req, res, next) => {
        if (req.channel.account_username !== req.account.username) {
            return next(createError.Forbidden("You are not the owner of this channel"))
        }

        next()
    }

}