const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  produtos: [
    {
      produto: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      quantidade: Number
    }
  ],
  total: Number,
  status: { type: String, default: 'Pendente' },
  criadoEm: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);
