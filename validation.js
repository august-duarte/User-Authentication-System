const Joi = require('@hapi/joi');

//verifica se tudo tá ok pra registrat user novo
const registerValidation = (data) => {
  const schema = Joi.object({
    name: Joi.string().max(255).required(),
    email: Joi.string().email().max(255).required(),
    password: Joi.string().min(6).max(255).required(),
  });
  return schema.validate(data);
}

//mesma coisa, mas pra login - só email e senha
const loginValidation = (data) => {
  const schema = Joi.object({
    email: Joi.string().email().max(255).required(),
    password: Joi.string().min(6).max(255).required(),
  });
  return schema.validate(data);
}

module.exports.registerValidation = registerValidation;
module.exports.loginValidation = loginValidation;