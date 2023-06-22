if (process.env.NODE_ENV === 'production'){
    require('dotenv').config({ path: '.env.prod'})
} 
else {
    require('dotenv').config({ path: '.env.dev'})
}

const express = require('express');
const fs = require("fs");
const app = express()
const PORT = process.env.PORT
const baseRouter = express.Router()
const mainRouter = require('./src/routes')
const { notFound, errorHandler } = require('./src/middlewares/ErrorHandling')

app.use(express.json());
app.use("/assets", express.static("./img/public"));
app.use(express.urlencoded({ extended: true }));

// ROUTES
mainRouter(baseRouter)
app.use('/api/v1', baseRouter)

// ERROR HANDLING
app.use(notFound)
app.use(errorHandler)

const initApp = async () => {
    try {
        if (!fs.existsSync("img/uploads")) {
            fs.mkdirSync("img/uploads"); 
            console.log('Folder uploads created successfully.');
        }

        if (!fs.existsSync("img/public")) { 
            fs.mkdirSync("img/public");
            console.log('Folder public created successfully.');
        }

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