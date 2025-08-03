const express = require('express');
const router = express.Router();
const Order = require('../../models/Order');

// GET /api/orders - lista todos os pedidos
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().populate('usuario').populate('produtos.produto');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});

// POST /api/orders - criar novo pedido
router.post('/', async (req, res) => {
  try {
    const { usuario, produtos, total } = req.body;
    const order = new Order({ usuario, produtos, total });
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: 'Erro ao criar pedido' });
  }
});

module.exports = router;

