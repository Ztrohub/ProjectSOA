const joi = require('joi').extend(require('@joi/date'));
const createError = require('http-errors');
const axios = require('axios');
const db = require('../models');
const sequelize = db.sequelize;
const base64url = require('base64url');
const Sequelize = require('sequelize');

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const upload = multer({
    dest: "./img/uploads",
    limits: { fileSize: 1000000 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype != "image/png" && file.mimetype != "image/jpg" && file.mimetype != "image/jpeg") {
            return cb(new Error("Wrong file type"), null);
        }
        cb(null, true);
        },
});

module.exports = {
    createUsers: async (req, res, next) => {
        const channel = req.channel;

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

        const acc_id = req.query.acc_id;
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
        const user = req.user;
        const channel = req.channel;

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
    },

    createReview: async (req, res, next) => {
        upload.single("screenshot") (req, res, async function (err) {
            const schema = joi.object({
                rating: joi.number().integer().min(1).max(5).required(),
                review: joi.string().optional(),
                game_name: joi.string().optional(),
                game_id: joi.string().optional(),
                screenshot: joi.any().optional()
            })

            try {
                await schema.validateAsync(req.body)
            } catch (error) {
                if (error.isJoi === true) error.status = 422
                if(req.file) fs.unlinkSync(`./img/uploads/${req.file.filename}`);
                return next(error)
            }

            if (err) {
                if(req.file) fs.unlinkSync(`./img/uploads/${req.file.filename}`);
                return res.status(400).send({ ...err, msg: "wrong filetype" });
            } else if (!req.body.game_name && !req.body.game_id) {
                if(req.file) fs.unlinkSync(`./img/uploads/${req.file.filename}`);
                return next(createError.BadRequest('game_name or game_id is required'))
            }
    
            let game_id = -1;
            let game_name = "";
            if (req.body.game_id){
                game_id = req.body.game_id
            } else {
                const game = await axios.get('https://api.igdb.com/v4/games', {
                    headers: {
                        'Client-ID': process.env.IGDB_CLIENT_ID,
                        'Authorization': `Bearer ${process.env.IGDB_ACCESS_TOKEN}`
                    },
                    params: {
                        search: req.body.game_name,
                        fields: "name,rating",
                        limit: 1
                    }
                })
    
                if (game.data.length === 0) {
                    if(req.file) fs.unlinkSync(`./img/uploads/${req.file.filename}`);
                    return next(createError.BadRequest(`${req.body.game_name} is not found`))
                }
    
                game_id = game.data[0].id
                game_name = game.data[0].name
            }

            const reviewNumber = await db.Review.findAndCountAll();
            const myFilename = (req.file) ? `${reviewNumber.count + 1}${path.extname(req.file.originalname)}` : null;
            if(req.file){
                fs.renameSync(
                    `./img/uploads/${req.file.filename}`,
                    `./img/public/${myFilename}`
                );
            }

            const review = await db.Review.create({
                user_id: req.user.id,
                game_id: game_id,
                rating: req.body.rating,
                review: req.body.review,
                screenshot: myFilename,
                game_name: game_name
            })

            return res.status(201).json({
                message: 'Review created successfully',
                data: review
            })
        });
    },

    updateReviews: async (req, res, next) => {
        upload.single("screenshot") (req, res, async function (err) {
            const schema = joi.object({
                rating: joi.number().integer().min(1).max(5).optional(),
                review: joi.string().optional(),
                screenshot: joi.any().optional()
            })
    
            try {
                await schema.validateAsync(req.body)
            } catch (error){
                if (error.isJoi === true) error.status = 422
                return next(error)
            }

            if (err) {
                if(req.file) fs.unlinkSync(`./img/uploads/${req.file.filename}`);
                return res.status(400).send({ ...err, msg: "wrong filetype" });
            }

            const review = await db.Review.findOne({
                where: {
                    id: req.params.id,
                    user_id: req.user.id
                }
            })
    
            if (!review) {
                if(req.file) fs.unlinkSync(`./img/uploads/${req.file.filename}`);
                return next(createError.NotFound('Review not found'))
            }

            let myFilename = review.screenshot;
            if(req.file){
                if(myFilename == null){
                    myFilename = `${review.id}${path.extname(req.file.originalname)}`
                } else {
                    fs.unlinkSync(`./img/public/${myFilename}`);
                }

                fs.renameSync(
                    `./img/uploads/${req.file.filename}`,
                    `./img/public/${myFilename}`
                );
            }
    
            await review.update({
                rating: req.body.rating || review.rating,
                review: req.body.review || review.review,
                screenshot: myFilename
            })
    
            return res.status(200).json({
                message: 'Review updated successfully',
                data: review
            })
        });
    },

    deleteReview:  async (req, res, next) => {
        const review = await db.Review.findOne({
            where: {
                id: req.params.id,
                user_id: req.user.id
            }
        })

        if (!review) {
            return next(createError.NotFound('Review not found'))
        }

        if(review.screenshot != null) fs.unlinkSync(`./img/public/${review.screenshot}`);
        await review.destroy()

        return res.status(200).json({
            message: 'Review deleted successfully',
            data: review
        })
    },
}