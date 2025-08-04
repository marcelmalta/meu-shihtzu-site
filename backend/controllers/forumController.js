const ForumThread = require('../models/ForumThread');
const ForumReply = require('../models/ForumReply');
const Category = require('../models/Category');

function extractYouTubeId(text) {
  if (!text) return null;
  if (text.includes('<iframe')) {
    return null;
  }
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.{11})/;
  const match = text.match(regex);
  return match ? match[1] : null;
}

exports.listThreads = async (req, res) => {
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
    let threads = await ForumThread.aggregate([
      { $match: matchQuery },
      { $lookup: { from: 'forumreplies', localField: '_id', foreignField: 'thread', as: 'replies' } },
      { $addFields: { replyCount: { $size: '$replies' } } },
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
      searchQuery: searchQuery || ''
    });
  } catch (error) {
    console.log(error);
    res.status(500).send('Erro ao carregar o fórum.');
  }
};

exports.renderNewThread = async (req, res) => {
  if (!req.session.user) { return res.redirect('/login'); }
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.render('new-thread', { categories });
  } catch (error) {
    res.status(500).send('Erro ao carregar o formulário.');
  }
};

exports.createThread = async (req, res) => {
  if (!req.session.user) { return res.redirect('/login'); }
  try {
    const { title, content, category } = req.body;
    const videoId = extractYouTubeId(content);
    let imageUrl = null;
    if (req.file) {
      imageUrl = '/uploads/thumbnails/' + req.file.filename;
    }
    const newThread = new ForumThread({
      title,
      content,
      category,
      author: req.session.user.username,
      youtubeVideoId: videoId,
      imageUrl
    });
    await newThread.save();
    res.redirect('/admin/forum/moderacao');
  } catch (error) {
    console.log(error);
    res.status(500).send('Erro ao criar o tópico.');
  }
};

exports.getThread = async (req, res) => {
  try {
    const threadId = req.params.id;
    const thread = await ForumThread.findById(threadId).populate('category');
    if (thread && (thread.status === 'approved' || (req.session.user && req.session.user.role === 'admin'))) {
      const replies = await ForumReply.find({ thread: threadId }).sort({ createdAt: 1 });
      res.render('thread', { thread, replies });
    } else {
      res.status(404).send('Tópico não encontrado ou não aprovado.');
    }
  } catch (error) {
    console.log('Erro ao carregar o tópico:', error);
    res.status(500).send('Erro ao carregar o tópico.');
  }
};

exports.replyThread = async (req, res) => {
  if (!req.session.user) { return res.redirect('/login'); }
  try {
    const newReply = new ForumReply({
      content: req.body.content,
      thread: req.params.id,
      author: req.session.user.username
    });
    await newReply.save();
    res.redirect('/forum/topico/' + req.params.id);
  } catch (error) {
    console.log('Erro ao salvar resposta:', error);
    res.status(500).send('Erro ao salvar a resposta.');
  }
};

exports.deleteThread = async (req, res) => {
  try {
    const threadId = req.params.id;
    await ForumReply.deleteMany({ thread: threadId });
    await ForumThread.findByIdAndDelete(threadId);
    res.redirect('/forum');
  } catch (error) {
    res.status(500).send('Erro ao excluir o tópico.');
  }
};

exports.deleteReply = async (req, res) => {
  try {
    const replyId = req.params.id;
    const reply = await ForumReply.findById(replyId);
    if (reply) {
      const threadId = reply.thread;
      await ForumReply.findByIdAndDelete(replyId);
      res.redirect('/forum/topico/' + threadId);
    } else {
      res.status(404).send('Resposta não encontrada.');
    }
  } catch (error) {
    res.status(500).send('Erro ao excluir a resposta.');
  }
};

exports.moderation = async (req, res) => {
  try {
    const pendingThreads = await ForumThread.find({
      $or: [{ status: 'pending' }, { status: { $exists: false } }]
    }).sort({ createdAt: 1 });
    res.render('admin-forum-moderation', { pendingThreads });
  } catch (error) {
    res.status(500).send('Erro ao buscar tópicos pendentes.');
  }
};

exports.approveThread = async (req, res) => {
  try {
    await ForumThread.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.redirect('/admin/forum/moderacao');
  } catch (error) {
    res.status(500).send('Erro ao aprovar o tópico.');
  }
};

exports.rejectThread = async (req, res) => {
  try {
    await ForumThread.findByIdAndDelete(req.params.id);
    res.redirect('/admin/forum/moderacao');
  } catch (error) {
    res.status(500).send('Erro ao rejeitar o tópico.');
  }
};