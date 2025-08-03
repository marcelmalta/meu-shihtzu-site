const express = require('express');
const router = express.Router();
const User = require('../../models/User');

// GET /api/users  (listar todos os usuários - só exemplo, não exponha senhas!)
router.get('/', async (req, res) => {
  try {
    const users = await User.find({}, '-password -resetPasswordToken -resetPasswordExpires -verificationToken -verificationTokenExpires');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Você pode adicionar mais rotas abaixo, como POST, PUT, DELETE futuramente!

module.exports = router;
