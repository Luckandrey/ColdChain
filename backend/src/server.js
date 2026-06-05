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

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_URL,
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

app.post("/api/certificados", (req, res) => {
  const certificado = {
    id: `CERT-${Date.now()}`,
    cargaId: estado.carga.id,
    status: "Gerado",
    mensagem:
      "Certificado simulado gerado com base nas leituras da cadeia do frio.",
    criadoEm: new Date().toISOString(),
  };

  res.status(201).json(certificado);
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