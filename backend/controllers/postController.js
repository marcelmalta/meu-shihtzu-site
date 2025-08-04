const Product = require('../models/Product');

exports.listProducts = async (req, res) => {
  try {
    const produtos = await Product.find();
    res.render('products', { produtos });
  } catch (err) {
    res.status(500).send('Erro ao carregar os produtos.');
  }
};

exports.adminListProducts = async (req, res) => {
  try {
    const produtos = await Product.find();
    res.render('admin-products', { produtos });
  } catch (err) {
    res.status(500).send('Erro ao carregar os produtos do admin.');
  }
};

exports.renderNewProduct = (req, res) => {
  res.render('admin-new-product');
};

exports.createProduct = async (req, res) => {
  try {
    const { nome, descricao, preco, imagens, estoque } = req.body;
    const listaImagens = imagens ? imagens.split(',').map(url => url.trim()) : [];
    const novoProduto = new Product({ nome, descricao, preco, imagens: listaImagens, estoque });
    await novoProduto.save();
    res.redirect('/admin/produtos');
  } catch (err) {
    res.status(500).send('Erro ao criar produto.');
  }
};