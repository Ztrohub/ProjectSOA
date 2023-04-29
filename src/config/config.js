if (process.env.NODE_ENV === 'production'){
  require('dotenv').config({ path: '.env.prod'})
} 
else {
  require('dotenv').config({ path: '.env.dev'})
}

module.exports = {
  "username": process.env.DB_USER,
  "password": process.env.DB_PASSWORD,
  "database": process.env.DB_NAME,
  "host": process.env.DB_HOST,
  "dialect": process.env.DB_DIALECT
}
