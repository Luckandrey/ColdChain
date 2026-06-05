import { pool } from "./db.js";

async function obterProximoId(tabela, colunaId) {
  const resultado = await pool.query(
    `SELECT COALESCE(MAX(${colunaId}), 0) + 1 AS proximo_id FROM ${tabela};`
  );

  return resultado.rows[0].proximo_id;
}

async function obterOuCriarClientePadrao() {
  const existente = await pool.query(
    `
    SELECT id_cliente
    FROM clientes
    WHERE nome = $1
    LIMIT 1;
    `,
    ["Hospital Central"]
  );

  if (existente.rows.length > 0) {
    return existente.rows[0].id_cliente;
  }

  const proximoId = await obterProximoId("clientes", "id_cliente");

  await pool.query(
    `
    INSERT INTO clientes (id_cliente, nome)
    VALUES ($1, $2);
    `,
    [proximoId, "Hospital Central"]
  );

  return proximoId;
}

async function obterOuCriarProdutoPadrao() {
  const existente = await pool.query(
    `
    SELECT id_produto
    FROM produtos
    WHERE nome = $1
    LIMIT 1;
    `,
    ["Vacinas termolábeis"]
  );

  if (existente.rows.length > 0) {
    return existente.rows[0].id_produto;
  }

  const proximoId = await obterProximoId("produtos", "id_produto");

  await pool.query(
    `
    INSERT INTO produtos (id_produto, nome, tipo)
    VALUES ($1, $2, $3);
    `,
    [proximoId, "Vacinas termolábeis", "atenção extra - medicamentos"]
  );

  return proximoId;
}

async function obterOuCriarVeiculoPadrao() {
  const existente = await pool.query(
    `
    SELECT id_veiculo
    FROM veiculos
    WHERE nome = $1
    LIMIT 1;
    `,
    ["TRK-4821"]
  );

  if (existente.rows.length > 0) {
    return existente.rows[0].id_veiculo;
  }

  const proximoId = await obterProximoId("veiculos", "id_veiculo");

  await pool.query(
    `
    INSERT INTO veiculos (
      id_veiculo,
      nome,
      capacidade_kg,
      cor,
      peso_tara_kg,
      motor,
      comprimento_metros
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7);
    `,
    [
      proximoId,
      "TRK-4821",
      1200,
      "Branco",
      1800,
      "Diesel refrigerado",
      6.5,
    ]
  );

  return proximoId;
}

async function obterOuCriarCargaPadrao(idProduto) {
  const existente = await pool.query(
    `
    SELECT id_carga
    FROM cargas
    WHERE id_produto = $1
    LIMIT 1;
    `,
    [idProduto]
  );

  if (existente.rows.length > 0) {
    return existente.rows[0].id_carga;
  }

  const proximoId = await obterProximoId("cargas", "id_carga");

  await pool.query(
    `
    INSERT INTO cargas (
      id_carga,
      id_produto,
      quantidade,
      peso_total_kg
    )
    VALUES ($1, $2, $3, $4);
    `,
    [proximoId, idProduto, 100, 350]
  );

  return proximoId;
}

async function obterOuCriarRotaPadrao(idVeiculo, idCarga, idCliente) {
  const existente = await pool.query(
    `
    SELECT id_rota
    FROM rotas
    WHERE id_veiculo = $1
      AND id_carga = $2
      AND id_cliente = $3
    ORDER BY id_rota
    LIMIT 1;
    `,
    [idVeiculo, idCarga, idCliente]
  );

  if (existente.rows.length > 0) {
    return existente.rows[0].id_rota;
  }

  const proximoId = await obterProximoId("rotas", "id_rota");

  await pool.query(
    `
    INSERT INTO rotas (
      id_rota,
      id_veiculo,
      id_carga,
      id_cliente,
      origem_lat,
      origem_lng,
      destino_lat,
      destino_lng,
      status,
      tempo_estimado_minutos,
      tempo_transporte_minutos,
      data_inicio,
      data_fim
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NOW(), NULL);
    `,
    [
      proximoId,
      idVeiculo,
      idCarga,
      idCliente,
      -1.4558,
      -48.4902,
      -1.3656,
      -48.3722,
      "em andamento",
      27,
    ]
  );

  return proximoId;
}

export async function inicializarDadosPadrao() {
  const idCliente = await obterOuCriarClientePadrao();
  const idProduto = await obterOuCriarProdutoPadrao();
  const idVeiculo = await obterOuCriarVeiculoPadrao();
  const idCarga = await obterOuCriarCargaPadrao(idProduto);

  await obterOuCriarRotaPadrao(idVeiculo, idCarga, idCliente);

  console.log("Dados padrão do ColdChain verificados/criados com sucesso.");
}

export async function buscarRotaPadrao() {
  const resultado = await pool.query(
    `
    SELECT
      r.id_rota,
      r.status,
      r.tempo_estimado_minutos,
      r.tempo_transporte_minutos,
      r.data_inicio,
      r.data_fim,
      r.origem_lat,
      r.origem_lng,
      r.destino_lat,
      r.destino_lng,
      v.nome AS veiculo,
      cl.nome AS cliente,
      p.nome AS produto,
      p.tipo AS tipo_produto,
      c.quantidade,
      c.peso_total_kg
    FROM rotas r
    JOIN veiculos v ON v.id_veiculo = r.id_veiculo
    JOIN clientes cl ON cl.id_cliente = r.id_cliente
    JOIN cargas c ON c.id_carga = r.id_carga
    JOIN produtos p ON p.id_produto = c.id_produto
    ORDER BY
      CASE WHEN r.status = 'em andamento' THEN 0 ELSE 1 END,
      r.id_rota
    LIMIT 1;
    `
  );

  return resultado.rows[0];
}

