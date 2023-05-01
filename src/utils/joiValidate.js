module.exports = async (schema, data, next) => {
    try {
        await schema.validateAsync(data, {
            abortEarly: false,
            convert: false
        })
    } catch (error) {
        if (error.isJoi === true) error.status = 422
        return next(error)
    }
}