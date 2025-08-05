const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// LOGIN
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Tentando login:', email, password);
  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log('Usuário não encontrado:', email);
      return res.render('login', { error: 'Usuário não encontrado.' });
    }
    console.log('Usuário encontrado. Hash no banco:', user.password);
    const valid = await bcrypt.compare(password, user.password);
    console.log('Comparação de senha:', password, user.password, '=>', valid);
    if (!valid) {
      return res.render('login', { error: 'Senha incorreta.' });
    }
    req.session.user = { id: user._id.toString(), username: user.username, role: user.role };
    console.log('Login realizado com sucesso para:', user.username);
    return res.redirect('/noticias'); // Ou '/' conforme sua homepage
  } catch (error) {
    console.error('Erro ao tentar logar:', error);
    return res.render('login', { error: 'Erro ao tentar logar.' });
  }
});

// CADASTRO
router.get('/cadastro', (req, res) => {
  res.render('register', { error: null });
});

router.post('/cadastro', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('register', { error: 'E-mail já cadastrado.' });
    }
    // Gera o hash da senha antes de salvar
    const hash = await bcrypt.hash(password, 12);
    const user = new User({ username, email, password: hash });
    await user.save();
    req.session.user = { id: user._id.toString(), username: user.username, role: user.role };
    console.log('Novo usuário cadastrado:', user.username, email);
    return res.redirect('/noticias');
  } catch (error) {
    console.error('Erro ao tentar cadastrar:', error);
    return res.render('register', { error: 'Erro ao tentar cadastrar.' });
  }
});

// LOGOUT
router.get('/sair', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/noticias');
  });
});

module.exports = router;
