const { faker } = require('@faker-js/faker');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const joi = require('joi').extend(require('@joi/date'));
const base64url = require('base64url');
const Sequelize = require('sequelize');
const db = require('../models');
const sequelize = db.sequelize;
const createError = require('http-errors');

module.exports = {
    createChannel: async (req, res, next) => {
        const account = req.account

        const count = await account.countChannels()

        if (account.account_type === 'free' && count === 1) {
            return next(createError.Forbidden('Free account can only create one channel. Please upgrade your account to create more channels'))
        }

        const schema = joi.object({
            name: joi.string().required(),
            user_prefix: joi.string().optional().trim().regex(/^\S+$/).messages({
                'string.pattern.base': 'User prefix cannot contain spaces'
            }).custom((value, helper) => {
                const regex = /#/g;
                const matches = value.match(regex);
                if (!matches || matches.length < 3) {
                    return helper.message('"user_prefix" must contain at least three "#" characters');
                }
                return value;
            })
        })

        try {
            await schema.validateAsync(req.body, {
                abortEarly: false,
                convert: false
            })
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            return next(error)
        }

        const access_token = `r-${crypto.randomBytes(16).toString('hex')}`

        const channel = await account.createChannel({
            id: faker.datatype.uuid(),
            name: req.body.name,
            user_prefix: req.body.user_prefix || "US###",
            access_token: bcrypt.hashSync(access_token, 10)
        })

        return res.status(201).json({
            message: 'Channel created successfully! Save your access token. It will not be shown again.',
            data: {
                access_token: access_token,
                id: base64url(channel.id),
                name: channel.name,
                user_prefix: channel.user_prefix,
                account_username: channel.account_username,
                created_at: channel.created_at,
                updated_at: channel.updated_at
            }
        })
    },

    generateAccessToken: async (req, res, next) => {
        const channel = req.channel

        const access_token = `r-${crypto.randomBytes(16).toString('hex')}`

        await channel.update({
            access_token: bcrypt.hashSync(access_token, 10)
        })

        console.log(access_token)
        console.log(channel.access_token)
        console.log(bcrypt.compareSync(access_token, channel.access_token))

        return res.status(200).json({
            message: 'Access token generated successfully! Save your access token. It will not be shown again.',
            data: {
                access_token: access_token,
                id: base64url(channel.id),
                name: channel.name,
                user_prefix: channel.user_prefix,
                account_username: channel.account_username,
                created_at: channel.created_at,
                updated_at: channel.updated_at
            }
        })
    },

    getChannels: async (req, res, next) => {
        const account = req.account

        const schema = joi.object({
            name: joi.string().optional(),
            id: joi.string().optional(),
        }).nand('name', 'id').messages({
            'object.nand': '"name" and "id" cannot be used together'
        })

        try {
            await schema.validateAsync(req.query, {
                abortEarly: false,
                convert: false
            })
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            return next(error)
        }

        let channels = []
        if (req.query.id) {
            req.query.id = base64url.decode(req.query.id)

            channels = await db.Channel.findAll({
                where: {
                    [Sequelize.Op.and]: [
                        {
                            id: req.query.id
                        },
                        {
                            account_username: account.username
                        }
                    ]
                }
            })
        } else if (req.query.name){
            channels = await db.Channel.findAll({
                where: {
                    [Sequelize.Op.and]: [
                        Sequelize.where(
                            Sequelize.fn('LOWER', Sequelize.col('name')),
                            'LIKE',
                            `%${req.query.name.toLowerCase()}%`
                        ),
                        {
                            account_username : account.username
                        }
                    ]
                }
            })
        } else {
            channels = await account.getChannels()
        }

        if (channels.length === 0){
            return next(createError.NotFound('No channels found'))
        }

        return res.status(200).json({
            message: 'Channels retrieved successfully!',
            data: {
                    length: channels.length,
                    channels: await Promise.all(channels.map(async (channel) => {
                        return {
                            id: base64url(channel.id),
                            name: channel.name,
                            user_prefix: channel.user_prefix,
                            user_count: await channel.countUsers(),
                            account_username: channel.account_username,
                            created_at: channel.created_at,
                            updated_at: channel.updated_at
                        }
                    }))
                }
        })
    },

    createUsers: async (req, res, next) => {
        const channel = req.channel

        const schema = joi.object({
            amount: joi.number().integer().min(1).optional(),
        })

        try {
            await schema.validateAsync(req.body)
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            return next(error)
        }

        const amount = req.body.amount || 1

        const userPrefix = channel.user_prefix

        const temp = await sequelize.query(`SELECT COUNT(*) FROM users WHERE channel_id = :channelId`, {
            type: sequelize.QueryTypes.SELECT,
            replacements: {
                channelId: channel.id
            }
        })

        let last_count = parseInt(temp[0]['COUNT(*)'])
        const users = []

        for (var i = 0; i < amount; i++) {
            last_count += 1
            const formattedCount = String(last_count).padStart(userPrefix.match(/#/g).length, '0');
            console.log(formattedCount)
            const user = await channel.createUser({
                acc_id: userPrefix.replace(new RegExp('#{1,' + userPrefix.match(/#+/)[0].length + '}', 'g'), formattedCount)
            })

            users.push(user.acc_id)
        }

        return res.status(201).json({
            message: 'Users created successfully!',
            data: {
                channel_id: base64url(channel.id),
                channel_name: channel.name,
                user_prefix: channel.user_prefix,
                user_count: await channel.countUsers(),
                created_user_count: parseInt(amount),
                created_user: users.join(', ')
            }
        })
    },

    getUsers: async (req, res, next) => {
        const channel = req.channel

        const schema = joi.object({
            acc_id: joi.string().optional(),
        })


        try {
            await schema.validateAsync(req.query, {
                abortEarly: false,
                convert: false
            })
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            return next(error)
        }

        const acc_id = req.query.acc_id

        if (!acc_id){
            const users = await channel.getUsers()

            return res.status(200).json({
                message: 'Users retrieved successfully!',
                data: {
                    channel_id: base64url(channel.id),
                    channel_name: channel.name,
                    user_prefix: channel.user_prefix,
                    user_count: await channel.countUsers(),
                    users: await Promise.all(users.map(async (user) => {
                        return {
                            acc_id: user.acc_id,
                            review_count: await user.countReviews(),
                            last_review: await user.getReviews({
                                limit: 1,
                                order: [['created_at', 'DESC']]
                            }).then(reviews => {
                                if (reviews.length === 0) return "No reviews yet"
                                return reviews[0].created_at
                            }),
                            created_at: user.created_at,
                            updated_at: user.updated_at,
                            is_deleted: user.deleted_at !== undefined
                        }
                    }
                    ))
                }
            })
        }

        const user = await db.User.findOne({
            where: {
                [Sequelize.Op.and]: [
                    {
                        acc_id: acc_id
                    },
                    {
                        channel_id: channel.id
                    }
                ]
            }
        })

        if (!user){
            return next(createError.NotFound('User not found'))
        }

        return res.status(200).json({
            message: 'User retrieved successfully!',
            data: {
                channel_id: base64url(channel.id),
                channel_name: channel.name,
                user_prefix: channel.user_prefix,
                user_count: await channel.countUsers(),
                user: {
                    acc_id: user.acc_id,
                    review_count: await user.countReviews(),
                    last_review: await user.getReviews({
                        limit: 1,
                        order: [['created_at', 'DESC']]
                    }).then(reviews => {
                        if (reviews.length === 0) return "No reviews yet"
                        return reviews[0].created_at
                    }
                    ),
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                    is_deleted: user.deleted_at !== null
                }
            }
        })
    },

    deleteUser: async (req, res, next) => {
        const channel = req.channel

        const schema = joi.object({
            acc_id: joi.string().required(),
            id: joi.string().required()
        })

        try {
            await schema.validateAsync(req.params)
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            return next(error)
        }

        const acc_id = req.params.acc_id

        const user = await db.User.findOne({
            where: {
                [Sequelize.Op.and]: [
                    {
                        acc_id: acc_id
                    },
                    {
                        channel_id: channel.id
                    }
                ]
            }
        })

        if (!user){
            return next(createError.NotFound('User not found'))
        }

        await user.destroy()

        return res.status(200).json({
            message: 'User deleted successfully!',
            data: {
                channel_id: base64url(channel.id),
                channel_name: channel.name,
                user_prefix: channel.user_prefix,
                user_count: await channel.countUsers(),
                user: {
                    acc_id: user.acc_id,
                    review_count: await user.countReviews(),
                    last_review: await user.getReviews({
                        limit: 1,
                        order: [['created_at', 'DESC']]
                    }).then(reviews => {
                        if (reviews.length === 0) return "No reviews yet"
                        return reviews[0].created_at
                    }
                    ),
                    created_at: user.created_at,
                    updated_at: user.updated_at,
                    is_deleted: user.deleted_at !== null
                }
            }
        })
    }

}