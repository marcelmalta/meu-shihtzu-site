require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const bcrypt = require('bcrypt');
const multer = require('multer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { Profanity, anENandPTsubset } = require('@2toad/profanity');

// Importando todos os nossos Models
const Post = require('./models/Post.js');
const ForumThread = require('./models/ForumThread.js');
const ForumReply = require('./models/ForumReply.js');
const User = require('./models/User.js');
const Comment = require('./models/Comment.js');
const Category = require('./models/Category.js');
const Product = require('./models/Product.js'); // Adicionado

const app = express();
const port = process.env.PORT || 3000;

const MONGO_URI = process.env.MONGO_URI;

// --- Middlewares e Configurações ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI })
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user;
  next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'frontend', 'views'));

// --- CONFIGURAÇÃO DO MULTER ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/thumbnails');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// --- CONFIGURAÇÃO DO NODEMAILER ---
const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 587,
    auth: {
      user: process.env.EMAIL_USER,   // e-mail completo
      pass: process.env.EMAIL_PASS    // senha do e-mail (não use mais a variável SENDGRID)
    }
});

// --- CONFIGURAÇÃO DO FILTRO DE PALAVRÕES ---
const profanity = new Profanity({
    language: anENandPTsubset
});

// --- MIDDLEWARE: O "Guarda" do Admin ---
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.redirect('/');
  }
};

// --- FUNÇÃO HELPER PARA EXTRAIR ID DE VÍDEO DO YOUTUBE ---
function extractYouTubeId(text) {
  if (!text) return null;
  if (text.includes('<iframe')) {
      return null;
  }
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.{11})/;
  const match = text.match(regex);
  return match ? match[1] : null;
}

// --- IMPORTAÇÃO DAS ROTAS REST API ---
const productApiRoutes = require('./routes/api/products');
const orderApiRoutes = require('./routes/api/orders');
const userApiRoutes = require('./routes/api/users');

// --- USANDO AS ROTAS DA API (prefixo /api/...) ---
app.use('/api/products', productApiRoutes);
app.use('/api/orders', orderApiRoutes);
app.use('/api/users', userApiRoutes);

// ===================================
// --- ROTAS DE PRODUTOS E-COMMERCE ---
// ===================================

app.get('/produtos', async (req, res) => {
  try {
    const produtos = await Product.find();
    res.render('products', { produtos });
  } catch (err) {
    res.status(500).send('Erro ao carregar os produtos.');
  }
});

app.get('/admin/produtos', isAdmin, async (req, res) => {
  try {
    const produtos = await Product.find();
    res.render('admin-products', { produtos });
  } catch (err) {
    res.status(500).send('Erro ao carregar os produtos do admin.');
  }
});

app.get('/admin/produtos/novo', isAdmin, (req, res) => {
  res.render('admin-new-product');
});

app.post('/admin/produtos/novo', isAdmin, async (req, res) => {
  try {
    const { nome, descricao, preco, imagens, estoque } = req.body;
    const listaImagens = imagens ? imagens.split(',').map(url => url.trim()) : [];
    const novoProduto = new Product({ nome, descricao, preco, imagens: listaImagens, estoque });
    await novoProduto.save();
    res.redirect('/admin/produtos');
  } catch (err) {
    res.status(500).send('Erro ao criar produto.');
  }
});

// ===================================
// --- ROTAS DE AUTENTICAÇÃO E USUÁRIO ---
// ===================================
app.get('/cadastro', (req, res) => { res.render('register'); });

app.post('/cadastro', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (profanity.exists(username)) {
      return res.status(400).render('error', {
        errorMessage: 'O nome de utilizador contém palavras não permitidas. Por favor, escolha outro.',
        backLink: '/cadastro'
      });
    }
    const existingUser = await User.findOne({ $or: [{email}, {username}] });
    if (existingUser) {
        let message = existingUser.email === email ? 'Este e-mail já está registado.' : 'Este nome de utilizador já está a ser utilizado.';
        return res.status(400).render('error', {
            errorMessage: message + ' Por favor, escolha outro.',
            backLink: '/cadastro'
        });
    }
    const user = new User({ username, email, password });
    const token = crypto.randomBytes(32).toString('hex');
    user.verificationToken = token;
    user.verificationTokenExpires = Date.now() + 3600000;
    await user.save();
    const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
    const verificationUrl = `${baseUrl}/verificar-email/${token}`;
    await transporter.sendMail({
        to: user.email,
        from: 'admin@shihtzuz.com',
        subject: 'Confirme o seu Registo no Shih Tzu Notícias',
        html: `<h1>Bem-vindo!</h1><p>Por favor, clique no link a seguir para confirmar o seu e-mail: <a href="${verificationUrl}">${verificationUrl}</a></p>`
    });
    res.render('please-verify');
  } catch (error) {
    if (error.name === 'ValidationError') {
        const message = Object.values(error.errors).map(val => val.message)[0];
        return res.status(400).render('error', {
            errorMessage: message,
            backLink: '/cadastro'
        });
    }
    console.log(error);
    res.status(500).render('error', {
        errorMessage: 'Ocorreu um erro inesperado ao criar o utilizador. Por favor, tente novamente.',
        backLink: '/cadastro'
    });
  }
});

