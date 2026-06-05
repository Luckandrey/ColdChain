CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  documento VARCHAR(40),
  email VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS veiculos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  placa VARCHAR(20),
  motorista VARCHAR(120)
);

CREATE TABLE IF NOT EXISTS cargas (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  produto VARCHAR(120) NOT NULL,
  cliente_id INTEGER REFERENCES clientes(id),
  veiculo_id INTEGER REFERENCES veiculos(id),
  origem VARCHAR(120),
  destino VARCHAR(120),
  status VARCHAR(40),
  temperatura_minima NUMERIC(5,2),
  temperatura_maxima NUMERIC(5,2),
  criada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leituras_sensor (
  id SERIAL PRIMARY KEY,
  carga_id INTEGER REFERENCES cargas(id),
  temperatura NUMERIC(5,2),
  umidade INTEGER,
  porta_aberta BOOLEAN,
  vibracao NUMERIC(5,2),
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  progresso INTEGER,
  registrada_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eventos_criticos (
  id SERIAL PRIMARY KEY,
  carga_id INTEGER REFERENCES cargas(id),
  tipo VARCHAR(80) NOT NULL,
  descricao TEXT,
  nivel VARCHAR(30),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificados (
  id SERIAL PRIMARY KEY,
  carga_id INTEGER REFERENCES cargas(id),
  nome_arquivo VARCHAR(180),
  url_s3 TEXT,
  status VARCHAR(40),
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO clientes (nome, documento, email)
SELECT 'Hospital Central', '00000000000100', 'contato@hospitalcentral.com'
WHERE NOT EXISTS (
  SELECT 1 FROM clientes WHERE nome = 'Hospital Central'
);

INSERT INTO veiculos (codigo, placa, motorista)
SELECT 'TRK-4821', 'ABC1D23', 'Carlos Mendes'
WHERE NOT EXISTS (
  SELECT 1 FROM veiculos WHERE codigo = 'TRK-4821'
);

INSERT INTO cargas (
  codigo,
  produto,
  cliente_id,
  veiculo_id,
  origem,
  destino,
  status,
  temperatura_minima,
  temperatura_maxima
)
SELECT
  'CRG-2026-001',
  'Vacinas termolábeis',
  c.id,
  v.id,
  'Centro de Distribuição',
  'Hospital Central',
  'Em trânsito',
  2,
  8
FROM clientes c, veiculos v
WHERE c.nome = 'Hospital Central'
  AND v.codigo = 'TRK-4821'
  AND NOT EXISTS (
    SELECT 1 FROM cargas WHERE codigo = 'CRG-2026-001'
  );