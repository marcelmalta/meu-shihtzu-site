const express = require('express');
const router = express.Router();
const ForumThread = require('../models/ForumThread');
const Comment = require('../models/Comment');
const Category = require('../models/Category');
const isAdmin = require('../middleware/isAdmin');

function extractYouTubeId(text) {
  if (!text) return null;
  if (text.includes('<iframe')) {
    return null;
  }
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.{11})/;
  const match = text.match(regex);
  return match ? match[1] : null;
}

// Lista de tópicos com filtros
router.get('/', async (req, res) => {
  try {
    const { category: categorySlug, sort = 'recent', q: searchQuery } = req.query;
    const categories = await Category.find().sort({ name: 1 });
    const matchQuery = { status: 'approved' };
    let pageTitle = 'Tópicos do Fórum';
    if (categorySlug) {
      const category = await Category.findOne({ slug: categorySlug });
      if (category) {
        matchQuery.category = category._id;
        pageTitle = `Tópicos em: ${category.name}`;
      }
    }
    if (searchQuery) {
      matchQuery.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { content: { $regex: searchQuery, $options: 'i' } }
      ];
      pageTitle = `Resultados da busca por: "${searchQuery}"`;
    }
    const sortQuery = sort === 'popular' ? { replyCount: -1 } : { createdAt: -1 };
    const threads = await ForumThread.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'comments', localField: '_id', foreignField: 'thread', as: 'comments' } },
      { $addFields: { replyCount: { $size: '$comments' } } },
      { $sort: sortQuery },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' }
    ]);
    res.render('forum', {
      threads,
      categories,
      pageTitle,
      currentCategory: categorySlug || 'all',
      currentSort: sort,
      searchQuery: searchQuery || '',
      currentUser: req.session.user
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Erro ao carregar o fórum.');
  }
});

// Formulário para novo tópico
router.get('/novo-topico', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.render('new-thread', { categories });
  } catch (error) {
    res.status(500).send('Erro ao carregar o formulário.');
  }
});

// Criar novo tópico
router.post('/novo-topico', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const { title, content, category } = req.body;
    const videoId = extractYouTubeId(content);
    const newThread = new ForumThread({
      title,
      content,
      category,
      author: req.session.user.username,
      youtubeVideoId: videoId
    });
    await newThread.save();
    res.redirect('/forum/moderacao');
  } catch (error) {
    console.log(error);
    res.status(500).send('Erro ao criar o tópico.');
  }
});

// Exibir um tópico e seus comentários
router.get('/topico/:id', async (req, res) => {
  try {
    const thread = await ForumThread.findById(req.params.id).populate('category');
    if (thread && (thread.status === 'approved' || (req.session.user && req.session.user.role === 'admin'))) {
      const comments = await Comment.find({ thread: thread._id }).sort({ createdAt: 1 });
      res.render('thread', { thread, comments, currentUser: req.session.user });
    } else {
      res.status(404).send('Tópico não encontrado ou não aprovado.');
    }
  } catch (error) {
    res.status(500).send('Erro ao carregar tópico do fórum.');
  }
});

// Comentar em um tópico
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

// Curtir ou descurtir comentário
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

// Excluir tópico (admin)
router.post('/topico/:id/excluir', isAdmin, async (req, res) => {
  try {
    const threadId = req.params.id;
    await Comment.deleteMany({ thread: threadId });
    await ForumThread.findByIdAndDelete(threadId);
    res.redirect('/forum');
  } catch (error) {
    res.status(500).send('Erro ao excluir o tópico.');
  }
});

// Moderar tópicos pendentes (admin)
router.get('/moderacao', isAdmin, async (req, res) => {
  try {
    const pendingThreads = await ForumThread.find({
      $or: [{ status: 'pending' }, { status: { $exists: false } }]
    }).sort({ createdAt: 1 });
    res.render('admin-forum-moderation', { pendingThreads });
  } catch (error) {
    res.status(500).send('Erro ao buscar tópicos pendentes.');
  }
});

router.post('/aprovar/:id', isAdmin, async (req, res) => {
  try {
    await ForumThread.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.redirect('/forum/moderacao');
  } catch (error) {
    res.status(500).send('Erro ao aprovar o tópico.');
  }
});

router.post('/rejeitar/:id', isAdmin, async (req, res) => {
  try {
    await ForumThread.findByIdAndDelete(req.params.id);
    res.redirect('/forum/moderacao');
  } catch (error) {
    res.status(500).send('Erro ao rejeitar o tópico.');
  }
});

module.exports = router;
