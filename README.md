# ColdChain

ColdChain e um sistema IoT para monitoramento da cadeia do frio em logistica. O projeto simula telemetria de sensores, recebe dados via MQTT, persiste leituras em banco PostgreSQL/RDS e disponibiliza uma API REST consumida por um frontend React.

## Tecnologias

- React
- Vite
- TailwindCSS
- Node.js
- Express
- MQTT
- Mosquitto
- Python
- PostgreSQL/RDS
- AWS EC2
- S3

## Arquitetura

`Simulador IoT Python -> Mosquitto na EC2 -> Backend Node/Express na EC2 -> RDS PostgreSQL privado -> API REST -> Frontend React`

## Configuracao

Antes de rodar o projeto, crie os arquivos de variaveis de ambiente com base nos exemplos seguros:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Preencha os arquivos `.env` locais com os valores reais do seu ambiente. Esses arquivos nao devem ser enviados para o GitHub.

## Como Rodar O Frontend Localmente

```bash
cd frontend
npm install
npm run dev
```

Por padrao, o Vite disponibiliza o frontend em `http://localhost:5173`.

## Como Rodar O Backend Localmente

```bash
cd backend
npm install
npm run dev
```

O backend usa as variaveis definidas em `backend/.env`, incluindo conexao com MQTT e PostgreSQL/RDS.

## Como Rodar O Simulador Python

Instale a dependencia MQTT para Python:

```bash
pip install paho-mqtt
```

Execute o simulador:

```bash
cd simulador-iot
python simulador.py
```

O simulador publica mensagens de telemetria no topico MQTT configurado no codigo.

## Seguranca

Nao versione arquivos `.env`, chaves `.pem`, certificados, credenciais da AWS, senhas reais, `node_modules`, builds ou pastas temporarias de deploy. Use sempre os arquivos `.env.example` como referencia para configurar ambientes locais e servidores.
