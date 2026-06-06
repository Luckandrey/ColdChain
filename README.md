# ColdChain — Sistema IoT para Cadeia do Frio

Sistema IoT para monitoramento, rastreamento e auditoria da cadeia do frio em operações logísticas. O projeto simula sensores instalados em um veículo refrigerado, envia telemetria via MQTT, processa os dados em um backend na AWS, persiste as leituras em um banco RDS PostgreSQL privado e disponibiliza as informações em um dashboard web.

O projeto foi desenvolvido para o **Tema J — ColdChain: Cadeia do Frio para Logística**, com foco no transporte de cargas sensíveis como vacinas, medicamentos termolábeis e alimentos perecíveis.

---

## Links do Projeto

**Frontend publicado:**
https://luckandrey.github.io/ColdChain/

**Repositório:**
https://github.com/Luckandrey/ColdChain

Observação: o frontend publicado no GitHub Pages utiliza HTTPS. Para integração com o backend hospedado na EC2 durante a demonstração, foi utilizado Cloudflare Tunnel para expor temporariamente a API com HTTPS.

---

## Objetivo

O objetivo do ColdChain é monitorar em tempo próximo ao real as condições de transporte de cargas refrigeradas, identificando possíveis quebras da cadeia do frio e gerando evidências para auditoria.

A aplicação acompanha:

* temperatura interna do baú refrigerado;
* umidade;
* abertura de porta;
* vibração/choque;
* localização GPS;
* progresso da rota;
* eventos críticos;
* rastros da viagem em CSV;
* certificados PDF de conformidade;
* notas fiscais digitalizadas armazenadas no S3.

---

## Arquitetura Geral

Fluxo principal da solução:

```txt
Simulador IoT Python
        ↓ MQTT
Broker Mosquitto em Docker na EC2
        ↓
Backend Node.js/Express na EC2
        ↓
RDS PostgreSQL privado
        ↓
API REST
        ↓
Frontend React/Tailwind
```

Fluxo dos arquivos de auditoria:

```txt
Frontend
        ↓
Backend na EC2
        ↓
Amazon S3
```

Fluxo do frontend publicado:

```txt
GitHub Pages
        ↓ HTTPS
Cloudflare Tunnel
        ↓
Backend na EC2
        ↓
RDS PostgreSQL / Amazon S3
```

---

## Tecnologias Utilizadas

### Frontend

* React
* Vite
* TailwindCSS
* GitHub Pages

### Backend

* Node.js
* Express
* CORS
* Dotenv
* MQTT.js
* PDFKit
* Multer
* AWS SDK para JavaScript

### IoT e Mensageria

* Python
* Paho MQTT
* Mosquitto MQTT Broker
* Docker

### Banco de Dados

* PostgreSQL
* Amazon RDS

### Nuvem AWS

* Amazon EC2
* Amazon RDS
* Amazon S3
* Amazon VPC
* Sub-rede pública e privada
* Internet Gateway
* Security Groups
* IAM Role associada à EC2

### Deploy e Operação

* PM2
* GitHub Actions
* Cloudflare Tunnel

---

## Funcionalidades Implementadas

### Monitoramento em tempo próximo ao real

O dashboard exibe os dados operacionais da carga em trânsito, incluindo temperatura, umidade, vibração, porta aberta/fechada, localização, progresso da rota e previsão de chegada.

### Simulador IoT em Python

O simulador representa um dispositivo instalado no baú refrigerado. Ele publica mensagens MQTT no tópico:

```txt
coldchain/veiculo01/telemetria
```

Exemplo de payload enviado:

```json
{
  "cargaId": "CRG-2026-001",
  "veiculo": "TRK-4821",
  "temperatura": 5.5,
  "umidade": 69,
  "portaAberta": false,
  "vibracao": 0.49,
  "latitude": -1.461817,
  "longitude": -48.481878,
  "progresso": 91,
  "previsaoChegada": "27 min",
  "timestamp": "2026-06-05T16:38:01.170349"
}
```

### Broker MQTT Mosquitto

