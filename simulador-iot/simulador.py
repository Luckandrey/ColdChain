import json
import random
import time
from datetime import datetime

import paho.mqtt.client as mqtt


BROKER_HOST = "44.203.32.162"
BROKER_PORT = 1883
TOPIC = "coldchain/veiculo01/telemetria"

CARGA_ID = "CRG-2026-001"
VEICULO = "TRK-4821"

progresso = 64


def criar_cliente_mqtt():
    try:
        return mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    except AttributeError:
        return mqtt.Client()


client = criar_cliente_mqtt()

print("Conectando ao broker MQTT...")
client.connect(BROKER_HOST, BROKER_PORT, 60)

client.loop_start()

print("Simulador IoT ColdChain iniciado.")
print(f"Broker: {BROKER_HOST}:{BROKER_PORT}")
print(f"Tópico: {TOPIC}")
print("----------------------------------------")

while True:
    temperatura = round(random.uniform(3.2, 10.2), 1)
    umidade = random.randint(54, 76)
    porta_aberta = random.random() > 0.88
    vibracao = round(random.random(), 2)

    progresso = min(98, progresso + random.randint(0, 2))

    latitude = round(-1.4558 + random.uniform(-0.01, 0.01), 6)
    longitude = round(-48.4902 + random.uniform(-0.01, 0.01), 6)

    payload = {
        "cargaId": CARGA_ID,
        "veiculo": VEICULO,
        "temperatura": temperatura,
        "umidade": umidade,
        "portaAberta": porta_aberta,
        "vibracao": vibracao,
        "latitude": latitude,
        "longitude": longitude,
        "progresso": progresso,
        "previsaoChegada": "27 min",
        "timestamp": datetime.now().isoformat()
    }

    client.publish(TOPIC, json.dumps(payload))

    print("Mensagem enviada:")
    print(json.dumps(payload, indent=2, ensure_ascii=False))
    print("----------------------------------------")

    time.sleep(5)