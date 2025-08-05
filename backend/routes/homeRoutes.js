// backend/routes/homeRoutes.js
const express = require('express');
const router = express.Router();
const Post = require('../models/Post'); // Se você quer mostrar as notícias na home

router.get('/', async (req, res) => {
  // Busque as notícias, se quiser, ou só renderize a home
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.render('index', { posts, currentUser: req.session.user });
  } catch (err) {
    res.render('index', { posts: [], currentUser: req.session.user });
  }
});

module.exports = router;
