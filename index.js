const express = require('express');
const app = express();
const sql = require('./db');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//Import routes
const authRoute = require('./routes/auth')

//Route middlewares
app.use('/api/user', authRoute)

app.listen(3000, () => console.log('Server up and running'));

