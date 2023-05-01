const Joi = require('joi').extend(require('@joi/date'));
const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Account }  = require('../models');
const joiValidate  = require('../utils/joiValidate');

module.exports = {
    registerAccount: async (req, res, next) => {
        const schema = Joi.object({
            username: Joi.string().required().lowercase().trim().regex(/^\S+$/)
                .external(async (value) => {
                    const user = await Account.findOne({
                        where: {
                            username: value
                        }
                    })
                    if (user) {
                        throw createError.Conflict(`${value} already exists`)
                    }
                    return value
                }),
            email: Joi.string().required().trim().email()
                .external(async (value) => {
                    const user = await Account.findOne({
                        where: {
                            email: value
                        }
                    })
                    if (user) {
                        throw createError.Conflict(`${value} already exists`)
                    }
                    return value
                }),
            name: Joi.string().required(),
            password: Joi.string().required().min(8).max(32),
            password_confirmation: Joi.any().equal(Joi.ref('password')).required().messages({
                'any.only': 'Password confirmation does not match with password'
            })
        })

        await joiValidate(schema, req.body, next)

        const account = await Account.create({
            username: req.body.username,
            email: req.body.email,
            name: req.body.name,
            password: bcrypt.hashSync(req.body.password, 10),
            account_type: 'free',
            credit: 0
        })

        return res.status(201).json({
            message: 'Account created',
            data: {
                username: account.username,
                email: account.email,
                name: account.name,
                account_type: account.account_type,
                credit: account.credit,
                created_at: account.createdAt,
                updated_at: account.updatedAt
            }
        })
    },

    loginAccount: async (req, res, next) => {
        const schema = Joi.object({
            username: Joi.string().required(),
            password: Joi.string().required()
        })

        await joiValidate(schema, req.body, next)

        const account = await Account.findOne({
            where: {
                username: req.body.username
            }
        })

        if (!account || !bcrypt.compareSync(req.body.password, account.password)) {
            return next(createError.NotFound('Username or password is incorrect'))
        }

        const token = jwt.sign({
            username: account.username
        }, process.env.JWT_SECRET, {
            expiresIn: '1d'
        })

        return res.status(200).json({
            message: 'Login success',
            data: {
                token: token,
                username: account.username,
                email: account.email,
                name: account.name,
                account_type: account.account_type,
                credit: account.credit,
                created_at: account.created_at,
                updated_at: account.updated_at
            }
        })
    },

    updateAccount: async (req, res, next) => {
        const account = req.account

        const schema = Joi.object({
            email: Joi.string().optional().trim().email()
                .external(async (value) => {
                    const user = await Account.findOne({
                        where: {
                            email: value
                        }
                    })
                    if (user) {
                        throw createError.Conflict(`${value} already exists`)
                    }
                    return value
                }),
            name: Joi.string().optional(),
            password: Joi.string().optional().min(8).max(32),
            password_confirmation: Joi.any().equal(Joi.ref('password')).optional().messages({
                'any.only': 'Password confirmation does not match with password'
            })
        }).with('password', 'password_confirmation').messages({
            'object.with': (error) => {
                if (error.context.peers.includes('password_confirmation')){
                    return 'Password confirmation is required'
                } else {
                    return 'Password is required'
                }
            }
        })

        await joiValidate(schema, req.body, next)

        if (req.body.email) {
            account.email = req.body.email
        }

        if (req.body.name) {
            account.name = req.body.name
        }

        if (req.body.password) {
            account.password = bcrypt.hashSync(req.body.password, 10)
        }

        await account.save()

        return res.status(200).json({
            message: 'Account updated',
            data: {
                username: account.username,
                email: account.email,
                name: account.name,
                account_type: account.account_type,
                credit: account.credit,
                created_at: account.created_at,
                updated_at: account.updated_at
            }
        })
    },

    topUpAccount: async (req, res, next) => {
        const account = req.account

        const schema = Joi.object({
            credit: Joi.number().required().min(10000)
        })

        await joiValidate(schema, req.body, next)

        account.credit += req.body.credit

        await account.save()

        return res.status(200).json({
            message: 'Top up success',
            data: {
                username: account.username,
                email: account.email,
                name: account.name,
                account_type: account.account_type,
                credit: account.credit,
                created_at: account.created_at,
                updated_at: account.updated_at
            }
        })
    },

    upgradeAccount: async (req, res, next) => {
        const account = req.account
        
        if (account.account_type === 'premium') {
            return next(createError.Forbidden('Account is already premium'))
        }

        if (account.credit < 100000) {
            return next(createError.Forbidden('Not enough credit'))
        }

        account.account_type = 'premium'
        account.credit -= 100000

        await account.save()

        return res.status(200).json({
            message: 'Upgrade success',
            data: {
                username: account.username,
                email: account.email,
                name: account.name,
                account_type: account.account_type,
                credit: account.credit,
                created_at: account.created_at,
                updated_at: account.updated_at
            }
        })
    },

    getAccount: async (req, res, next) => {
        const account = req.account

        return res.status(200).json({
            message: 'Get account success',
            data: {
                username: account.username,
                email: account.email,
                name: account.name,
                account_type: account.account_type,
                credit: account.credit,
                created_at: account.created_at,
                updated_at: account.updated_at
            }
        })   
    }
}