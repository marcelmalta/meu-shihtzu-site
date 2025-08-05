const express = require('express');
const router = express.Router();

// ROTA GET LOGIN (Renderiza a página de login)
router.get('/login', (req, res) => {
  res.render('login');
});

// ROTA GET CADASTRO (Renderiza a página de cadastro)
router.get('/cadastro', (req, res) => {
  res.render('register');
});

module.exports = router;
