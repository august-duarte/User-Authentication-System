const router = require('express').Router()
const sql = require('../db');

const { registerValidation, loginValidation } = require('../validation');

//router pra registrar user novo
router.post('/register', async (req, res) => {

  //validate data - ok
  const { error } = registerValidation(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  //destructuring the data - sei lá, faz vars do req.body
  const { name, email, password } = req.body;

  //checking if the user is already in the database - ok
  const emailExists = await sql`
    SELECT * FROM users WHERE email = ${email}
  `
  if (emailExists.length > 0) {
    return res.status(400).json({ message: 'Email already exists' });
  }


  //insert new user - ok, mas não sei muito de sql então foi puro ia
    try {
    const [user] = await sql`
      INSERT INTO users (name, email, password)
      VALUES (${name}, ${email}, ${password})
      RETURNING id, name, email, created_at
    `;
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

