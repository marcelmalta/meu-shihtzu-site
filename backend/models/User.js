const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'O nome de usuário é obrigatório.'],
    unique: true,
    trim: true,
    minlength: [3, 'O nome de usuário deve ter no mínimo 3 caracteres.'],
    maxlength: [25, 'O nome de usuário deve ter no máximo 25 caracteres.'], // Aumentei um pouco o limite
    // --- REGRA DE VALIDAÇÃO MODIFICADA ---
    validate: {
      validator: function(v) {
        // Esta expressão regular agora permite letras (incluindo com acentos), números, underscores e espaços.
        return /^[a-zA-ZÀ-ÿ0-9_ ]+$/.test(v);
      },
      message: 'O nome de usuário só pode conter letras, números, espaços e underscores (_).'
    }
  },
  email: {
    type: String,
    required: [true, 'O e-mail é obrigatório.'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'A senha é obrigatória.'],
    minlength: [6, 'A senha deve ter no mínimo 6 caracteres.']
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: {
    type: String
  },
  verificationTokenExpires: {
    type: Date
  },
  resetPasswordToken: {
      type: String
  },
  resetPasswordExpires: {
      type: Date
  }
});

// --- HASHING DA SENHA (continua igual) ---
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const hash = await bcrypt.hash(this.password, 12);
    this.password = hash;
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', userSchema);