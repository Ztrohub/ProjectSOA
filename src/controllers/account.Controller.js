const Joi = require('joi').extend(require('@joi/date'));
const createError = require('http-errors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Account }  = require('../models');

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

        let value;
        try {
            value = await schema.validateAsync(req.body, {
                abortEarly: false,
                convert: false
            })
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            return next(error)
        }

        const account = await Account.create({
            username: value.username,
            email: value.email,
            name: value.name,
            password: bcrypt.hashSync(value.password, 10),
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

        let value;
        try {
            value = await schema.validateAsync(req.body, {
                abortEarly: false,
                convert: false
            })
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            return next(error)
        }

        const account = await Account.findOne({
            where: {
                username: value.username
            }
        })

        if (!account || !bcrypt.compareSync(value.password, account.password)) {
            return next(createError.NotFound('Username or password is incorrect'))
        }

        const token = jwt.sign({
            username: account.username
        }, process.env.PRIVATE_KEY, {
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
                    if(!value) return value

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
            password_confirmation: Joi.string()
        }).custom((value, helpers) => {
            const password = value.password;
            const password_confirmation = value.password_confirmation;
            
            if (password && !password_confirmation) {
                return helpers.message('Password confirmation is required')
            }

            if (!password && password_confirmation) {
                return helpers.message('Password is required')
            }

            if (password && password_confirmation && password !== password_confirmation) {
                return helpers.message('Password confirmation does not match with password')
            }
          
            return value
          }).or('email', 'name', 'password', 'password_confirmation').messages({
            'object.missing': 'At least one of email, name, or password is required'
        });

        let value;
        try {
            value = await schema.validateAsync(req.body, {
                abortEarly: false,
                convert: false
            })
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            return next(error)
        }
        
        let update = []
        if (req.body.email) {
            account.email = value.email
            update.push('Email')
        }

        if (req.body.name) {
            account.name = value.name
            update.push('Name')
        }

        if (req.body.password) {
            account.password = bcrypt.hashSync(value.password, 10)
            update.push('Password')
        }

        await account.save()

        return res.status(200).json({
            message: `${update.join(', ')} update success`,
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

        let value;
        try {
            value = await schema.validateAsync(req.body, {
                abortEarly: false,
                convert: true
            })
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            return next(error)
        }

        account.credit += value.credit

        await account.save()

        return res.status(200).json({
            message: 'Top up success',
            data: {
                username: account.username,
                email: account.email,
                name: account.name,
                account_type: account.account_type,
                credit: account.credit.toString(),
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