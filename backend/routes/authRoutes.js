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

// =======================
// Esqueci/Resetar Senha
// =======================

// GET /esqueci-senha
router.get('/esqueci-senha', (req, res) => {
  res.render('forgot-password'); // precisa do arquivo frontend/views/forgot-password.ejs
});

// POST /esqueci-senha
router.post('/esqueci-senha', async (req, res) => {
  // Aqui apenas simula envio
  res.render('forgot-password', { message: "Se este e-mail existir, você receberá instruções." });
});

// GET /resetar-senha/:token
router.get('/resetar-senha/:token', (req, res) => {
  res.render('reset-password', { token: req.params.token });
});

// POST /resetar-senha/:token
router.post('/resetar-senha/:token', async (req, res) => {
  // Aqui apenas simula reset
  res.redirect('/login');
});

module.exports = router;