O Mosquitto foi executado em Docker dentro da EC2 pública. O backend assina o tópico MQTT e processa as mensagens recebidas.

### Persistência no RDS PostgreSQL

As leituras de temperatura recebidas pelo backend são armazenadas no banco RDS PostgreSQL privado, associadas à rota monitorada.

### Alertas críticos

O sistema registra eventos críticos quando ocorre quebra da cadeia do frio, como temperatura fora da faixa segura, abertura de porta ou vibração elevada.

### Exportação CSV

O sistema gera o rastro da viagem em CSV com dados reais do RDS.

Endpoint:

```http
GET /api/relatorios/csv
```

O arquivo é baixado pelo navegador e enviado ao S3 na pasta:

```txt
rastros/
```

### Certificado PDF de conformidade

O sistema gera um certificado PDF com resumo da operação, estatísticas térmicas, eventos críticos e hash SHA-256 de validação simulada.

Endpoints:

```http
POST /api/certificados
GET /api/certificados/download
```

O PDF é baixado pelo navegador e enviado ao S3 na pasta:

```txt
certificados/
```

### Upload de notas fiscais digitalizadas

O sistema permite enviar notas fiscais digitalizadas em PDF, PNG, JPG ou JPEG.

Endpoint:

```http
POST /api/notas-fiscais
```

Os arquivos são enviados ao S3 na pasta:

```txt
notas-fiscais/
```

---

## Banco de Dados

O banco foi modelado para representar a operação logística da cadeia do frio.

Tabelas principais:

* `clientes`
* `veiculos`
* `produtos`
* `cargas`
* `rotas`
* `leiturastemperatura`
* `eventoscriticos`

A tabela `rotas` funciona como elemento central da operação, relacionando veículo, carga e cliente. As leituras de temperatura e eventos críticos são vinculados à rota monitorada.

Consulta usada para validar a persistência das leituras:

```sql
SELECT * FROM leiturastemperatura ORDER BY data_hora DESC LIMIT 10;
```

---

## API REST

Principais rotas do backend:

```http
GET /
GET /api/dashboard
GET /api/cargas
GET /api/alertas
GET /api/leituras-temperatura
GET /api/relatorios/csv
POST /api/certificados
GET /api/certificados/download
POST /api/notas-fiscais
```

---

## Estrutura do Projeto

```txt
ColdChain/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── mqttClient.js
│   │   ├── db.js
│   │   ├── dbService.js
│   │   ├── s3Service.js
│   │   ├── reportService.js
│   │   └── data.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── assets/
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── simulador-iot/
│   └── simulador.py
│
├── .github/
│   └── workflows/
│       └── deploy-frontend.yml
│
├── README.md
└── .gitignore
```

---

## Como Rodar Localmente

### 1. Clonar o repositório

```bash
git clone https://github.com/Luckandrey/ColdChain.git
cd ColdChain
```

---

### 2. Configurar variáveis de ambiente

Crie os arquivos `.env` com base nos exemplos:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Os arquivos `.env` reais não devem ser enviados ao GitHub.

---

### 3. Rodar o backend

```bash
cd backend
npm install
npm run dev
```

Por padrão, o backend roda em:

```txt
http://localhost:3000
```

---

### 4. Rodar o frontend

```bash
cd frontend
npm install
npm run dev
```

Por padrão, o Vite disponibiliza o frontend em:

```txt
http://localhost:5173
```

---

### 5. Rodar o simulador IoT

Instale a dependência MQTT para Python:

```bash
pip install paho-mqtt
```

Execute o simulador:

```bash
cd simulador-iot
python simulador.py
```

---

## Variáveis de Ambiente

### Backend

Exemplo de `.env` do backend:

```env
PORT=3000
FRONTEND_URLS=http://localhost:5173,https://luckandrey.github.io

MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_TOPIC=coldchain/veiculo01/telemetria

DB_HOST=seu-endpoint-rds.amazonaws.com
DB_PORT=5432
DB_NAME=nome_do_banco
DB_USER=usuario_do_banco
DB_PASSWORD=sua_senha
DB_SSL=true

AWS_REGION=us-east-1
S3_BUCKET_NAME=s3-bucket-projeto-fabio-temaj
```

