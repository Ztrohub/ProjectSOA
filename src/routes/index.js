module.exports = (app)=> {
    app.use('/accounts', require('./account.Route'))
    app.use('/channels', require('./channel.Route'))
    app.use('/users', require('./user.Route'))
}