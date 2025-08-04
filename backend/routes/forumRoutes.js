const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const isAdmin = require('../middleware/isAdmin');

router.get('/', postController.home);
router.get('/post/:slug', postController.getPost);
router.post('/post/:slug/comentar', postController.comment);
router.post('/comentario/:id/excluir', isAdmin, postController.deleteComment);
router.post('/comentario/:id/curtir', postController.likeComment);

router.get('/admin', isAdmin, postController.adminHome);
router.get('/admin/noticias', isAdmin, postController.adminPosts);
router.get('/admin/noticias/nova', isAdmin, postController.renderNewPost);
router.post('/admin/noticias/nova', isAdmin, postController.createPost);
router.get('/admin/noticias/editar/:id', isAdmin, postController.renderEditPost);
router.post('/admin/noticias/editar/:id', isAdmin, postController.updatePost);
router.post('/admin/noticias/excluir/:id', isAdmin, postController.deletePost);

module.exports = router;