const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Profanity, anENandPTsubset } = require('@2toad/profanity');
const User = require('../models/User');

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const profanity = new Profanity({ language: anENandPTsubset });

exports.renderRegister = (req, res) => {
  res.render('register');
};

exports.register = async (req, res) => {
  try {
    console.log('Tentativa de cadastro:', req.body);
    const { username, email, password } = req.body;
    if (profanity.exists(username)) {
      return res.status(400).render('error', {
        errorMessage: 'O nome de utilizador contém palavras não permitidas. Por favor, escolha outro.',
        backLink: '/cadastro'
      });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      let message = existingUser.email === email ? 'Este e-mail já está registado.' : 'Este nome de utilizador já está a ser utilizado.';
      return res.status(400).render('error', {
        errorMessage: message + ' Por favor, escolha outro.',
        backLink: '/cadastro'
      });
    }

    // Gera o hash da senha ANTES de salvar
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({ username, email, password: hashedPassword });

    const token = crypto.randomBytes(32).toString('hex');
    user.verificationToken = token;
    user.verificationTokenExpires = Date.now() + 3600000;

    await user.save();
    console.log('Salvou usuário no banco:', user.email);

    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const verificationUrl = `${baseUrl}/verificar-email/${token}`;

    await transporter.sendMail({
      to: user.email,
      from: process.env.EMAIL_USER,
      subject: 'Confirme o seu Registo no Shih Tzu Notícias',
      html: `<h1>Bem-vindo!</h1><p>Por favor, clique no link a seguir para confirmar o seu e-mail: <a href="${verificationUrl}">${verificationUrl}</a></p>`
    });

    console.log('E-mail de verificação enviado para', user.email);
    res.render('please-verify'); // Garanta que a view existe!
  } catch (error) {
    console.error('Erro no cadastro:', error);
    res.status(500).render('error', {
      errorMessage: 'Erro ao tentar cadastrar: ' + error.message,
      backLink: '/cadastro'
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).render('error', {
        errorMessage: 'O link de verificação é inválido ou já expirou.',
        backLink: '/cadastro'
      });
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    res.render('verification-successful');
  } catch (error) {
    console.log(error);
    res.status(500).render('error', {
      errorMessage: 'Ocorreu um erro ao verificar o seu e-mail.',
      backLink: '/'
    });
  }
};

exports.renderLogin = (req, res) => {
  res.render('login');
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Procura usuário pelo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).render('login', {
        errorMessage: 'E-mail ou senha incorretos.'
      });
    }

    // **Nova verificação: só loga se confirmado**
    if (!user.isVerified) {
      return res.status(400).render('login', {
        errorMessage: 'Por favor, confirme seu e-mail antes de fazer login.'
      });
    }

    // Compara senha usando bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).render('login', {
        errorMessage: 'E-mail ou senha incorretos.'
      });
    }

    // Salva dados mínimos na sessão
    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      role: user.role
    };

    // Redireciona para a home
    res.redirect('/');
  } catch (error) {
    console.error(error);
    res.status(500).render('login', {
      errorMessage: 'Erro ao fazer login. Tente novamente.'
    });
  }
};

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('Erro ao fazer o logout.');
    }
    res.redirect('/');
  });
};

exports.renderForgotPassword = (req, res) => {
  res.render('forgot-password');
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = token;
      user.resetPasswordExpires = Date.now() + 3600000;
      await user.save();
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const resetUrl = `${baseUrl}/resetar-senha/${token}`;
      await transporter.sendMail({
        to: user.email,
        from: process.env.EMAIL_USER,
        subject: 'Recuperação de Senha - Shih Tzu Notícias',
        html: `<h1>Recuperação de Senha</h1><p>Você solicitou a recuperação de senha. Por favor, clique no link a seguir para criar uma nova senha: <a href="${resetUrl}">${resetUrl}</a></p><p>Se você não solicitou isso, por favor, ignore este e-mail.</p>`
      });
      console.log('E-mail de recuperação enviado para', user.email);
    }
    res.send('Se um utilizador com este e-mail existir, um link de recuperação foi enviado. Por favor, verifique a sua caixa de entrada.');
  } catch (error) {
    console.log('Erro ao enviar recuperação de senha:', error);
    res.status(500).send('Erro ao processar a solicitação.');
  }
};

exports.renderResetPassword = async (req, res) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).render('error', {
        errorMessage: 'O link de recuperação de senha é inválido ou já expirou.',
        backLink: '/esqueci-senha'
      });
    }
    res.render('reset-password', { token });
  } catch (error) {
    res.status(500).send('Erro ao carregar a página de recuperação.');
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    if (!user) {
      return res.status(400).render('error', {
        errorMessage: 'O link de recuperação de senha é inválido ou já expirou.',
        backLink: '/esqueci-senha'
      });
    }
    const { password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
      return res.status(400).render('error', {
        errorMessage: 'As senhas não coincidem. Por favor, tente novamente.',
        backLink: `/resetar-senha/${token}`
      });
    }
    // Gera o hash da senha ANTES de salvar
    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.redirect('/login');
  } catch (error) {
    res.status(500).send('Erro ao redefinir a senha.');
  }
};
