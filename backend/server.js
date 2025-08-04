require('dotenv').config();

const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const productApiRoutes = require('./routes/api/products');
const orderApiRoutes = require('./routes/api/orders');
const userApiRoutes = require('./routes/api/users');

const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const forumRoutes = require('./routes/forumRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();
const port = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Middlewares e Configurações
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

// Rotas da API
app.use('/api/products', productApiRoutes);
app.use('/api/orders', orderApiRoutes);
app.use('/api/users', userApiRoutes);

// Rotas da aplicação
app.use(authRoutes);
app.use(postRoutes);
app.use('/forum', forumRoutes); // <<<<< AGORA COM PREFIXO!
app.use(productRoutes);

// Iniciar servidor
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

startServer();
