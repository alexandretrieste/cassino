CREATE TABLE transactions (
  txn INT AUTO_INCREMENT PRIMARY KEY,
  player INT NOT NULL,
  type ENUM('BET', 'WIN') NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  balance DECIMAL(10, 2) NOT NULL,
  cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO transactions (player, type, value, balance, cancelled)
VALUES
  (1, 'BET', 10.00, 1000.00, false),
  (1, 'WIN', 100.00, 1000.00, false)
