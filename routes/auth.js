const router = require('express').Router()
const sql = require('../db');
const bcrypt = require('bcrypt');

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
  
  //bcrypt pra fazer hash na senha
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

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
      VALUES (${name}, ${email}, ${hashedPassword})
      RETURNING id, name, email, created_at
    `;
    res.status(201).json(user);
  } catch (error) {
    console.error('Register failed', error);
    res.status(500).json({ message:'Something went wrong, please try again later' })
  }
})

//router pra login
router.post('/login', async (req, res) => {

  //valida as info
  const { error } = loginValidation(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message })
  }

  //mesma coisa em /register, menos nome
  const { email, password } = req.body;

  //verifica se user existe
  const [user] = await sql`
    SELECT * FROM users WHERE email = ${email}
  `
  //se deu errado, manda a mensagem de erro
  if (![user]) {
    return res.status(400).send('User doesn\'t exist. Please check your email and password.')
  }
  //compara a senha enviada com a senha na db
  const validPassword = await bcrypt.compare(password, user.password);

  //senha errada
  if (validPassword === false) {
    return res.status(400).json({ message: 'Invalid password' });
  }

  //se tudo deu certo, login ok
  res.send('Logged in!');
})
module.exports = router;