export async function buscarDadosCompletosRotaPadrao() {
  const rota = await buscarRotaPadrao();

  if (!rota) {
    return null;
  }

  const [leituras, eventosCriticos] = await Promise.all([
    listarLeiturasCompletasDaRota(rota.id_rota),
    listarEventosCriticosDaRota(rota.id_rota),
  ]);

  return {
    ...rota,
    leituras,
    eventosCriticos,
  };
}

export async function listarLeiturasCompletasDaRota(idRota) {
  const resultado = await pool.query(
    `
    SELECT
      r.id_rota,
      cl.nome AS cliente,
      v.nome AS veiculo,
      p.nome AS produto,
      p.tipo AS tipo_produto,
      r.status AS status_rota,
      lt.id_leitura,
      lt.data_hora,
      lt.temperatura_celsius::float AS temperatura_celsius
    FROM leiturastemperatura lt
    JOIN rotas r ON r.id_rota = lt.id_rota
    JOIN veiculos v ON v.id_veiculo = r.id_veiculo
    JOIN clientes cl ON cl.id_cliente = r.id_cliente
    JOIN cargas c ON c.id_carga = r.id_carga
    JOIN produtos p ON p.id_produto = c.id_produto
    WHERE r.id_rota = $1
    ORDER BY lt.data_hora ASC, lt.id_leitura ASC;
    `,
    [idRota]
  );

  return resultado.rows;
}

export async function listarEventosCriticosDaRota(idRota) {
  const resultado = await pool.query(
    `
    SELECT
      r.id_rota,
      cl.nome AS cliente,
      v.nome AS veiculo,
      p.nome AS produto,
      p.tipo AS tipo_produto,
      ec.id_evento,
      ec.data_hora,
      ec.temperatura_registrada::float AS temperatura_registrada,
      ec.descricao
    FROM eventoscriticos ec
    JOIN rotas r ON r.id_rota = ec.id_rota
    JOIN veiculos v ON v.id_veiculo = r.id_veiculo
    JOIN clientes cl ON cl.id_cliente = r.id_cliente
    JOIN cargas c ON c.id_carga = r.id_carga
    JOIN produtos p ON p.id_produto = c.id_produto
    WHERE r.id_rota = $1
    ORDER BY ec.data_hora ASC, ec.id_evento ASC;
    `,
    [idRota]
  );

  return resultado.rows;
}

export async function salvarLeituraSensor(payload) {
  const rota = await buscarRotaPadrao();

  if (!rota) {
    throw new Error("Nenhuma rota encontrada para salvar leitura.");
  }

  const proximoId = await obterProximoId(
    "leiturastemperatura",
    "id_leitura"
  );

  await pool.query(
    `
    INSERT INTO leiturastemperatura (
      id_leitura,
      id_rota,
      data_hora,
      temperatura_celsius
    )
    VALUES ($1, $2, NOW(), $3);
    `,
    [proximoId, rota.id_rota, payload.temperatura]
  );
}

export async function salvarEventoCritico({ descricao, temperatura }) {
  const rota = await buscarRotaPadrao();

  if (!rota) {
    throw new Error("Nenhuma rota encontrada para salvar evento crítico.");
  }

  const proximoId = await obterProximoId(
    "eventoscriticos",
    "id_evento"
  );

  await pool.query(
    `
    INSERT INTO eventoscriticos (
      id_evento,
      id_rota,
      data_hora,
      temperatura_registrada,
      descricao
    )
    VALUES ($1, $2, NOW(), $3, $4);
    `,
    [proximoId, rota.id_rota, temperatura, descricao]
  );
}

export async function listarUltimasLeiturasTemperatura() {
  const rota = await buscarRotaPadrao();

  if (!rota) {
    return [];
  }

  const resultado = await pool.query(
    `
    SELECT
      TO_CHAR(data_hora, 'HH24:MI') AS horario,
      temperatura_celsius::float AS temperatura
    FROM leiturastemperatura
    WHERE id_rota = $1
    ORDER BY data_hora DESC
    LIMIT 8;
    `,
    [rota.id_rota]
  );

  return resultado.rows.reverse();
}

export async function listarUltimosEventos() {
  const rota = await buscarRotaPadrao();

  if (!rota) {
    return [];
  }

  const resultado = await pool.query(
    `
    SELECT
      id_evento AS id,
      CASE
        WHEN descricao ILIKE '%porta%' THEN 'Abertura de porta'
        WHEN descricao ILIKE '%vibra%' THEN 'Choque detectado'
        WHEN descricao ILIKE '%choque%' THEN 'Choque detectado'
        ELSE 'Temperatura fora da faixa'
      END AS titulo,
      descricao,
      'critico' AS nivel,
      TO_CHAR(data_hora, 'HH24:MI') AS horario
    FROM eventoscriticos
    WHERE id_rota = $1
    ORDER BY data_hora DESC
    LIMIT 6;
    `,
    [rota.id_rota]
  );

  return resultado.rows;
}
