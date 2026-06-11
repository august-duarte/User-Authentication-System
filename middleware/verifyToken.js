const jwt = require('jsonwebtoken');
const sql = require('../db');

const verifyToken = async (req, res, next) => {
  //puxa o token do header Authorization
  const token = req.header('Authorization')?.split(' ')[1];

  //se não tiver token, acesso negado
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    //verifica se o token é válido e puxa o id do user
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    const usedJwt = await sql`
    SELECT 1 FROM blacklisted_jwts WHERE jwt = ${token}
    `
    if (usedJwt.length > 0) return res.status(401).json({ message: 'Token already used' });
    
    next();
  } catch {
    //se token inválido, acesso negado
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = verifyToken;