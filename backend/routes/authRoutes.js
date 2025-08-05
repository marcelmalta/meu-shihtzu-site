const express = require('express');
const router = express.Router();
const User = require('../models/User');

// LOGIN
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', { error: 'Usuário não encontrado.' });
    }
    if (user.password !== password) {
      return res.render('login', { error: 'Senha incorreta.' });
    }
    req.session.user = { id: user._id.toString(), username: user.username, role: user.role };
    return res.redirect('/noticias'); // ou '/' ou onde for sua homepage
  } catch (error) {
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
    const user = new User({ username, email, password });
    await user.save();
    req.session.user = { id: user._id.toString(), username: user.username, role: user.role };
    return res.redirect('/noticias');
  } catch (error) {
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
