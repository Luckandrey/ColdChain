import crypto from "crypto";
import PDFDocument from "pdfkit";
import { buscarDadosCompletosRotaPadrao } from "./dbService.js";

const TEMPERATURA_MINIMA_SEGURA = 2;
const TEMPERATURA_MAXIMA_SEGURA = 8;

function formatarDataHora(valor) {
  if (!valor) {
    return "";
  }

  return new Date(valor).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

function formatarNumero(valor) {
  if (valor === null || valor === undefined || Number.isNaN(Number(valor))) {
    return "";
  }

  return Number(valor).toFixed(2);
}

function escaparCsv(valor) {
  const texto = String(valor ?? "");

  if (/[",\n\r;]/.test(texto)) {
    return `"${texto.replaceAll('"', '""')}"`;
  }

  return texto;
}

function criarTimestampArquivo() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function calcularEstatisticas(leituras, eventosCriticos) {
  const temperaturas = leituras
    .map((leitura) => Number(leitura.temperatura_celsius))
    .filter((temperatura) => !Number.isNaN(temperatura));

  const temperaturaMinima =
    temperaturas.length > 0 ? Math.min(...temperaturas) : null;
  const temperaturaMaxima =
    temperaturas.length > 0 ? Math.max(...temperaturas) : null;
  const temperaturaMedia =
    temperaturas.length > 0
      ? temperaturas.reduce((total, temperatura) => total + temperatura, 0) /
        temperaturas.length
      : null;

  const houveTemperaturaForaDaFaixa = temperaturas.some(
    (temperatura) =>
      temperatura < TEMPERATURA_MINIMA_SEGURA ||
      temperatura > TEMPERATURA_MAXIMA_SEGURA
  );

  return {
    temperaturaMinima,
    temperaturaMaxima,
    temperaturaMedia,
    totalLeituras: leituras.length,
    totalEventosCriticos: eventosCriticos.length,
    resultadoFinal:
      houveTemperaturaForaDaFaixa || eventosCriticos.length > 0
        ? "NÃO CONFORME"
        : "CONFORME",
  };
}

async function buscarDadosRelatorio() {
  const dados = await buscarDadosCompletosRotaPadrao();

  if (!dados) {
    throw new Error("Nenhuma rota encontrada para geração do relatório.");
  }

  return dados;
}

export async function gerarCsvRastroViagem() {
  const dados = await buscarDadosRelatorio();
  const timestamp = criarTimestampArquivo();
  const fileName = `rastro-rota-${dados.id_rota}-${timestamp}.csv`;

  const cabecalho = [
    "id_rota",
    "cliente",
    "veiculo",
    "produto",
    "tipo_produto",
    "id_leitura",
    "data_hora",
    "temperatura_celsius",
    "status_rota",
  ];

  const linhas = dados.leituras.map((leitura) => [
    dados.id_rota,
    leitura.cliente,
    leitura.veiculo,
    leitura.produto,
    leitura.tipo_produto,
    leitura.id_leitura,
    formatarDataHora(leitura.data_hora),
    formatarNumero(leitura.temperatura_celsius),
    leitura.status_rota,
  ]);

  const conteudo = [cabecalho, ...linhas]
    .map((linha) => linha.map(escaparCsv).join(";"))
    .join("\n");

  return {
    idRota: dados.id_rota,
    fileName,
    content: `\uFEFF${conteudo}\n`,
    contentType: "text/csv; charset=utf-8",
  };
}

function adicionarLinha(doc, rotulo, valor) {
  doc
    .font("Helvetica-Bold")
    .text(`${rotulo}: `, { continued: true })
    .font("Helvetica")
    .text(String(valor ?? "Não informado"));
}

function criarPdfBuffer(dados, estatisticas, hashValidacao) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const partes = [];

    doc.on("data", (parte) => partes.push(parte));
    doc.on("end", () => resolve(Buffer.concat(partes)));
    doc.on("error", reject);

    doc
      .font("Helvetica-Bold")
      .fontSize(18)
      .text("Certificado de Conformidade - ColdChain", { align: "center" });

    doc.moveDown();
    doc.font("Helvetica").fontSize(10);
    adicionarLinha(doc, "Data/hora de geração", formatarDataHora(new Date()));
    adicionarLinha(doc, "Rota", dados.id_rota);
    adicionarLinha(doc, "Cliente", dados.cliente);
    adicionarLinha(doc, "Veículo", dados.veiculo);
    adicionarLinha(doc, "Produto", dados.produto);
    adicionarLinha(doc, "Tipo/criticidade do produto", dados.tipo_produto);
    adicionarLinha(doc, "Quantidade", dados.quantidade);
    adicionarLinha(doc, "Peso total", `${formatarNumero(dados.peso_total_kg)} kg`);
    adicionarLinha(
      doc,
      "Origem",
      `${dados.origem_lat}, ${dados.origem_lng}`
    );
    adicionarLinha(
      doc,
      "Destino",
      `${dados.destino_lat}, ${dados.destino_lng}`
    );
    adicionarLinha(doc, "Status da rota", dados.status);
    adicionarLinha(doc, "Data de início", formatarDataHora(dados.data_inicio));
    adicionarLinha(doc, "Data de fim", formatarDataHora(dados.data_fim));
    adicionarLinha(
      doc,
      "Tempo estimado",
      `${dados.tempo_estimado_minutos ?? "Não informado"} min`
    );

    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(13).text("Resumo térmico");
    doc.font("Helvetica").fontSize(10);
    adicionarLinha(doc, "Total de leituras", estatisticas.totalLeituras);
    adicionarLinha(
      doc,
      "Temperatura mínima registrada",
      `${formatarNumero(estatisticas.temperaturaMinima)} °C`
    );
    adicionarLinha(
      doc,
      "Temperatura máxima registrada",
      `${formatarNumero(estatisticas.temperaturaMaxima)} °C`
    );
    adicionarLinha(
      doc,
      "Temperatura média",
      `${formatarNumero(estatisticas.temperaturaMedia)} °C`
    );
    adicionarLinha(
      doc,
      "Quantidade de eventos críticos",
      estatisticas.totalEventosCriticos
    );

    doc.moveDown();
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor(estatisticas.resultadoFinal === "CONFORME" ? "green" : "red")
      .text(`Resultado final: ${estatisticas.resultadoFinal}`);
    doc.fillColor("black");

    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(13).text("Eventos críticos");
    doc.font("Helvetica").fontSize(10);

    if (dados.eventosCriticos.length === 0) {
      doc.text("Nenhum evento crítico registrado.");
    } else {
      dados.eventosCriticos.slice(0, 12).forEach((evento) => {
        doc.text(
          `- ${formatarDataHora(evento.data_hora)} | ${formatarNumero(
            evento.temperatura_registrada
          )} °C | ${evento.descricao}`
        );
      });
    }

    doc.moveDown();
    doc.font("Helvetica-Bold").fontSize(13).text("Validação");
    doc.font("Helvetica").fontSize(9).text(`Hash SHA-256: ${hashValidacao}`);
    doc.text("Assinatura simulada: ColdChain IoT Compliance");

    doc.end();
  });
}

export async function gerarCertificadoPdf() {
  const dados = await buscarDadosRelatorio();
  const estatisticas = calcularEstatisticas(
    dados.leituras,
    dados.eventosCriticos
  );
  const timestamp = criarTimestampArquivo();
  const fileName = `certificado-rota-${dados.id_rota}-${timestamp}.pdf`;
  const conteudoValidacao = JSON.stringify({
    idRota: dados.id_rota,
    cliente: dados.cliente,
    veiculo: dados.veiculo,
    produto: dados.produto,
    estatisticas,
    eventosCriticos: dados.eventosCriticos,
    geradoEm: timestamp,
  });
  const hashValidacao = crypto
    .createHash("sha256")
    .update(conteudoValidacao)
    .digest("hex");
  const buffer = await criarPdfBuffer(dados, estatisticas, hashValidacao);

  return {
    idRota: dados.id_rota,
    fileName,
    buffer,
    contentType: "application/pdf",
  };
}