app.get('/verificar-email/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).render('error', {
                errorMessage: 'O link de verificação é inválido ou já expirou.',
                backLink: '/cadastro'
            });
        }
        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();
        res.render('verification-successful');
    } catch (error) {
        console.log(error);
        res.status(500).render('error', {
            errorMessage: 'Ocorreu um erro ao verificar o seu e-mail.',
            backLink: '/'
        });
    }
});

app.get('/login', (req, res) => { res.render('login'); });

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(400).render('error', {
            errorMessage: 'O e-mail ou a senha estão incorretos.',
            backLink: '/login'
        });
    }
    if (!user.isVerified) {
        return res.status(400).render('error', {
            errorMessage: 'A sua conta ainda não foi verificada. Por favor, verifique o seu e-mail.',
            backLink: '/login'
        });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      req.session.user = { id: user._id.toString(), username: user.username, role: user.role };
      res.redirect('/');
    } else {
      res.status(400).render('error', {
          errorMessage: 'O e-mail ou a senha estão incorretos.',
          backLink: '/login'
      });
    }
  } catch (error) {
    res.status(500).render('error', {
        errorMessage: 'Ocorreu um erro ao fazer o login.',
        backLink: '/login'
    });
  }
});

app.get('/sair', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Erro ao fazer o logout.');
    }
    res.redirect('/');
  });
});

app.get('/esqueci-senha', (req, res) => {
    res.render('forgot-password');
});

app.post('/esqueci-senha', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (user) {
            const token = crypto.randomBytes(32).toString('hex');
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000;
            await user.save();
            const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
            const resetUrl = `${baseUrl}/resetar-senha/${token}`;
            await transporter.sendMail({
                to: user.email,
                from: 'admin@shihtzuz.com',
                subject: 'Recuperação de Senha - Shih Tzu Notícias',
                html: `<h1>Recuperação de Senha</h1><p>Você solicitou a recuperação de senha. Por favor, clique no link a seguir para criar uma nova senha: <a href="${resetUrl}">${resetUrl}</a></p><p>Se você não solicitou isso, por favor, ignore este e-mail.</p>`
            });
        }
        res.send('Se um utilizador com este e-mail existir, um link de recuperação foi enviado. Por favor, verifique a sua caixa de entrada.');
    } catch (error) {
        console.log(error);
        res.status(500).send('Erro ao processar a solicitação.');
    }
});

app.get('/resetar-senha/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).render('error', {
                errorMessage: 'O link de recuperação de senha é inválido ou já expirou.',
                backLink: '/esqueci-senha'
            });
        }
        res.render('reset-password', { token });
    } catch (error) {
        res.status(500).send('Erro ao carregar a página de recuperação.');
    }
});

app.post('/resetar-senha/:token', async (req, res) => {
    try {
        const token = req.params.token;
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) {
            return res.status(400).render('error', {
                errorMessage: 'O link de recuperação de senha é inválido ou já expirou.',
                backLink: '/esqueci-senha'
            });
        }
        const { password, confirmPassword } = req.body;
        if (password !== confirmPassword) {
            return res.status(400).render('error', {
                errorMessage: 'As senhas não coincidem. Por favor, tente novamente.',
                backLink: `/resetar-senha/${token}`
            });
        }
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.redirect('/login');
    } catch (error) {
        res.status(500).send('Erro ao redefinir a senha.');
    }
});

