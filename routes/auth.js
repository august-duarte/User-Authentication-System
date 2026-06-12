require('dotenv').config();
const router = require('express').Router()
const sql = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { registerValidation, loginValidation, updateProfileValidation } = require('../validation');
const verifyToken = require('../middleware/verifyToken');

//router pra registrar user novo
router.post('/register', async (req, res) => {
  try {
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
    const [user] = await sql`
      INSERT INTO users (name, email, password)
      VALUES (${name}, ${email}, ${hashedPassword})
      RETURNING id, name, email, created_at
    `;
    res.status(201).json(user);
  } catch (error) {
    console.error('Register failed', error);
    res.status(500).json({ message: 'Something went wrong, please try again later' });
  }
})

//router pra login
router.post('/login', async (req, res) => {
  try {
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
  } catch (error) {
    console.error('Login failed', error);
    res.status(500).json({ message: 'Something went wrong, please try again later' });
  }
})

//router para buscar próprio user
router.get('/me', verifyToken, async (req, res) => {
  try {
    //req.user puxa o user que está no token
    const { id } = req.user;
    const [user] = await sql`
      SELECT id, name, email, created_at FROM users WHERE id = ${id}
    `
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error('Get profile failed', error);
    res.status(500).json({ message: 'Something went wrong, please try again later' });
  }
});

//router para buscar user pelo id
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    //req.params puxa o que estiver no lugar de :userid na URL
    const { userId } = req.params;
    if (req.user.id !== Number(userId)) {
      const [currentUser] = await sql`
        SELECT is_admin FROM users WHERE id = ${req.user.id}
      `;
      if (!currentUser?.is_admin) {
        return res.status(403).json({ message: 'Not allowed' });
      }
    }
    const [user] = await sql`
      SELECT id, name, email, created_at FROM users WHERE id = ${userId}
    `
    //se user não existir
    if (!user) return res.status(404).json({ message: 'User not found' });
    //se user existir e verificação ok, manda o user
    res.json(user);
  } catch (error) {
    console.error('Get user failed', error);
    res.status(500).json({ message: 'Something went wrong, please try again later' });
  }
});

//router para mudar informações do user
router.patch('/me', verifyToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const { id } = req.user

    //verifica se as informações são válidas
    const { error } = updateProfileValidation(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message })
    }

    //verifica se o email já existe
    if (email) {
      const emailExists = await sql`
        SELECT * FROM users WHERE email = ${email} AND id != ${id}
      `;
      if (emailExists.length > 0) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    let user;

    //se body tiver email e nome
    if (name && email) {
      [user] = await sql`
        UPDATE users SET name = ${name}, email = ${email}
        WHERE id = ${id}
        RETURNING id, name, email, created_at
      `;

      //se body só tiver nome
    } else if (name) {
      [user] = await sql`
        UPDATE users SET name = ${name}
        WHERE id = ${id}
        RETURNING id, name, email, created_at
      `;

      //se body só tiver email
    } else if (email) {
      [user] = await sql`
        UPDATE users SET email = ${email}
        WHERE id = ${id}
        RETURNING id, name, email, created_at
      `;
    }
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    console.error('Information update failed', error);
    res.status(500).json({ message: 'Something went wrong, please try again later' });
  }
});

//router para logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Unauthorized' });
    await sql`
      INSERT INTO blacklisted_jwts (jwt) VALUES (${token})
    `;
    req.headers.authorization = null;
    res.status(200).json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout failed', error);
    res.status(500).json({ message: 'Something went wrong, please try again later' });
  }
});

//router para mudar senha
router.patch('/me/password', verifyToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const { id } = req.user;
    const [user] = await sql`
      SELECT * FROM users WHERE id = ${id}
    `;
    if (!user) return res.status(404).json({ message: 'User not found' });
    const validOldPassword = await bcrypt.compare(oldPassword, user.password)
    if (!validOldPassword) {
      return res.status(400).json({ message: 'Invalid old password' });
    }
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await sql`
      UPDATE users SET password = ${hashedNewPassword}
      WHERE id = ${req.user.id}
    `;
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update failed', error);
    res.status(500).json({ message: 'Something went wrong, please try again later' });
  }
});
module.exports = router;
