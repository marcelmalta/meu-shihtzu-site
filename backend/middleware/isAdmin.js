module.exports = function isAdmin(req, res, next) {
  // Verifica se o usuário está logado e tem papel de admin
  if (req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  // Se não for admin, nega acesso
  res.status(403).send('Acesso negado. Apenas administradores.');
};