// ===============================
// --- ROTAS DE ADMIN ---
// ===============================
app.get('/admin', isAdmin, (req, res) => { res.render('admin'); });
app.get('/admin/noticias', isAdmin, async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.render('admin-posts', { posts: posts });
  } catch (error) {
    res.status(500).send('Erro ao buscar notícias.');
  }
});
app.get('/admin/noticias/nova', isAdmin, (req, res) => { res.render('new-post'); });
app.post('/admin/noticias/nova', isAdmin, async (req, res) => {
  try {
    const { title, slug, description, content, imageUrl, youtubeVideoId, galleryImageUrls } = req.body;
    const gallery = galleryImageUrls.split('\n').map(url => url.trim()).filter(url => url);
    const newPost = new Post({ title, slug, description, content, imageUrl, youtubeVideoId, galleryImageUrls: gallery });
    await newPost.save();
    res.redirect('/admin/noticias');
  } catch (error) {
    if (error.code === 11000 && error.keyPattern.slug) {
      return res.status(400).send('Erro: O "Slug" (URL amigável) já existe. Por favor, escolha outro.');
    }
    console.log(error);
    res.status(500).send('Erro ao criar a notícia.');
  }
});
app.get('/admin/noticias/editar/:id', isAdmin, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post) {
      res.render('edit-post', { post: post });
    } else {
      res.status(404).send('Notícia não encontrada.');
    }
  } catch (error) {
    res.status(500).send('Erro ao carregar a página de edição.');
  }
});
app.post('/admin/noticias/editar/:id', isAdmin, async (req, res) => {
  try {
    const { title, slug, description, content, imageUrl, youtubeVideoId, galleryImageUrls } = req.body;
    const gallery = galleryImageUrls.split('\n').map(url => url.trim()).filter(url => url);
    await Post.findByIdAndUpdate(req.params.id, {
      title, slug, description, content, imageUrl, youtubeVideoId, galleryImageUrls: gallery
    });
    res.redirect('/admin/noticias');
  } catch (error) {
    res.status(500).send('Erro ao salvar as alterações.');
  }
});
app.post('/admin/noticias/excluir/:id', isAdmin, async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    res.redirect('/admin/noticias');
  } catch (error) {
    res.status(500).send('Erro ao excluir a notícia.');
  }
});
app.get('/admin/forum/moderacao', isAdmin, async (req, res) => {
  try {
    const pendingThreads = await ForumThread.find({
      $or: [{ status: 'pending' }, { status: { $exists: false } }]
    }).sort({ createdAt: 1 });
    res.render('admin-forum-moderation', { pendingThreads: pendingThreads });
  } catch (error) {
    res.status(500).send('Erro ao buscar tópicos pendentes.');
  }
});
app.post('/admin/forum/aprovar/:id', isAdmin, async (req, res) => {
  try {
    await ForumThread.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.redirect('/admin/forum/moderacao');
  } catch (error) {
    res.status(500).send('Erro ao aprovar o tópico.');
  }
});
app.post('/admin/forum/rejeitar/:id', isAdmin, async (req, res) => {
  try {
    await ForumThread.findByIdAndDelete(req.params.id);
    res.redirect('/admin/forum/moderacao');
  } catch (error) {
    res.status(500).send('Erro ao rejeitar o tópico.');
  }
});

// ===================================
// --- ROTAS PÚBLICAS (Posts e Comentários) ----
// ===================================
app.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.render('index', { posts: posts });
  } catch (error) {
    console.log("Erro ao buscar posts:", error);
    res.status(500).send('Erro ao buscar os posts.');
  }
});

app.get('/post/:slug', async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (post) {
      const comments = await Comment.find({ post: post._id }).sort({ createdAt: 1 });
      const recentPosts = await Post.find({ _id: { $ne: post._id } }).sort({ createdAt: -1 }).limit(5);
      res.render('post', { 
        post: post, 
        comments: comments, 
        recentPosts: recentPosts 
      });
    } else {
      res.status(404).send('Post não encontrado');
    }
  } catch (error) {
    console.log("Erro ao buscar o post:", error);
    res.status(500).send('Erro ao buscar o post.');
  }
});

