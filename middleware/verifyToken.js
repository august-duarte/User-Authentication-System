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

module.exports = verifyToken;