const Joi = require('joi').extend(require('@joi/date'));
const createError = require('http-errors');
const axios = require('axios');

module.exports = {
    createReview: async (req, res, next) => {
        const schema = Joi.object({
            rating: Joi.number().integer().min(1).max(5).required(),
            review: Joi.string().optional(),
            game_name: Joi.string().optional(),
            game_id: Joi.string().optional(),
            first: Joi.boolean().optional()
        })

        try {
            await schema.validateAsync(req.body)
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            return next(error)
        }

        if (!req.body.game_name && !req.body.game_id) {
            return next(createError.BadRequest('game_name or game_id is required'))
        }

        let game_id = -1;
        let first = req.body.first || false;

        if (req.body.game_id){
            game_id = req.body.game_id
        } else {
            const game = await axios.get('https://api.igdb.com/v4/games', {
                headers: {
                    'Client-ID': process.env.IGDB_CLIENT_ID,
                    'Authorization': `Bearer ${process.env.IGDB_ACCESS_TOKEN}`
                },
                search: req.body.game_name,
                fields: 'id,name',
                limit: 5
            })

            if (game.data.length === 0) {
                return next(createError.BadRequest(`${req.body.game_name} is not found`))
            }

            if (game.data.length === 1 || first) {
                game_id = game.data[0].id
            } else {
                return res.status(403).json({
                    message: 'Please choose one of the following games',
                    games: game.data
                })
            }
        }

        const review = await Review.create({
            user_id: req.user.id,
            game_id: game_id,
            rating: req.body.rating,
            review: req.body.review,
            screenshot: req.file ? req.file.filename : null
        })

        return res.status(201).json({
            message: 'Review created successfully',
            data: review
        })
    },
    // need to look
    updateReviews: async (req, res, next) => {
        const schema = Joi.object({
            rating: Joi.number().integer().min(1).max(5).optional(),
            review: Joi.string().optional(),
        })

        try {
            await schema.validateAsync(req.body)
        } catch (error){
            if (error.isJoi === true) error.status = 422
            return next(error)
        }

        const review = await Review.findOne({
            where: {
                id: req.params.id,
                user_id: req.user.id
            }
        })

        if (!review) {
            return next(createError.NotFound('Review not found'))
        }

        await review.update({
            rating: req.body.rating || review.rating,
            review: req.body.review || review.review,
            screenshot: req.file ? req.file.filename : review.screenshot
        })

        return res.status(200).json({
            message: 'Review updated successfully',
            data: review
        })
    },
    // need to look
    getReviews: async (req, res, next) => {
        const schema = Joi.object({
            game_id: Joi.number().integer().optional(),
            user_id: Joi.number().integer().optional(),
            limit: Joi.number().integer().optional(),
            offset: Joi.number().integer().optional()
        })

        try {
            await schema.validateAsync(req.query)
        } catch (error) {
            if (error.isJoi === true) error.status = 422
            return next(error)
        }

        const limit = req.query.limit || 10
        const offset = req.query.offset || 0

        let reviews = await Review.findAndCountAll({
            where: {
                game_id: req.query.game_id,
                user_id: req.query.user_id
            },
            limit: limit,
            offset: offset,
            order: [
                ['createdAt', 'DESC']
            ]
        })

        return res.status(200).json({
            message: 'Reviews retrieved successfully',
            data: reviews
        })
    },

    // need to look
    deleteReview:  async (req, res, next) => {
        const review = await Review.findOne({
            where: {
                id: req.params.id,
                user_id: req.user.id
            }
        })

        if (!review) {
            return next(createError.NotFound('Review not found'))
        }

        await review.destroy()

        return res.status(200).json({
            message: 'Review deleted successfully',
            data: review
        })
    },
    
    
}