const jwt = require('jsonwebtoken');
const db = require('../models');
const Sequelize = require('sequelize');
const base64url = require('base64url');
const bcrypt = require('bcrypt');
const createError = require('http-errors');
const multer = require("multer");
const fs = require("fs");
const upload = multer({
    dest: "./img/uploads",
    limits: { fileSize: 1000000 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype != "image/png") {
            return cb(new Error("Wrong file type"), null);
        }
        cb(null, true);
        },
});

module.exports = {
    accountAuthen : async (req, res, next) => {
        const token = req.headers["x-auth-token"]
        if (!token) {
            return next(createError.Unauthorized("Token is required"))
        }

        try {
            const decoded = jwt.verify(token, process.env.PRIVATE_KEY)
            
            const account = await db.Account.findOne({
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

        const channel = await db.Channel.findOne({
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
    },

    channelAccessCheck: async (req, res, next) => {
        const token = req.headers['access-token'];
        const channel_id = req.headers['channel-id'];

        if (!channel_id) {
            return next(createError.Unauthorized("Channel ID is required"))
        }

        const channel = await db.Channel.findOne({
            where: {
                id: base64url.decode(channel_id) 
            }
        })

        if (!channel) {
            return next(createError.NotFound("Channel not found"))
        }

        req.channel = channel
        
        if (!token) {
            return next(createError.Unauthorized("Access token is required. Started with 'r-'"))
        }

        if (!bcrypt.compareSync(token, req.channel.access_token)) {
            return next(createError.Unauthorized("Invalid access token. Started with 'r-'"))
        }

        next()
    },

    userAuth: async (req, res, next) => {
        if (!req.params.acc_id) {
            return next(createError.BadRequest("User acc_id is required"))
        }

        const user = await db.User.findOne({
            where: {
                [Sequelize.Op.and]: [
                    {
                        acc_id: req.params.acc_id
                    },
                    {
                        channel_id: req.channel.id
                    }
                ]
            }
        })

        if (!user) {
            return next(createError.NotFound("User not found"))
        }

        req.user = user

        next()
    }
}