app.post('/post/:slug/comentar', async (req, res) => {
  if (!req.session.user) { return res.redirect('/login'); }
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (post) {
      const newComment = new Comment({
        content: req.body.content,
        authorId: req.session.user.id,
        authorName: req.session.user.username,
        post: post._id
      });
      await newComment.save();
      res.redirect('/post/' + post.slug);
    } else {
      res.status(404).send('Post não encontrado.');
    }
  } catch (error) {
    console.log("Erro ao salvar comentário:", error);
    res.status(500).send('Erro ao salvar o comentário.');
  }
});
app.post('/comentario/:id/excluir', isAdmin, async (req, res) => {
  try {
    const commentId = req.params.id;
    const comment = await Comment.findById(commentId);
    if (comment) {
      const post = await Post.findById(comment.post);
      await Comment.findByIdAndDelete(commentId);
      res.redirect('/post/' + post.slug);
    } else {
      res.status(404).send('Comentário não encontrado.');
    }
  } catch (error) {
    console.log("Erro ao excluir comentário:", error);
    res.status(500).send('Erro ao excluir o comentário.');
  }
});
app.post('/comentario/:id/curtir', async (req, res) => {
  if (!req.session.user) { return res.redirect('/login'); }
  try {
    const commentId = req.params.id;
    const userId = req.session.user.id;
    const comment = await Comment.findById(commentId);
    if (!comment) { return res.status(404).send('Comentário não encontrado.'); }
    const originalPost = await Post.findById(comment.post);
    if (!originalPost) { return res.status(404).send('Post original não encontrado.'); }
    const hasLiked = comment.likes.includes(userId);
    if (hasLiked) {
      await Comment.findByIdAndUpdate(commentId, { $pull: { likes: userId } });
    } else {
      await Comment.findByIdAndUpdate(commentId, { $addToSet: { likes: userId } });
    }
    res.redirect('/post/' + originalPost.slug + '#comments-section');
  } catch (error) {
    console.log("Erro ao processar curtida:", error);
    res.status(500).send('Erro ao processar a curtida.');
  }
});

// ===============================
// --- ROTAS DO FÓRUM ---
// ===============================

app.get('/forum', async (req, res) => {
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
      {
        $lookup: {
          from: 'forumreplies',
          localField: '_id',
          foreignField: 'thread',
          as: 'replies'
        }
      },
      {
        $addFields: {
          replyCount: { $size: '$replies' }
        }
      },
      { $sort: sortQuery },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      }
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
});

app.get('/forum/novo-topico', async (req, res) => {
  if (!req.session.user) { return res.redirect('/login'); }
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.render('new-thread', { categories: categories });
  } catch (error) {
    res.status(500).send('Erro ao carregar o formulário.');
  }
});

app.post('/forum/novo-topico', upload.single('thumbnailImage'), async (req, res) => {
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
      imageUrl: imageUrl
    });
    await newThread.save();
    res.redirect('/admin/forum/moderacao');
  } catch (error) {
    console.log(error);
    res.status(500).send('Erro ao criar o tópico.');
  }
});

app.get('/forum/topico/:id', async (req, res) => {
  try {
    const threadId = req.params.id;
    const thread = await ForumThread.findById(threadId).populate('category');
    if (thread && (thread.status === 'approved' || (req.session.user && req.session.user.role === 'admin'))) {
      const replies = await ForumReply.find({ thread: threadId }).sort({ createdAt: 1 });
      res.render('thread', { thread: thread, replies: replies });
    } else {
      res.status(404).send('Tópico não encontrado ou não aprovado.');
    }
  } catch (error) {
    console.log("Erro ao carregar o tópico:", error);
    res.status(500).send('Erro ao carregar o tópico.');
  }
});

app.post('/forum/topico/:id/responder', async (req, res) => {
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
    console.log("Erro ao salvar resposta:", error);
    res.status(500).send('Erro ao salvar a resposta.');
  }
});

app.post('/forum/topico/:id/excluir', isAdmin, async (req, res) => {
  try {
    const threadId = req.params.id;
    await ForumReply.deleteMany({ thread: threadId });
    await ForumThread.findByIdAndDelete(threadId);
    res.redirect('/forum');
  } catch (error) {
    res.status(500).send('Erro ao excluir o tópico.');
  }
});

app.post('/forum/resposta/:id/excluir', isAdmin, async (req, res) => {
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
});

// --- FUNÇÃO PARA INICIAR O SERVIDOR ---
async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado ao MongoDB com sucesso!');
    app.listen(port, () => {
      console.log(`🐾 Servidor rodando em http://localhost:${port}`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
}

// --- EXECUTA A FUNÇÃO PARA INICIAR TUDO ---
startServer();
