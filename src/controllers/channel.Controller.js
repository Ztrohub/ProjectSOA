const joiValidate = require('../utils/joiValidate');

const { faker } = require('@faker-js/faker');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const joi = require('joi').extend(require('@joi/date'));
const base64url = require('base64url');
const Sequelize = require('sequelize');
const createError = require('http-errors');

module.exports = {
    createChannel: async (req, res, next) => {
        const account = req.account

        const count = await account.countChannels()

        if (account.account_type === 'free' && count === 1) {
            throw createError.Forbidden('Free account can only create one channel')
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
                id: base64url(channel.id),
                name: channel.name,
                user_prefix: channel.user_prefix,
                access_token: access_token,
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

        return res.status(200).json({
            message: 'Access token generated successfully! Save your access token. It will not be shown again.',
            data: {
                id: base64url(channel.id),
                name: channel.name,
                user_prefix: channel.user_prefix,
                access_token: access_token,
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
        }).xor('name', 'id').messages({
            'object.xor': 'name and id cannot be present at the same time'
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

            channels = await account.getChannels({
                where: {
                    id: req.query.id
                }
            })
        } else if (req.query.name){
            channels = await account.getChannels({
                where: {
                    [Sequelize.Op.and]: [
                        Sequelize.where(
                          Sequelize.fn('LOWER', Sequelize.col('name')),
                          'LIKE',
                          `%${req.query.name.toLowerCase()}%`
                        )
                      ]
                }
            })
        } else {
            channels = await account.getChannels()
        }

        if (channels.length == 0){
            next(createError.NotFound('No channels found'))
        }

        return res.status(200).json({
            message: 'Channels retrieved successfully!',
            data: channels.map(channel => {
                return {
                    id: base64url(channel.id),
                    name: channel.name,
                    user_prefix: channel.user_prefix,
                    account_username: channel.account_username,
                    created_at: channel.created_at,
                    updated_at: channel.updated_at
                }
            })
        })
    },

    createUsers: async (req, res, next) => {
        const channel = req.channel

        const schema = joi.object({
            ammount: joi.number().integer().min(1).optional(),
        })
    }
}