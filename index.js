const express = require('express');
const app = express();

//Import routes
const authRoute = require('./routes/auth')

//Route middlewares
app.use('/api/user', authRoute)

app.listen(3000, () => console.log('Server up and running'));

