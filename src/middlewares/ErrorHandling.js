const createError = require('http-errors')

module.exports = {
    notFound : (req, res, next) => {
        next(createError.NotFound())
    }, 
    errorHandler : (err, req, res, next) => {
        console.log(err)
        res.status(err.status || 500).send({
            error: {
                status: err.status || 500,
                message: err.message || 'Internal Server Error'
            }
        })
    }
}