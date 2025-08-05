const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/cadastro', authController.renderRegister);
router.post('/cadastro', authController.register);
router.get('/verificar-email/:token', authController.verifyEmail);
router.get('/login', authController.renderLogin);
router.post('/login', authController.login);
router.get('/sair', authController.logout);
router.get('/esqueci-senha', authController.renderForgotPassword);
router.post('/esqueci-senha', authController.forgotPassword);
router.get('/resetar-senha/:token', authController.renderResetPassword);
router.post('/resetar-senha/:token', authController.resetPassword);

module.exports = router;