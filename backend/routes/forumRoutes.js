const express = require('express');
const router = express.Router();
const ForumThread = require('../models/ForumThread');
const Comment = require('../models/Comment');
const isAdmin = require('../middleware/isAdmin');

// Exibir lista de tópicos do fórum
router.get('/', async (req, res) => {
  try {
    const threads = await ForumThread.find({ status: 'approved' }).sort({ createdAt: -1 }).populate('category');
    res.render('forum', {
      threads,
      currentUser: req.session.user
    });
  } catch (error) {
    res.status(500).send('Erro ao carregar tópicos do fórum.');
  }
});

// Exibir um tópico e seus comentários
router.get('/topico/:id', async (req, res) => {
  try {
    const thread = await ForumThread.findById(req.params.id).populate('category');
    if (!thread) return res.status(404).send('Tópico não encontrado.');

    // Busca comentários deste tópico
    const comments = await Comment.find({ thread: thread._id }).sort({ createdAt: 1 });

    res.render('thread', {
      thread,
      comments,
      currentUser: req.session.user
    });
  } catch (error) {
    res.status(500).send('Erro ao carregar tópico do fórum.');
  }
});

// Comentar em um tópico do fórum
router.post('/topico/:id/comentar', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const comment = new Comment({
      content: req.body.content,
      authorId: req.session.user.id,
      authorName: req.session.user.username,
      thread: req.params.id,
      likes: []
    });
    await comment.save();
    res.redirect('/forum/topico/' + req.params.id + '#comments-section');
  } catch (error) {
    res.status(500).send('Erro ao comentar no tópico.');
  }
});

// Curtir ou descurtir comentário do fórum
router.post('/topico/:threadId/comentar/:commentId/curtir', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const { commentId, threadId } = req.params;
    const comment = await Comment.findById(commentId);
    const userId = req.session.user.id;
    if (!comment) return res.status(404).send('Comentário não encontrado.');
    if (comment.likes.map(id => id.toString()).includes(userId)) {
      await Comment.findByIdAndUpdate(commentId, { $pull: { likes: userId } });
    } else {
      await Comment.findByIdAndUpdate(commentId, { $addToSet: { likes: userId } });
    }
    res.redirect('/forum/topico/' + threadId + '#comments-section');
  } catch (err) {
    res.status(500).send('Erro ao curtir/descurtir.');
  }
});

// Excluir comentário (admin)
router.post('/comentario/:id/excluir', isAdmin, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).send('Comentário não encontrado.');
    const threadId = comment.thread;
    await Comment.findByIdAndDelete(req.params.id);
    res.redirect('/forum/topico/' + threadId + '#comments-section');
  } catch (err) {
    res.status(500).send('Erro ao excluir comentário.');
  }
});

module.exports = router;
