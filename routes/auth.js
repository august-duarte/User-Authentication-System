require('dotenv').config();
const router = require('express').Router()
const sql = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { registerValidation, loginValidation, nameValidation } = require('../validation');

const verifyToken = (req, res, next) => {
  //puxa o token do header Authorization
  const token = req.header('Authorization')?.split(' ')[1];

  //se não tiver token, acesso negado
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    //verifica se o token é válido e puxa o id do user
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    //se token inválido, acesso negado
    res.status(401).json({ message: 'Invalid token' });
  }
};

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
  if (!user) {
    return res.status(400).json({ message: 'User doesn\'t exist. Please check your email and password.' })
  }
  //compara a senha enviada com a senha na db
  const validPassword = await bcrypt.compare(password, user.password);

  //senha errada
  if (validPassword === false) {
    return res.status(400).json({ message: 'Invalid password' });
  }

  //cria o token
  const token = jwt.sign(
    { id: user.id },  //payload - info que vai no token
    process.env.JWT_SECRET, //secret - chave secreta para verificar o token
    { expiresIn: '1h' }); //options - tempo de expiração


  //se tudo deu certo, login ok
  res.json({ token: token });

})

//router para buscar próprio user
router.get('/me', verifyToken, async (req, res) => {
  //req.user puxa o user que está no token
  const { id } = req.user;
  const [user] = await sql`
    SELECT id, name, email, created_at FROM users WHERE id = ${id}
  `
  res.json(user);
  });

//router para buscar user pelo id
router.get('/:userId', verifyToken, async (req, res) => {
  //req.params puxa o que estiver no lugar de :userid na URL
  const { userId } = req.params;
  const [user] = await sql`
    SELECT id, name, email, created_at FROM users WHERE id = ${userId}
  `
  //se user não existir
  if (!user) return res.status(404).json({ message: 'User not found' });
  //se user existir e verificação ok, manda o user
  res.json(user);
});

//router para mudar nome do user
router.patch('/me', verifyToken, async (req, res) => {
  if (!user) return res.status(404).json({ message: 'User not found' });
  
  const { id } = req.user
  const { name } = req.body

  //verifica se o nome é válido
  const { error } = nameValidation(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message })
  }

  //atualiza o nome do user
  try {
    const [user] = await sql`
    UPDATE users 
    SET name = ${name}
    WHERE id = ${id}
    RETURNING id, name, email, created_at
    `;
    res.status(200).json(user);
  } catch (error) {
    console.error('Name update failed', error);
    res.status(500).json({ message:'Something went wrong, please try again later' })
  }
  
});
module.exports = router;