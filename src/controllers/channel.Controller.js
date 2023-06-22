const { faker } = require('@faker-js/faker');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const axios = require('axios');
const joi = require('joi').extend(require('@joi/date'));
const base64url = require('base64url');
const Sequelize = require('sequelize');
const db = require('../models');
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

    getReviews: async (req, res, next) => {
        const schema = joi.object({
            game_name: joi.string().optional(),
            game_id: joi.number().integer().optional(),
            acc_id: joi.string().optional(),
        })

        try {
            await schema.validateAsync(req.query)
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            return next(error)
        }

        if (!req.query.game_name && !req.query.game_id && !req.query.acc_id){
            const reviews = await db.Review.findAll({
                include: {
                    model: db.User,
                    as: "user",
                    where: {
                        channel_id: req.channel.id
                    }
                } 
            });

            if (reviews.length === 0){
                return next(createError.NotFound('No reviews found'))
            }

            return res.status(200).json({
                message: 'Reviews retrieved successfully!',
                data: {
                    length: reviews.length,
                    channel: {
                        id: base64url(req.channel.id),
                        name: req.channel.name,
                    },
                    reviews: await Promise.all(reviews.map(async (review) => {
                        const user = await db.User.findOne({
                            where: {
                                id: review.user_id
                            }
                        })

                        return {
                            id: review.id,
                            game_id: review.game_id,
                            game_name: review.game_name,
                            acc_id: user.acc_id,
                            rating: review.rating,
                            review: review.review,
                            screenshot: review.screenshot == undefined ? "No Screenshot" : `https://domain/assets/${review.screenshot}`,
                            created_at: review.created_at,
                            updated_at: review.updated_at == undefined ? "Not updated yet" : review.updated_at,
                            deleted_at: review.deleted_at == undefined ? "Not deleted yet" : review.deleted_at
                        }
                    }
                    ))
                }
            }) 
        }

        let game_id;
        if (req.query.game_id) game_id = req.query.game_id
        else if (req.query.game_name) {
            const game = await axios.get('https://api.igdb.com/v4/games', {
                headers: {
                    'Client-ID': process.env.IGDB_CLIENT_ID,
                    'Authorization': `Bearer ${process.env.IGDB_ACCESS_TOKEN}`
                },
                params: {
                    search: req.query.game_name,
                    fields: "name,rating",
                    limit: 1
                }
            });

            if (game.data.length === 0) {
                return next(createError.BadRequest(`${req.body.game_name} is not found`))
            }

            game_id = game.data[0].id;
        }

        let user_id;
        if (req.query.acc_id){
            const user = await db.User.findOne({
                where: {
                    [Sequelize.Op.and]: [
                        {
                            acc_id: req.query.acc_id
                        },
                        {
                            channel_id: req.channel.id
                        }
                    ]
                }
            })

            if (!user){
                return next(createError.BadRequest(`User with id ${req.query.acc_id} is not found`))
            }

            user_id = user.id
        }

        if (game_id && user_id){
            const reviews = await db.Review.findAll({
                where: {
                    [Sequelize.Op.and]: [
                        {
                            game_id: game_id
                        },
                        {
                            user_id: user_id
                        }
                    ]
                }
            })

            if (reviews.length === 0){
                return next(createError.NotFound('No reviews found'))
            }

            return res.status(200).json({
                message: 'Reviews retrieved successfully!',
                data: {
                    length: reviews.length,
                    channel: {
                        id: base64url(req.channel.id),
                        name: req.channel.name,
                    },
                    reviews: await Promise.all(reviews.map(async (review) => {
                        const user = await db.User.findOne({
                            where: {
                                id: review.user_id
                            }
                        })

                        return {
                            id: review.id,
                            game_id: review.game_id,
                            game_name: review.game_name,
                            acc_id: user.acc_id,
                            rating: review.rating,
                            review: review.review,
                            screenshot: review.screenshot == undefined ? "No Screenshot" : `https://domain/assets/${review.screenshot}`,
                            created_at: review.created_at,
                            updated_at: review.updated_at == undefined ? "Not updated yet" : review.updated_at,
                            deleted_at: review.deleted_at == undefined ? "Not deleted yet" : review.deleted_at
                        }
                    }
                    ))
                }
            }) 
        } else if (game_id){
            const reviews = await db.Review.findAll({
                include: {
                    model: db.User,
                    as: "user",
                    where: {
                        channel_id: req.channel.id
                    }
                },
                where: {
                    game_id: game_id
                }
            })

            if (reviews.length === 0){
                return next(createError.NotFound('No reviews found'))
            }

            return res.status(200).json({
                message: 'Reviews retrieved successfully!',
                data: {
                    length: reviews.length,
                    channel: {
                        id: base64url(req.channel.id),
                        name: req.channel.name,
                    },
                    reviews: await Promise.all(reviews.map(async (review) => {
                        const user = await db.User.findOne({
                            where: {
                                id: review.user_id
                            }
                        })

                        return {
                            id: review.id,
                            game_id: review.game_id,
                            game_name: review.game_name,
                            acc_id: user.acc_id,
                            rating: review.rating,
                            review: review.review,
                            screenshot: review.screenshot == undefined ? "No Screenshot" : `https://domain/assets/${review.screenshot}`,
                            created_at: review.created_at,
                            updated_at: review.updated_at == undefined ? "Not updated yet" : review.updated_at,
                            deleted_at: review.deleted_at == undefined ? "Not deleted yet" : review.deleted_at
                        }
                    }
                    ))
                }
            })
        } else {
            const reviews = await db.Review.findAll({
                where: {
                    user_id: user_id
                }
            })

            if (reviews.length === 0){
                return next(createError.NotFound('No reviews found'))
            }

            return res.status(200).json({
                message: 'Reviews retrieved successfully!',
                data: {
                    length: reviews.length,
                    channel: {
                        id: base64url(req.channel.id),
                        name: req.channel.name,
                    },
                    reviews: await Promise.all(reviews.map(async (review) => {
                        const user = await db.User.findOne({
                            where: {
                                id: review.user_id
                            }
                        })

                        return {
                            id: review.id,
                            game_id: review.game_id,
                            game_name: review.game_name,
                            acc_id: user.acc_id,
                            rating: review.rating,
                            review: review.review,
                            screenshot: review.screenshot == undefined ? "No Screenshot" : `https://domain/assets/${review.screenshot}`,
                            created_at: review.created_at,
                            updated_at: review.updated_at == undefined ? "Not updated yet" : review.updated_at,
                            deleted_at: review.deleted_at == undefined ? "Not deleted yet" : review.deleted_at
                        }
                    }
                    ))
                }
            })
        }
    },
}