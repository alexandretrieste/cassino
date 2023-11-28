// Importando as dependências
const express = require('express');
const mariadb = require('mariadb');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

// Configurando as variáveis de ambiente
dotenv.config();

// Configurando o banco de dados
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 5,
});

// Inicializando o Express
const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json());

// Definindo rotas
// Rota para cancelar transações de apostas (rollback)
app.post('/rollback', async (req, res) => {
  try {
    const { player, txn, value } = req.body;

    // Verificando se a transação existe no banco de dados
    const result = await pool.query(
      'SELECT * FROM transactions WHERE player = ? AND txn = ?',
      [player, txn]
    );

    if (result.length === 0) {
      return res.status(404).json({ code: 'Transaction not found!' });
    }

    const transaction = result[0];

    // Verificando se a transação já foi cancelada anteriormente
    if (transaction.cancelled) {
      return res.json({ code: 'OK', balance: transaction.balance });
    }

    // Verificando se a transação é do tipo WIN
    if (transaction.type === 'WIN') {
      return res.json({ code: 'Invalid' });
    }

    // Verificando se o saldo é suficiente para estornar a transação
    if (value > transaction.balance) {
      return res.json({ code: 'Insufficient funds to rollback' });
    }

    // Atualizando o saldo do jogador e marcando a transação como cancelada
    const newBalance = transaction.balance + value;
    await pool.query(
      'UPDATE transactions SET cancelled = true, balance = ? WHERE player = ? AND txn = ?',
      [newBalance, player, txn]
    );

    return res.json({ code: 'OK', balance: newBalance });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});


// Rota para consultar o saldo da carteira digital de um jogador
app.get('/balance/:player', async (req, res) => {
  try {
    const player = req.params.player;

    // Consultando o saldo do jogador no banco de dados
    const result = await pool.query(
      'SELECT * FROM transactions WHERE player = ? ORDER BY txn DESC LIMIT 1',
      [player]
    );

    if (result.length === 0) {
      return res.status(404).json({ code: 'Player not found!' });
    }

    const balance = result[0].balance;

    return res.json({ player, balance });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Rota para realizar apostas usando a carteira digital de um jogador
app.post('/bet', async (req, res) => {
  try {
    const { player, value } = req.body;

    // Obtendo o saldo atual do jogador
    const balanceResult = await pool.query(
      'SELECT * FROM transactions WHERE player = ? ORDER BY txn DESC LIMIT 1',
      [player]
    );

    if (balanceResult.length === 0) {
      return res.status(404).json({ code: 'Player not found!' });
    }

    const currentBalance = balanceResult[0].balance;

    // Verificando se o jogador tem saldo suficiente para a aposta
    if (currentBalance < value) {
      return res.json({ code: 'Insufficient funds' });
    }

    // Atualizando o saldo e registrando a transação no banco de dados
    const newBalance = currentBalance - value;
    await pool.query(
      'INSERT INTO transactions (player, type, value, balance) VALUES (?, ?, ?, ?)',
      [player, 'BET', value, newBalance]
    );

    return res.json({ player, balance: newBalance, txn: pool.threadId });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Rota para realizar ganhos usando a carteira digital de um jogador
app.post('/win', async (req, res) => {
  try {
    const { player, value } = req.body;

    // Obtendo o saldo atual do jogador
    const balanceResult = await pool.query(
      'SELECT * FROM transactions WHERE player = ? ORDER BY txn DESC LIMIT 1',
      [player]
    );

    if (balanceResult.length === 0) {
      return res.status(404).json({ code: 'Player not found!' });
    }

    const currentBalance = balanceResult[0].balance;

    // Atualizando o saldo e registrando a transação no banco de dados
    const newBalance = currentBalance + value;
    await pool.query(
      'INSERT INTO transactions (player, type, value, balance) VALUES (?, ?, ?, ?)',
      [player, 'WIN', value, newBalance]
    );

    return res.json({ player, balance: newBalance, txn: pool.threadId });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Iniciando o servidor
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

