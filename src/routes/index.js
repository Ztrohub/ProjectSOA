module.exports = (app)=> {
    app.use('/accounts', require('./account.Route'))
    app.use('/channels', require('./channel.Route'))
}