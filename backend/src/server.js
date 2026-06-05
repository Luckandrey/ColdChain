import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { estado } from "./data.js";
import { iniciarMqtt } from "./mqttClient.js";
import { testarConexaoBanco } from "./db.js";
import {
  inicializarDadosPadrao,
  listarUltimasLeiturasTemperatura,
  listarUltimosEventos,
} from "./dbService.js";
import {
  gerarCertificadoPdf,
  gerarCsvRastroViagem,
} from "./reportService.js";
import { uploadArquivoS3 } from "./s3Service.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const allowedOrigins = (
  process.env.FRONTEND_URLS ||
  process.env.FRONTEND_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origem não permitida pelo CORS"));
    },
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "API ColdChain rodando",
    status: "online",
  });
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const historicoDoBanco = await listarUltimasLeiturasTemperatura();
    const eventosDoBanco = await listarUltimosEventos();

    res.json({
      carga: estado.carga,
      historicoTemperatura:
        historicoDoBanco.length > 0
          ? historicoDoBanco
          : estado.historicoTemperatura,
      alertas: eventosDoBanco.length > 0 ? eventosDoBanco : estado.alertas,
      cargasAtivas: estado.cargasAtivas,
    });
  } catch (error) {
    console.error("Erro ao buscar dashboard no banco:");
    console.error(error);

    res.json({
      carga: estado.carga,
      historicoTemperatura: estado.historicoTemperatura,
      alertas: estado.alertas,
      cargasAtivas: estado.cargasAtivas,
    });
  }
});

app.get("/api/cargas", (req, res) => {
  res.json(estado.cargasAtivas);
});

app.get("/api/alertas", async (req, res) => {
  try {
    const eventos = await listarUltimosEventos();
    res.json(eventos.length > 0 ? eventos : estado.alertas);
  } catch (error) {
    res.json(estado.alertas);
  }
});

app.get("/api/leituras-temperatura", async (req, res) => {
  try {
    const leituras = await listarUltimasLeiturasTemperatura();
    res.json(leituras.length > 0 ? leituras : estado.historicoTemperatura);
  } catch (error) {
    res.json(estado.historicoTemperatura);
  }
});

app.get("/api/relatorios/csv", async (req, res) => {
  try {
    const relatorio = await gerarCsvRastroViagem();
    const body = Buffer.from(relatorio.content, "utf-8");
    const upload = await uploadArquivoS3({
      key: `rastros/${relatorio.fileName}`,
      body,
      contentType: relatorio.contentType,
    });

    console.log("Rastro CSV enviado para o S3:", upload.s3Uri);

    res.setHeader("Content-Type", relatorio.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${relatorio.fileName}"`
    );
    res.send(body);
  } catch (error) {
    console.error("Erro ao gerar rastro CSV:");
    console.error(error);
    res.status(500).json({
      mensagem: "Não foi possível gerar o rastro CSV.",
    });
  }
});

app.post("/api/certificados", async (req, res) => {
  try {
    const certificado = await gerarCertificadoPdf();
    const upload = await uploadArquivoS3({
      key: `certificados/${certificado.fileName}`,
      body: certificado.buffer,
      contentType: certificado.contentType,
    });

    res.status(201).json({
      status: "Gerado",
      fileName: certificado.fileName,
      bucket: upload.bucket,
      s3Key: upload.key,
      s3Uri: upload.s3Uri,
      mensagem: "Certificado PDF gerado e enviado para o S3.",
      criadoEm: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erro ao gerar certificado PDF:");
    console.error(error);
    res.status(500).json({
      mensagem: "Não foi possível gerar o certificado PDF.",
    });
  }
});

app.get("/api/certificados/download", async (req, res) => {
  try {
    const certificado = await gerarCertificadoPdf();
    const upload = await uploadArquivoS3({
      key: `certificados/${certificado.fileName}`,
      body: certificado.buffer,
      contentType: certificado.contentType,
    });

    console.log("Certificado PDF enviado para o S3:", upload.s3Uri);

    res.setHeader("Content-Type", certificado.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${certificado.fileName}"`
    );
    res.send(certificado.buffer);
  } catch (error) {
    console.error("Erro ao baixar certificado PDF:");
    console.error(error);
    res.status(500).json({
      mensagem: "Não foi possível baixar o certificado PDF.",
    });
  }
});

app.listen(PORT, async () => {
  console.log(`API ColdChain rodando em http://localhost:${PORT}`);

  try {
    await testarConexaoBanco();
    await inicializarDadosPadrao();
  } catch (error) {
    console.error("Erro ao conectar/inicializar banco:");
    console.error(error);
  }

  iniciarMqtt();
});
