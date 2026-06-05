import json
import random
import time
from datetime import datetime

import paho.mqtt.client as mqtt


BROKER_HOST = "44.203.32.162"
BROKER_PORT = 1883
TOPIC = "coldchain/veiculo01/telemetria"

CARGA_BASE_ID = "CRG-2026"
VEICULO = "TRK-4821"

INTERVALO_ENVIO_SEGUNDOS = 5
TEMPO_TOTAL_ESTIMADO_MINUTOS = 27
PAUSA_ENTRE_VIAGENS_SEGUNDOS = 8


def criar_cliente_mqtt():
    try:
        return mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    except AttributeError:
        return mqtt.Client()


def gerar_temperatura():
    """
    Na maior parte do tempo gera temperatura segura.
    Às vezes gera temperatura crítica para demonstrar alertas.
    """
    evento_critico = random.random() > 0.78

    if evento_critico:
        return round(random.uniform(8.1, 10.3), 1)

    return round(random.uniform(3.2, 7.8), 1)


def gerar_vibracao():
    """
    Na maior parte do tempo gera vibração normal.
    Às vezes gera impacto para demonstrar alerta.
    """
    impacto = random.random() > 0.88

    if impacto:
        return round(random.uniform(0.86, 1.25), 2)

    return round(random.uniform(0.05, 0.75), 2)


def calcular_previsao_chegada(progresso):
    if progresso >= 100:
        return "0 min"

    minutos_restantes = round(
        TEMPO_TOTAL_ESTIMADO_MINUTOS * ((100 - progresso) / 100)
    )

    minutos_restantes = max(1, minutos_restantes)

    return f"{minutos_restantes} min"


def gerar_posicao(progresso):
    """
    Simula deslocamento entre origem e destino.
    Origem aproximada em Belém e destino aproximado em Ananindeua.
    """
    origem_lat = -1.4558
    origem_lng = -48.4902

    destino_lat = -1.3656
    destino_lng = -48.3722

    fator = progresso / 100

    latitude = origem_lat + (destino_lat - origem_lat) * fator
    longitude = origem_lng + (destino_lng - origem_lng) * fator

    latitude += random.uniform(-0.002, 0.002)
    longitude += random.uniform(-0.002, 0.002)

    return round(latitude, 6), round(longitude, 6)


def criar_payload(ciclo_viagem, progresso):
    temperatura = gerar_temperatura()
    umidade = random.randint(54, 76)
    porta_aberta = random.random() > 0.91
    vibracao = gerar_vibracao()
    latitude, longitude = gerar_posicao(progresso)

    carga_id = f"{CARGA_BASE_ID}-{str(ciclo_viagem).zfill(3)}"

    status_rota = "CONCLUIDA" if progresso >= 100 else "EM_ANDAMENTO"

    return {
        "cargaId": carga_id,
        "veiculo": VEICULO,
        "temperatura": temperatura,
        "umidade": umidade,
        "portaAberta": porta_aberta,
        "vibracao": vibracao,
        "latitude": latitude,
        "longitude": longitude,
        "progresso": progresso,
        "previsaoChegada": calcular_previsao_chegada(progresso),
        "statusRota": status_rota,
        "cicloViagem": ciclo_viagem,
        "timestamp": datetime.now().isoformat()
    }


client = criar_cliente_mqtt()

print("Conectando ao broker MQTT...")
client.connect(BROKER_HOST, BROKER_PORT, 60)
client.loop_start()

print("Simulador IoT ColdChain iniciado.")
print(f"Broker: {BROKER_HOST}:{BROKER_PORT}")
print(f"Tópico: {TOPIC}")
print("----------------------------------------")

ciclo_viagem = 1
progresso = 0

try:
    while True:
        incremento = random.randint(3, 8)
        progresso = min(100, progresso + incremento)

        payload = criar_payload(ciclo_viagem, progresso)

        client.publish(TOPIC, json.dumps(payload))

        print("Mensagem enviada:")
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        print("----------------------------------------")

        if progresso >= 100:
            print(f"Viagem {ciclo_viagem} concluída.")
            print(
                f"Aguardando {PAUSA_ENTRE_VIAGENS_SEGUNDOS} segundos para iniciar nova rota..."
            )
            print("----------------------------------------")

            time.sleep(PAUSA_ENTRE_VIAGENS_SEGUNDOS)

            ciclo_viagem += 1
            progresso = 0

            print(f"Iniciando nova viagem: ciclo {ciclo_viagem}")
            print("----------------------------------------")
        else:
            time.sleep(INTERVALO_ENVIO_SEGUNDOS)

except KeyboardInterrupt:
    print("\nSimulador encerrado pelo usuário.")
    client.loop_stop()
    client.disconnect()
