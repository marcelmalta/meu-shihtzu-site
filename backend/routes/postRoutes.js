const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// Página inicial (index com notícias)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).limit(10);
    res.render('index', { posts });
  } catch (error) {
    res.status(500).send('Erro ao carregar as notícias.');
  }
});

// Página da notícia individual (slug)
router.get('/post/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (post) {
      const comments = await Comment.find({ post: post._id }).sort({ createdAt: 1 });
      // Você pode buscar os posts recentes para a sidebar, se desejar
      const recentPosts = await Post.find({ _id: { $ne: post._id } }).sort({ createdAt: -1 }).limit(5);
      res.render('post', {
        post,
        comments,
        recentPosts,
        currentUser: req.session.user
      });
    } else {
      res.status(404).send('Post não encontrado');
    }
  } catch (error) {
    res.status(500).send('Erro ao buscar a notícia.');
  }
});

// Rota para comentar na notícia
router.post('/post/:slug/comentar', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (post) {
      const newComment = new Comment({
        content: req.body.content,
        authorId: req.session.user.id,
        authorName: req.session.user.username,
        post: post._id,
        likes: []
      });
      await newComment.save();
      res.redirect('/post/' + post.slug + '#comments-section');
    } else {
      res.status(404).send('Notícia não encontrada.');
    }
  } catch (error) {
    res.status(500).send('Erro ao comentar na notícia.');
  }
});

module.exports = router;
