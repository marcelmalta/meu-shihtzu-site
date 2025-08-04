const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const isAdmin = require('../middleware/isAdmin');

router.get('/produtos', productController.listProducts);
router.get('/admin/produtos', isAdmin, productController.adminListProducts);
router.get('/admin/produtos/novo', isAdmin, productController.renderNewProduct);
router.post('/admin/produtos/novo', isAdmin, productController.createProduct);

module.exports = router;