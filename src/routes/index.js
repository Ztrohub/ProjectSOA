module.exports = (app)=> {
    app.use('/accounts', require('./accountRoutes'))
}