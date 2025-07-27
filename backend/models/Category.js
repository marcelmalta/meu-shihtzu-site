const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  // --- CAMPO ADICIONADO ---
  // Guardará a URL para a imagem padrão desta categoria
  defaultImageUrl: {
    type: String,
    trim: true
  }
});

module.exports = mongoose.model('Category', categorySchema);