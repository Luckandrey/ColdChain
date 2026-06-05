import mqtt from "mqtt";
import { estado } from "./data.js";
import { salvarEventoCritico, salvarLeituraSensor } from "./dbService.js";

export function iniciarMqtt() {
  const brokerUrl = process.env.MQTT_BROKER_URL;
  const topic = process.env.MQTT_TOPIC;

  if (!brokerUrl || !topic) {
    console.log("MQTT não configurado. Verifique o arquivo .env.");
    return;
  }

  const client = mqtt.connect(brokerUrl);

  client.on("connect", () => {
    console.log(`Conectado ao broker MQTT: ${brokerUrl}`);

    client.subscribe(topic, (error) => {
      if (error) {
        console.error("Erro ao assinar tópico MQTT:", error.message);
        return;
      }

      console.log(`Assinando tópico: ${topic}`);
    });
  });

  client.on("message", async (receivedTopic, message) => {
    try {
      const payload = JSON.parse(message.toString());

      const agora = new Date();
      const horarioFormatado = agora.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      estado.carga = {
        ...estado.carga,
        temperatura: payload.temperatura,
        umidade: payload.umidade,
        portaAberta: payload.portaAberta,
        vibracao: payload.vibracao,
        latitude: payload.latitude,
        longitude: payload.longitude,
        progresso: payload.progresso,
        previsaoChegada:
          payload.previsaoChegada ?? estado.carga.previsaoChegada,
      };

      estado.historicoTemperatura = [
        ...estado.historicoTemperatura.slice(-7),
        {
          horario: horarioFormatado,
          temperatura: payload.temperatura,
        },
      ];

      try {
        await salvarLeituraSensor(payload);
      } catch (error) {
        console.error("Erro ao salvar leitura no banco:");
        console.error(error);
      }

      const temperaturaCritica =
        payload.temperatura < estado.carga.temperaturaMinima ||
        payload.temperatura > estado.carga.temperaturaMaxima;

      if (temperaturaCritica) {
        const evento = {
          tipo: "Temperatura fora da faixa",
          descricao: `Carga ${estado.carga.id} registrou ${payload.temperatura}°C no último envio.`,
          nivel: "critico",
          horario: horarioFormatado,
          temperatura: payload.temperatura,
        };

        estado.alertas = [
          {
            id: Date.now(),
            titulo: evento.tipo,
            descricao: evento.descricao,
            nivel: evento.nivel,
            horario: evento.horario,
          },
          ...estado.alertas.slice(0, 5),
        ];

        try {
          await salvarEventoCritico(evento);
        } catch (error) {
          console.error(
            "Erro ao salvar evento de temperatura no banco:",
            error.message
          );
        }
      }

      if (payload.portaAberta) {
        const evento = {
          tipo: "Abertura de porta",
          descricao: "Sensor detectou abertura do baú durante o trajeto.",
          nivel: "atencao",
          horario: horarioFormatado,
          temperatura: payload.temperatura,
        };

        estado.alertas = [
          {
            id: Date.now() + 1,
            titulo: evento.tipo,
            descricao: evento.descricao,
            nivel: evento.nivel,
            horario: evento.horario,
          },
          ...estado.alertas.slice(0, 5),
        ];

        try {
          await salvarEventoCritico(evento);
        } catch (error) {
          console.error(
            "Erro ao salvar evento de porta no banco:",
            error.message
          );
        }
      }

      if (payload.vibracao > 0.85) {
        const evento = {
        tipo: "Choque detectado",
        descricao: `Vibração de ${payload.vibracao}g detectada na carga.`,
        nivel: "atencao",
        horario: horarioFormatado,
        temperatura: payload.temperatura,
                        };

        estado.alertas = [
          {
            id: Date.now() + 2,
            titulo: evento.tipo,
            descricao: evento.descricao,
            nivel: evento.nivel,
            horario: evento.horario,
          },
          ...estado.alertas.slice(0, 5),
        ];

        try {
          await salvarEventoCritico(evento);
        } catch (error) {
          console.error(
            "Erro ao salvar evento de vibração no banco:",
            error.message
          );
        }
      }

      console.log("Mensagem MQTT processada e persistida:", payload);
    } catch (error) {
      console.error("Erro ao processar mensagem MQTT:", error.message);
    }
  });

  client.on("error", (error) => {
    console.error("Erro no MQTT:", error.message);
  });
}