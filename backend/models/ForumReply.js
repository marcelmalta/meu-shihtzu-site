const mongoose = require('mongoose');

const forumReplySchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  author: {
    type: String,
    default: 'Anônimo'
  },
  // Este campo especial guarda o ID do tópico ao qual esta resposta pertence.
  // É assim que criamos o link entre a resposta e seu tópico original.
  thread: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumThread', // Refere-se ao nosso model 'ForumThread'
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ForumReply', forumReplySchema);