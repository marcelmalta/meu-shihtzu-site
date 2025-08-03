const express = require('express');
const router = express.Router();
const Product = require('../../models/Product');

// GET /api/products - lista todos os produtos
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// GET /api/products/:id - detalhe de um produto
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar produto' });
  }
});

// POST /api/products - criar novo produto
router.post('/', async (req, res) => {
  try {
    const { nome, descricao, preco, imagens, estoque } = req.body;
    const product = new Product({ nome, descricao, preco, imagens, estoque });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar produto' });
  }
});

// PUT /api/products/:id - atualizar produto
router.put('/:id', async (req, res) => {
  try {
    const { nome, descricao, preco, imagens, estoque } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { nome, descricao, preco, imagens, estoque },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao atualizar produto' });
  }
});

// DELETE /api/products/:id - remover produto
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json({ message: 'Produto removido com sucesso' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover produto' });
  }
});

module.exports = router;
