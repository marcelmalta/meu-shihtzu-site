const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /login
router.get('/login', (req, res) => {
  res.render('login');
});

// POST /login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { error: 'Usuário não encontrado.' });
    }
    // Aqui só verifica igualdade direta, adapte se usar bcrypt!
    if (user.password !== password) {
      return res.render('login', { error: 'Senha incorreta.' });
    }

    // Salva o usuário na sessão
    req.session.user = { id: user._id.toString(), username: user.username, role: user.role };
    return res.redirect('/');
  } catch (error) {
    return res.render('login', { error: 'Erro ao tentar logar.' });
  }
});

// GET /cadastro
router.get('/cadastro', (req, res) => {
  res.render('register');
});

// POST /cadastro
router.post('/cadastro', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('register', { error: 'E-mail já cadastrado.' });
    }
    // Cria o novo usuário (adapte para validação e senha hash se desejar)
    const user = new User({ username, email, password });
    await user.save();
    req.session.user = { id: user._id.toString(), username: user.username, role: user.role };
    return res.redirect('/');
  } catch (error) {
    return res.render('register', { error: 'Erro ao tentar cadastrar.' });
  }
});

// GET /sair
router.get('/sair', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