### Frontend

Exemplo de `.env` do frontend:

```env
VITE_API_URL=http://localhost:3000
```

No GitHub Pages, a variável `VITE_API_URL` deve apontar para uma URL HTTPS da API, como uma URL do Cloudflare Tunnel.

---

## Deploy

### Backend na EC2

O backend foi implantado em uma instância EC2 pública e mantido em execução com PM2.

Comandos úteis:

```bash
pm2 status
pm2 logs coldchain-backend
pm2 restart coldchain-backend --update-env
```

### Mosquitto em Docker

O broker Mosquitto roda em container Docker dentro da EC2.

Comando útil:

```bash
sudo docker ps
```

### Frontend no GitHub Pages

O frontend é publicado automaticamente usando GitHub Actions.

Workflow:

```txt
.github/workflows/deploy-frontend.yml
```

O deploy gera o build da pasta `frontend` e publica o conteúdo de `frontend/dist` no GitHub Pages.

---

## Amazon S3

O bucket utilizado no projeto é:

```txt
s3-bucket-projeto-fabio-temaj
```

Pastas utilizadas:

```txt
certificados/
rastros/
notas-fiscais/
```

O acesso ao S3 é feito por meio de IAM Role associada à EC2, evitando o uso de credenciais AWS hardcoded no código.

---

## Segurança

Este repositório não deve versionar:

* arquivos `.env`;
* chaves `.pem`;
* senhas;
* credenciais da AWS;
* `node_modules`;
* builds locais;
* arquivos temporários de deploy.

O acesso ao S3 é feito com IAM Role, e o RDS permanece privado, acessível apenas pelo backend dentro da infraestrutura da AWS.

---

## Critérios de Avaliação Atendidos

### Apresentação oral

O projeto possui dashboard funcional, fluxo de dados em tempo próximo ao real, frontend publicado e demonstração prática com simulador IoT.

### Arguição técnica

A arquitetura utiliza componentes reais de nuvem e IoT: EC2, Mosquitto, MQTT, backend Node.js, RDS PostgreSQL, S3, IAM Role, GitHub Pages e Cloudflare Tunnel.

### Implementação técnica

Foram configurados VPC, EC2, RDS, S3, Security Groups, backend, broker MQTT, frontend e integração funcional entre os componentes.

### Relatório e documentação

O projeto possui relatório técnico, README, código versionado no GitHub e documentação das rotas, serviços, fluxos e variáveis de ambiente.

### Criatividade e aderência ao tema

A solução está aderente ao Tema J — ColdChain, contemplando monitoramento térmico, rastreabilidade, eventos críticos e auditoria documental.

### Hardware

O projeto utiliza um simulador IoT em Python para representar sensores físicos. A implementação em hardware físico pode ser evoluída futuramente com ESP32 e sensores reais de temperatura, umidade, GPS e vibração.

---

## Testes Realizados

Foram validados os seguintes pontos:

* simulador Python publicando mensagens MQTT;
* Mosquitto recebendo mensagens na EC2;
* backend assinando o tópico MQTT;
* backend processando mensagens recebidas;
* leituras sendo persistidas no RDS PostgreSQL;
* eventos críticos sendo registrados;
* frontend consumindo a API REST;
* GitHub Pages exibindo o dashboard;
* CSV sendo gerado e enviado ao S3;
* PDF de conformidade sendo gerado e enviado ao S3;
* notas fiscais digitalizadas sendo enviadas ao S3;
* backend mantido em execução com PM2;
* acesso ao S3 via IAM Role da EC2.

---

## Resultado Final

O ColdChain entrega uma solução funcional de IoT e computação em nuvem para monitoramento da cadeia do frio. O sistema simula sensores em um veículo refrigerado, transmite dados via MQTT, processa as leituras em um backend na EC2, salva informações em um banco RDS privado, disponibiliza um painel web e armazena documentos de auditoria no Amazon S3.

A solução contempla tanto o monitoramento operacional quanto a geração de evidências para conformidade logística.
