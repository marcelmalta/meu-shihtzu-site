const express = require('express');
const router = express.Router();
const Post = require('../models/Post');

router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(10);
    res.render('index', { posts });
  } catch (error) {
    res.status(500).send('Erro ao carregar as notícias.');
  }
});

module.exports = router;
