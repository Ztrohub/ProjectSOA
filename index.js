if (process.env.NODE_ENV === 'production'){
    require('dotenv').config({ path: '.env.prod'})
} 
else {
    require('dotenv').config({ path: '.env.dev'})
}

const express = require('express')
const app = express()
const PORT = process.env.PORT
const baseRouter = express.Router()
const mainRouter = require('./src/routes')

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

mainRouter(baseRouter)
app.use('/api/v1', baseRouter)

const initApp = async () => {
    try {
        console.log('Connecting to database...')
        await require('./src/models').sequelize.sync()
        console.clear()
        console.log('Database connected!')
        app.listen(PORT, () => console.log(`Example app listening on port ${PORT}!`))
    } catch (error) {
        console.log('Error connecting to database: ', error)
    }
}

initApp()