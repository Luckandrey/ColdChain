import { useEffect, useRef, useState } from "react";

import coldChainLogo from "./assets/ColdChainLogo.png";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const historicoInicialTemperatura = [
  { horario: "08:00", temperatura: 4.1 },
  { horario: "08:15", temperatura: 4.3 },
  { horario: "08:30", temperatura: 5.0 },
  { horario: "08:45", temperatura: 5.7 },
  { horario: "09:00", temperatura: 7.2 },
  { horario: "09:15", temperatura: 8.6 },
];

const alertasIniciais = [
  {
    id: 1,
    titulo: "Temperatura fora da faixa",
    descricao: "Carga CRG-2026-001 registrou 8.6°C no último envio.",
    nivel: "critico",
    horario: "09:15",
  },
  {
    id: 2,
    titulo: "Abertura de porta",
    descricao: "Porta do baú aberta por 42 segundos durante a rota.",
    nivel: "atencao",
    horario: "08:48",
  },
  {
    id: 3,
    titulo: "Evento de vibração",
    descricao: "Impacto moderado detectado próximo ao ponto de entrega.",
    nivel: "atencao",
    horario: "08:21",
  },
];

const cargasAtivasIniciais = [
  {
    id: "CRG-2026-001",
    produto: "Vacinas termolábeis",
    veiculo: "TRK-4821",
    rota: "Belém - Ananindeua",
    status: "Risco",
    temperatura: "8.6°C",
  },
  {
    id: "CRG-2026-002",
    produto: "Insulina hospitalar",
    veiculo: "TRK-1904",
    rota: "Belém - Marituba",
    status: "Normal",
    temperatura: "4.8°C",
  },
  {
    id: "CRG-2026-003",
    produto: "Alimentos perecíveis",
    veiculo: "TRK-7742",
    rota: "Icoaraci - Belém",
    status: "Normal",
    temperatura: "3.9°C",
  },
];

const itensMenu = [
  {
    id: "central",
    rotulo: "Central de Controle",
    icone: "painel",
    titulo: "Cadeia do frio em tempo real",
    subtitulo:
      "Acompanhamento operacional de temperatura, rota, porta, umidade e impacto para cargas sensíveis em trânsito.",
  },
  {
    id: "cargas",
    rotulo: "Cargas",
    icone: "carga",
    titulo: "Cargas monitoradas",
    subtitulo:
      "Visão consolidada das remessas ativas e seus estados de conservação.",
  },
  {
    id: "frota",
    rotulo: "Rastreamento de Frota",
    icone: "frota",
    titulo: "Rastreamento de frota",
    subtitulo:
      "Localização, rota e progresso dos veículos refrigerados em operação.",
  },
  {
    id: "temperatura",
    rotulo: "Registros de Temperatura",
    icone: "temperatura",
    titulo: "Registros de temperatura",
    subtitulo:
      "Histórico das leituras recebidas e limites térmicos da cadeia do frio.",
  },
  {
    id: "conformidade",
    rotulo: "Conformidade",
    icone: "conformidade",
    titulo: "Conformidade e auditoria",
    subtitulo:
      "Evidências, certificados e rastros necessários para auditoria da carga.",
  },
  {
    id: "configuracoes",
    rotulo: "Configurações",
    icone: "configuracoes",
    titulo: "Configurações",
    subtitulo:
      "Parâmetros operacionais, limites de sensores e integrações da plataforma.",
  },
];

function formatarHorarioAtual() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizarCargasAtivas(lista, cargaAtual) {
  if (!Array.isArray(lista)) {
    return cargasAtivasIniciais;
  }

  if (!cargaAtual?.id) {
    return lista;
  }

  const temperaturaCritica =
    cargaAtual.temperatura < cargaAtual.temperaturaMinima ||
    cargaAtual.temperatura > cargaAtual.temperaturaMaxima;

  return lista.map((item) => {
    if (item.id !== cargaAtual.id) {
      return item;
    }

    return {
      ...item,
      produto: cargaAtual.produto ?? item.produto,
      veiculo: cargaAtual.veiculo ?? item.veiculo,
      rota: cargaAtual.rota ?? item.rota,
      status: temperaturaCritica ? "Risco" : "Normal",
      temperatura:
        typeof cargaAtual.temperatura === "number"
          ? `${cargaAtual.temperatura}°C`
          : item.temperatura,
    };
  });
}

function baixarArquivo(blob, nomeArquivo) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [menuAberto, setMenuAberto] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [paginaAtiva, setPaginaAtiva] = useState("central");
  const inputNotaFiscalRef = useRef(null);

  const [carga, setCarga] = useState({
    id: "CRG-2026-001",
    produto: "Vacinas termolábeis",
    cliente: "Hospital Central",
    veiculo: "TRK-4821",
    motorista: "Carlos Mendes",
    rota: "Belém - Ananindeua",
    origem: "Centro de Distribuição",
    destino: "Hospital Central",
    status: "Em trânsito",
    temperatura: 8.6,
    umidade: 68,
    portaAberta: false,
    vibracao: 0.42,
    latitude: -1.4558,
    longitude: -48.4902,
    temperaturaMinima: 2,
    temperaturaMaxima: 8,
    progresso: 64,
    previsaoChegada: "27 min",
  });

  const [historicoTemperatura, setHistoricoTemperatura] = useState(
    historicoInicialTemperatura
  );

  const [alertas, setAlertas] = useState(alertasIniciais);
  const [cargasAtivas, setCargasAtivas] = useState(cargasAtivasIniciais);
  const [erroApi, setErroApi] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [horarioAtualizacao, setHorarioAtualizacao] = useState(
    formatarHorarioAtual()
  );

  useEffect(() => {
    let componenteMontado = true;

    async function carregarDashboard() {
      try {
        const resposta = await fetch(`${API_URL}/api/dashboard`);

        if (!resposta.ok) {
          throw new Error("Erro ao buscar dados do dashboard");
        }

        const dados = await resposta.json();

        if (!componenteMontado) {
          return;
        }

        const cargaAtualizada = dados.carga ?? carga;

        setCarga(cargaAtualizada);
        setHistoricoTemperatura(
          Array.isArray(dados.historicoTemperatura)
            ? dados.historicoTemperatura
            : historicoInicialTemperatura
        );
        setAlertas(
          Array.isArray(dados.alertas) ? dados.alertas : alertasIniciais
        );
        setCargasAtivas(
          normalizarCargasAtivas(
            Array.isArray(dados.cargasAtivas)
              ? dados.cargasAtivas
              : cargasAtivasIniciais,
            cargaAtualizada
          )
        );
        setHorarioAtualizacao(formatarHorarioAtual());
        setErroApi("");
      } catch (error) {
        console.error("Erro ao conectar com a API:", error);

        if (componenteMontado) {
          setErroApi(
            "Não foi possível conectar ao backend. Exibindo os últimos dados disponíveis."
          );
        }
      } finally {
        if (componenteMontado) {
          setCarregando(false);
        }
      }
    }

    carregarDashboard();

    const intervalo = setInterval(() => {
      carregarDashboard();
    }, 5000);

    return () => {
      componenteMontado = false;
      clearInterval(intervalo);
    };
  }, []);

  async function handleExportarCsv() {
    try {
      const resposta = await fetch(`${API_URL}/api/relatorios/csv`);

      if (!resposta.ok) {
        throw new Error("Erro ao gerar CSV");
      }

      const blob = await resposta.blob();

      baixarArquivo(blob, "rastro-coldchain.csv");
    } catch (error) {
      console.error("Erro ao exportar CSV:", error);
      alert("Não foi possível gerar o arquivo.");
    }
  }

  async function handleGerarCertificado() {
    try {
      const resposta = await fetch(`${API_URL}/api/certificados/download`);

      if (!resposta.ok) {
        throw new Error("Erro ao gerar certificado");
      }

      const blob = await resposta.blob();

      baixarArquivo(blob, "certificado-coldchain.pdf");
    } catch (error) {
      console.error("Erro ao gerar certificado:", error);
      alert("Não foi possível gerar o arquivo.");
    }
  }

  function handleAbrirSeletorNotaFiscal() {
    inputNotaFiscalRef.current?.click();
  }

  async function handleEnviarNotaFiscal(event) {
    const arquivo = event.target.files?.[0];

    if (!arquivo) {
      return;
    }

    try {
      const formData = new FormData();

      formData.append("arquivo", arquivo);

      const resposta = await fetch(`${API_URL}/api/notas-fiscais`, {
        method: "POST",
        body: formData,
      });

      if (!resposta.ok) {
        throw new Error("Erro ao enviar nota fiscal");
      }

      alert("Nota fiscal enviada para o S3 com sucesso.");
    } catch (error) {
      console.error("Erro ao enviar nota fiscal:", error);
      alert("Não foi possível enviar a nota fiscal.");
    } finally {
      event.target.value = "";
    }
  }

  const temperaturaCritica =
    carga.temperatura < carga.temperaturaMinima ||
    carga.temperatura > carga.temperaturaMaxima;

  const statusOperacional = temperaturaCritica
    ? "Atenção crítica"
    : "Operação estável";

  const paginaAtual =
    itensMenu.find((item) => item.id === paginaAtiva) ?? itensMenu[0];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0B1120] text-slate-100">
      <div className="flex min-h-screen min-w-0">
        <aside
          onPointerEnter={() => setMenuAberto(true)}
          onPointerLeave={() => setMenuAberto(false)}
          className="fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r border-white/10 bg-[#08111F] p-4 shadow-2xl shadow-black/30 transition-[width] duration-300 xl:flex"
          style={{ width: menuAberto ? "20rem" : "5rem" }}
        >
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <img
                src={coldChainLogo}
                alt="ColdChain"
                className="h-11 w-11 shrink-0 rounded-2xl object-cover"
              />

              <div className={menuAberto ? "whitespace-nowrap" : "hidden"}>
                <h1 className="text-xl font-black tracking-tight">
                  ColdChain
                </h1>
                <p className="text-xs text-slate-400">Controle Logístico</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            {itensMenu.map((item) => (
              <ItemMenu
                key={item.id}
                ativo={paginaAtiva === item.id}
                aberto={menuAberto}
                icone={item.icone}
                rotulo={item.rotulo}
                onClick={() => setPaginaAtiva(item.id)}
              />
            ))}
          </nav>

          <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
            <AcaoMenu
              aberto={menuAberto}
              icone="arquivo"
              rotulo="Exportar CSV"
              onClick={handleExportarCsv}
            />
            <AcaoMenu
              aberto={menuAberto}
              destaque
              icone="certificado"
              rotulo="Gerar certificado"
              onClick={handleGerarCertificado}
            />
            <AcaoMenu
              aberto={menuAberto}
              icone="arquivo"
              rotulo="Enviar nota fiscal"
              onClick={handleAbrirSeletorNotaFiscal}
            />
          </div>
        </aside>

        <MenuMobile
          aberto={menuMobileAberto}
          itensMenu={itensMenu}
          paginaAtiva={paginaAtiva}
          onClose={() => setMenuMobileAberto(false)}
          onSelecionarPagina={setPaginaAtiva}
          onExportarCsv={handleExportarCsv}
          onGerarCertificado={handleGerarCertificado}
          onEnviarNotaFiscal={handleAbrirSeletorNotaFiscal}
        />

        <input
          ref={inputNotaFiscalRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          hidden
          onChange={handleEnviarNotaFiscal}
        />

        <main className="w-full min-w-0 overflow-x-hidden xl:ml-20 xl:max-w-[calc(100vw-5rem)]">
          <HeaderPlataforma
            pagina={paginaAtual}
            carga={carga}
            horarioAtualizacao={horarioAtualizacao}
            erroApi={erroApi}
            carregando={carregando}
            onAbrirMenuMobile={() => setMenuMobileAberto(true)}
          />

          <div className="px-4 py-6 sm:px-6 lg:px-8">
            {erroApi && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
                {erroApi}
              </div>
            )}

            {paginaAtiva === "central" ? (
              <>
                <section className="mb-8 w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#101A2E]/80 p-5">
                  <CabecalhoSecao
                    titulo="Resumo operacional"
                    subtitulo="Condição atual da carga monitorada"
                  />

                  <div className="mt-5 grid grid-cols-1 divide-y divide-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
                    <CartaoStatus
                      titulo="Status operacional"
                      valor={statusOperacional}
                      descricao={
                        temperaturaCritica
                          ? "Intervenção recomendada"
                          : "Sem violação térmica"
                      }
                      perigo={temperaturaCritica}
                    />

                    <CartaoStatus
                      titulo="Temperatura atual"
                      valor={`${carga.temperatura}°C`}
                      descricao={`Faixa segura: ${carga.temperaturaMinima}°C a ${carga.temperaturaMaxima}°C`}
                      perigo={temperaturaCritica}
                    />

                    <CartaoStatus
                      titulo="Umidade interna"
                      valor={`${carga.umidade}%`}
                      descricao="Sensor do baú refrigerado"
                    />

                    <CartaoStatus
                      titulo="Previsão de chegada"
                      valor={carga.previsaoChegada}
                      descricao={`${carga.progresso}% da rota concluída`}
                    />
                  </div>
                </section>

                <section className="grid w-full max-w-full min-w-0 grid-cols-1 gap-8 2xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
                  <div className="min-w-0 space-y-6">
                    <section className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#101A2E]/80 p-5">
                      <div className="flex flex-col gap-5 pb-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                            Carga selecionada
                          </p>
                          <h3 className="mt-2 text-2xl font-black text-white">
                            {carga.produto}
                          </h3>
                          <p className="mt-2 text-sm text-slate-400">
                            {carga.id} · {carga.veiculo} · {carga.cliente}
                          </p>
                        </div>

                        <div
                          className={`w-fit rounded-full px-4 py-2 text-sm font-black ${
                            temperaturaCritica
                              ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
                              : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                          }`}
                        >
                          {temperaturaCritica
                            ? "Quebra da cadeia do frio"
                            : "Dentro da conformidade"}
                        </div>
                      </div>

                      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.55fr)]">
                        <div className="relative min-h-[430px] min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#07111F]">
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(34,211,238,0.08)_1px,transparent_1px),linear-gradient(rgba(34,211,238,0.08)_1px,transparent_1px)] bg-[size:38px_38px]" />

                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_35%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_70%_65%,rgba(14,165,233,0.14),transparent_30%)]" />

                          <div className="relative z-10 flex h-full min-h-[430px] min-w-0 flex-col justify-between p-6">
                            <div className="flex min-w-0 flex-wrap justify-between gap-4">
                              <MarcadorMapa
                                rotulo="Origem"
                                valor={carga.origem}
                              />
                              <MarcadorMapa
                                rotulo="Destino"
                                valor={carga.destino}
                              />
                            </div>

                            <div className="mx-auto w-full max-w-3xl">
                              <div className="relative h-2 rounded-full bg-white/10">
                                <div
                                  className="h-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/40"
                                  style={{ width: `${carga.progresso}%` }}
                                />

                                <div className="absolute left-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-4 border-[#07111F] bg-emerald-400" />

                                <div
                                  className="absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full border-4 border-[#07111F] bg-cyan-300 shadow-xl shadow-cyan-400/50"
                                  style={{
                                    left: `calc(${carga.progresso}% - 14px)`,
                                  }}
                                />

                                <div className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full border-4 border-[#07111F] bg-slate-500" />
                              </div>

                              <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-slate-400">
                                <span>CD Belém</span>
                                <span>Veículo em rota</span>
                                <span>Hospital Central</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <DadoTelemetria
                                rotulo="Latitude"
                                valor={carga.latitude}
                              />
                              <DadoTelemetria
                                rotulo="Longitude"
                                valor={carga.longitude}
                              />
                              <DadoTelemetria
                                rotulo="Progresso"
                                valor={`${carga.progresso}%`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="min-w-0 rounded-xl border border-white/10 bg-[#07111F]/60 p-4">
                          <div className="mb-5">
                            <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                              Dados dos sensores
                            </p>
                            <h4 className="mt-2 text-lg font-black text-white">
                              Baú refrigerado
                            </h4>
                          </div>

                          <div className="space-y-3">
                            <LinhaSensor
                              rotulo="Porta"
                              valor={carga.portaAberta ? "Aberta" : "Fechada"}
                              perigo={carga.portaAberta}
                            />

                            <LinhaSensor
                              rotulo="Vibração"
                              valor={`${carga.vibracao}g`}
                              perigo={carga.vibracao > 0.85}
                            />

                            <LinhaSensor
                              rotulo="Motorista"
                              valor={carga.motorista}
                            />

                            <LinhaSensor rotulo="Rota" valor={carga.rota} />
                          </div>

                          <div className="mt-6 border-t border-white/10 pt-5">
                            <p className="text-sm font-bold text-slate-300">
                              Condição da carga
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-400">
                              O sistema compara os dados recebidos via MQTT com
                              os limites definidos para a carga e registra
                              eventos para auditoria.
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="grid w-full max-w-full min-w-0 grid-cols-1 gap-8 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                      <Painel
                        titulo="Temperatura"
                        subtitulo="Últimas leituras recebidas"
                      >
                        <GraficoTemperatura leituras={historicoTemperatura} />
                      </Painel>

                      <Painel
                        titulo="Cargas ativas"
                        subtitulo="Monitoramento da frota"
                      >
                        <div className="space-y-3">
                          {cargasAtivas.map((cargaAtiva) => (
                            <LinhaCarga
                              key={cargaAtiva.id}
                              cargaAtiva={cargaAtiva}
                            />
                          ))}
                        </div>
                      </Painel>
                    </section>
                  </div>

                  <aside className="min-w-0 space-y-8">
                    <Painel
                      titulo="Alertas"
                      subtitulo="Eventos críticos recentes"
                    >
                      <div className="space-y-3">
                        {alertas.map((alerta) => (
                          <CartaoAlerta key={alerta.id} alerta={alerta} />
                        ))}
                      </div>
                    </Painel>

                    <Painel
                      titulo="Conformidade"
                      subtitulo="Pronto para auditoria"
                    >
                      <div className="space-y-4">
                        <ItemConformidade
                          rotulo="Leituras salvas no RDS"
                          status="Ativo"
                        />
                        <ItemConformidade
                          rotulo="Certificado PDF"
                          status="Pendente"
                        />
                        <ItemConformidade
                          rotulo="Rastro CSV no S3"
                          status="Configurado"
                        />
                        <ItemConformidade
                          rotulo="Alertas via MQTT"
                          status="Ativo"
                        />
                      </div>
                    </Painel>
                  </aside>
                </section>
              </>
            ) : (
              <PaginaInterna
                pagina={paginaAtiva}
                carga={carga}
                cargasAtivas={cargasAtivas}
                historicoTemperatura={historicoTemperatura}
                alertas={alertas}
              />
            )}
          </div>

          <FooterPlataforma horarioAtualizacao={horarioAtualizacao} />
        </main>
      </div>
    </div>
  );
}

function MenuMobile({
  aberto,
  itensMenu,
  paginaAtiva,
  onClose,
  onSelecionarPagina,
  onExportarCsv,
  onGerarCertificado,
  onEnviarNotaFiscal,
}) {
  return (
    <div
      className={`fixed inset-0 z-50 xl:hidden ${
        aberto ? "pointer-events-auto" : "pointer-events-none"
      }`}
      aria-hidden={!aberto}
    >
      <button
        type="button"
        className={`absolute inset-0 bg-black/70 transition-opacity ${
          aberto ? "opacity-100" : "opacity-0"
        }`}
        aria-label="Fechar menu"
        onClick={onClose}
      />

      <aside
        className={`relative flex h-full w-[85vw] max-w-sm flex-col overflow-y-auto border-r border-white/10 bg-[#08111F] p-4 shadow-2xl shadow-black/40 transition-transform duration-300 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={coldChainLogo}
              alt="ColdChain"
              className="h-11 w-11 shrink-0 rounded-2xl object-cover"
            />

            <div className="min-w-0">
              <h1 className="truncate text-xl font-black tracking-tight">
                ColdChain
              </h1>
              <p className="text-xs text-slate-400">Controle Logístico</p>
            </div>
          </div>

          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-slate-300 transition hover:bg-white/5 hover:text-white"
            aria-label="Fechar menu"
            onClick={onClose}
          >
            <IconeMenu nome="fechar" />
          </button>
        </div>

        <nav className="space-y-2">
          {itensMenu.map((item) => (
            <ItemMenu
              key={item.id}
              ativo={paginaAtiva === item.id}
              aberto
              icone={item.icone}
              rotulo={item.rotulo}
              onClick={() => {
                onSelecionarPagina(item.id);
                onClose();
              }}
            />
          ))}
        </nav>

        <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
          <AcaoMenu
            aberto
            icone="arquivo"
            rotulo="Exportar CSV"
            onClick={() => {
              onExportarCsv();
              onClose();
            }}
          />
          <AcaoMenu
            aberto
            destaque
            icone="certificado"
            rotulo="Gerar certificado"
            onClick={() => {
              onGerarCertificado();
              onClose();
            }}
          />
          <AcaoMenu
            aberto
            icone="arquivo"
            rotulo="Enviar nota fiscal"
            onClick={() => {
              onEnviarNotaFiscal();
              onClose();
            }}
          />
        </div>
      </aside>
    </div>
  );
}

function ItemMenu({ rotulo, icone, ativo = false, aberto = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold transition ${
        aberto ? "justify-start" : "justify-center"
      } ${
        ativo
          ? "bg-cyan-400 text-slate-950"
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      }`}
      title={rotulo}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          ativo ? "bg-slate-950/10" : "bg-white/5 text-cyan-300"
        }`}
      >
        <IconeMenu nome={icone} />
      </span>
      {aberto && <span className="min-w-0 leading-5">{rotulo}</span>}
    </button>
  );
}

function AcaoMenu({
  rotulo,
  icone,
  aberto = false,
  destaque = false,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-bold transition ${
        aberto ? "justify-start" : "justify-center"
      } ${
        destaque
          ? "bg-cyan-400 text-slate-950 hover:bg-cyan-300"
          : "border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white"
      }`}
      title={rotulo}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          destaque ? "bg-slate-950/10" : "bg-white/5 text-cyan-300"
        }`}
      >
        <IconeMenu nome={icone} />
      </span>
      {aberto && <span className="min-w-0 leading-5">{rotulo}</span>}
    </button>
  );
}

function HeaderPlataforma({
  pagina,
  carga,
  horarioAtualizacao,
  erroApi,
  carregando,
  onAbrirMenuMobile,
}) {
  const statusTexto = erroApi
    ? "API offline"
    : carregando
      ? "Carregando"
      : "MQTT";

  return (
    <header className="border-b border-white/10 bg-[#0E1729] px-4 py-4 shadow-lg shadow-black/10 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-cyan-300 transition hover:bg-white/[0.07] xl:hidden"
            aria-label="Abrir menu"
            onClick={onAbrirMenuMobile}
          >
            <IconeMenu nome="menu" />
          </button>

          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              ColdChain
            </p>
            <h2 className="mt-1 truncate text-xl font-black tracking-tight text-white sm:text-2xl">
              {pagina.titulo}
            </h2>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block min-w-0 lg:w-72 xl:w-80">
            <span className="sr-only">Buscar</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
              <IconeMenu nome="buscar" />
            </span>
            <input
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-cyan-400/60 focus:bg-white/[0.07]"
              placeholder="Buscar carga, veículo ou rota"
              type="search"
            />
          </label>

          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <button
              type="button"
              className="h-11 min-w-0 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-left text-sm transition hover:bg-white/[0.07]"
            >
              <span className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Carga ativa
              </span>
              <span className="block truncate font-black text-white">
                {carga.id}
              </span>
            </button>

            <span
              className={`flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold ${
                erroApi
                  ? "border-red-400/20 bg-red-400/10 text-red-300"
                  : "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  erroApi ? "bg-red-400" : "bg-emerald-400"
                }`}
              />
              {statusTexto}
            </span>

            <span className="h-11 rounded-xl border border-white/10 px-4 py-3 text-sm text-slate-400">
              {horarioAtualizacao}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

function FooterPlataforma({ horarioAtualizacao }) {
  return (
    <footer className="border-t border-white/10 bg-[#08111F]/80 px-4 py-5 text-sm text-slate-500 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <span>
          <strong className="font-black text-slate-300">ColdChain</strong>
          <span className="ml-2">Painel operacional de demonstração</span>
        </span>

        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <span>Broker MQTT: ativo</span>
          <span>Última sincronização: {horarioAtualizacao}</span>
        </div>
      </div>
    </footer>
  );
}

function PaginaInterna({
  pagina,
  carga,
  cargasAtivas,
  historicoTemperatura,
  alertas,
}) {
  if (pagina === "cargas") {
    return (
      <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
        <Painel titulo="Cargas ativas" subtitulo="Remessas em monitoramento">
          <div>
            {cargasAtivas.map((cargaAtiva) => (
              <LinhaCarga key={cargaAtiva.id} cargaAtiva={cargaAtiva} />
            ))}
          </div>
        </Painel>

        <Painel titulo="Carga selecionada" subtitulo="Resumo da operação">
          <div className="space-y-1">
            <LinhaSensor rotulo="Identificador" valor={carga.id} />
            <LinhaSensor rotulo="Produto" valor={carga.produto} />
            <LinhaSensor rotulo="Cliente" valor={carga.cliente} />
            <LinhaSensor rotulo="Veículo" valor={carga.veiculo} />
            <LinhaSensor rotulo="Status" valor={carga.status} />
          </div>
        </Painel>
      </section>
    );
  }

  if (pagina === "frota") {
    return (
      <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Painel titulo="Rota atual" subtitulo="Progresso do veículo">
          <div className="space-y-6">
            <div className="relative h-3 rounded-full bg-white/10">
              <div
                className="h-3 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/30"
                style={{ width: `${carga.progresso}%` }}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DadoTelemetria rotulo="Origem" valor={carga.origem} />
              <DadoTelemetria rotulo="Destino" valor={carga.destino} />
              <DadoTelemetria
                rotulo="Progresso"
                valor={`${carga.progresso}%`}
              />
            </div>
          </div>
        </Painel>

        <Painel titulo="Dados do veículo" subtitulo="Telemetria de rota">
          <div className="space-y-1">
            <LinhaSensor rotulo="Veículo" valor={carga.veiculo} />
            <LinhaSensor rotulo="Motorista" valor={carga.motorista} />
            <LinhaSensor rotulo="Latitude" valor={carga.latitude} />
            <LinhaSensor rotulo="Longitude" valor={carga.longitude} />
            <LinhaSensor rotulo="Previsão" valor={carga.previsaoChegada} />
          </div>
        </Painel>
      </section>
    );
  }

  if (pagina === "temperatura") {
    return (
      <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Painel
          titulo="Histórico térmico"
          subtitulo="Últimas leituras recebidas"
        >
          <GraficoTemperatura leituras={historicoTemperatura} />
        </Painel>

        <Painel titulo="Limites da carga" subtitulo="Parâmetros de segurança">
          <div className="space-y-1">
            <LinhaSensor
              rotulo="Temperatura atual"
              valor={`${carga.temperatura}°C`}
            />
            <LinhaSensor
              rotulo="Mínimo permitido"
              valor={`${carga.temperaturaMinima}°C`}
            />
            <LinhaSensor
              rotulo="Máximo permitido"
              valor={`${carga.temperaturaMaxima}°C`}
            />
            <LinhaSensor rotulo="Umidade" valor={`${carga.umidade}%`} />
            <LinhaSensor rotulo="Vibração" valor={`${carga.vibracao}g`} />
          </div>
        </Painel>
      </section>
    );
  }

  if (pagina === "conformidade") {
    return (
      <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Painel
          titulo="Checklist de auditoria"
          subtitulo="Evidências da viagem"
        >
          <div className="space-y-1">
            <ItemConformidade rotulo="Leituras salvas no RDS" status="Ativo" />
            <ItemConformidade rotulo="Certificado PDF" status="Pendente" />
            <ItemConformidade
              rotulo="Rastro CSV no S3"
              status="Configurado"
            />
            <ItemConformidade rotulo="Alertas via MQTT" status="Ativo" />
          </div>
        </Painel>

        <Painel titulo="Eventos recentes" subtitulo="Base para conferência">
          <div>
            {alertas.map((alerta) => (
              <CartaoAlerta key={alerta.id} alerta={alerta} />
            ))}
          </div>
        </Painel>
      </section>
    );
  }

  return (
    <section className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-3">
      <Painel titulo="Sensores" subtitulo="Limites operacionais">
        <div className="space-y-1">
          <LinhaSensor
            rotulo="Temperatura mínima"
            valor={`${carga.temperaturaMinima}°C`}
          />
          <LinhaSensor
            rotulo="Temperatura máxima"
            valor={`${carga.temperaturaMaxima}°C`}
          />
          <LinhaSensor rotulo="Alerta de porta" valor="Ativo" />
        </div>
      </Painel>

      <Painel titulo="Integrações" subtitulo="Serviços conectados">
        <div className="space-y-1">
          <ItemConformidade rotulo="Broker MQTT" status="Ativo" />
          <ItemConformidade rotulo="Banco RDS" status="Ativo" />
          <ItemConformidade rotulo="Bucket S3" status="Configurado" />
        </div>
      </Painel>

      <Painel titulo="Operação" subtitulo="Preferências do painel">
        <div className="space-y-1">
          <LinhaSensor rotulo="Atualização automática" valor="5 segundos" />
          <LinhaSensor rotulo="Ambiente" valor="Produção simulada" />
          <LinhaSensor rotulo="Unidade" valor="Celsius" />
        </div>
      </Painel>
    </section>
  );
}

function IconeMenu({ nome }) {
  const icones = {
    painel: (
      <>
        <path d="M4 13h6V4H4v9Z" />
        <path d="M14 20h6V4h-6v16Z" />
        <path d="M4 20h6v-3H4v3Z" />
      </>
    ),
    carga: (
      <>
        <path d="M3 7h11v10H3V7Z" />
        <path d="M14 10h4l3 3v4h-7v-7Z" />
        <path d="M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
      </>
    ),
    frota: (
      <>
        <path d="M4 15V9l4-4h8l4 4v6" />
        <path d="M6 15h12" />
        <path d="M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
        <path d="M8 9h8" />
      </>
    ),
    temperatura: (
      <>
        <path d="M10 14.5V5a2 2 0 0 1 4 0v9.5" />
        <path d="M8 17a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z" />
        <path d="M12 7v10" />
      </>
    ),
    conformidade: (
      <>
        <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    configuracoes: (
      <>
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a7 7 0 0 0-1.8-1L14.4 3h-4.8l-.3 3a7 7 0 0 0-1.8 1L5.1 6l-2 3.5L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a7 7 0 0 0 1.8 1l.3 3h4.8l.3-3a7 7 0 0 0 1.8-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z" />
      </>
    ),
    arquivo: (
      <>
        <path d="M6 3h8l4 4v14H6V3Z" />
        <path d="M14 3v5h4" />
        <path d="M9 14h6" />
        <path d="M9 17h4" />
      </>
    ),
    certificado: (
      <>
        <path d="M7 4h10v11H7V4Z" />
        <path d="M9 8h6" />
        <path d="M9 11h4" />
        <path d="m10 15-2 5 4-2 4 2-2-5" />
      </>
    ),
    buscar: (
      <>
        <path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" />
        <path d="m16 16 5 5" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
    fechar: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6 6 18" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {icones[nome]}
    </svg>
  );
}

function CartaoStatus({ titulo, valor, descricao, perigo = false }) {
  return (
    <div className="px-0 py-4 sm:px-5 lg:first:pl-0 lg:last:pr-0">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {titulo}
      </p>

      <strong
        className={`mt-2 block text-2xl font-black ${
          perigo ? "text-red-300" : "text-white"
        }`}
      >
        {valor}
      </strong>

      <p className="mt-1 text-sm text-slate-400">{descricao}</p>
    </div>
  );
}

function MarcadorMapa({ rotulo, valor }) {
  return (
    <div className="min-w-0 border-l-2 border-cyan-300/70 bg-black/10 px-4 py-2 backdrop-blur">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
        {rotulo}
      </p>
      <p className="mt-1 break-words text-sm font-bold text-white">{valor}</p>
    </div>
  );
}

function DadoTelemetria({ rotulo, valor }) {
  return (
    <div className="border-t border-white/10 bg-black/10 px-1 py-3 backdrop-blur">
      <p className="text-xs text-slate-500">{rotulo}</p>
      <p className="mt-1 font-black text-white">{valor}</p>
    </div>
  );
}

function LinhaSensor({ rotulo, valor, perigo = false }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 py-3 last:border-b-0">
      <span className="min-w-0 text-sm text-slate-400">{rotulo}</span>
      <strong
        className={`min-w-0 break-words text-right ${
          perigo ? "text-red-300" : "text-white"
        }`}
      >
        {valor}
      </strong>
    </div>
  );
}

function Painel({ titulo, subtitulo, children }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#101A2E]/80 p-5">
      <CabecalhoSecao titulo={titulo} subtitulo={subtitulo} />

      <div className="mt-5">{children}</div>
    </section>
  );
}

function CabecalhoSecao({ titulo, subtitulo }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
        {subtitulo}
      </p>
      <h3 className="mt-2 text-xl font-black text-white">{titulo}</h3>
    </div>
  );
}

function GraficoTemperatura({ leituras }) {
  const temperaturaMaximaGrafico = 12;
  const temperaturaMinimaGrafico = 0;

  const pontos = leituras
    .map((leitura, index) => {
      const x = (index / (leituras.length - 1)) * 100;
      const y =
        100 -
        ((leitura.temperatura - temperaturaMinimaGrafico) /
          (temperaturaMaximaGrafico - temperaturaMinimaGrafico)) *
          100;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div>
      <div className="relative h-56">
        <div className="absolute left-0 top-[33%] h-px w-full bg-red-400/30">
          <span className="absolute right-0 -top-7 rounded-full bg-red-500/10 px-2 py-1 text-xs font-bold text-red-300">
            Limite 8°C
          </span>
        </div>

        <div className="absolute left-0 top-[83%] h-px w-full bg-cyan-400/20">
          <span className="absolute right-0 -top-7 rounded-full bg-cyan-500/10 px-2 py-1 text-xs font-bold text-cyan-300">
            Mínimo 2°C
          </span>
        </div>

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full text-cyan-300"
        >
          <polyline
            points={pontos}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="mt-4 flex justify-between gap-2 overflow-x-auto text-xs font-semibold text-slate-500">
        {leituras.map((leitura) => (
          <span key={`${leitura.horario}-${leitura.temperatura}`}>
            {leitura.horario}
          </span>
        ))}
      </div>
    </div>
  );
}

function LinhaCarga({ cargaAtiva }) {
  const emRisco = cargaAtiva.status === "Risco";

  return (
    <div className="border-b border-white/10 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-black text-white">{cargaAtiva.id}</p>
          <p className="mt-1 text-sm text-slate-400">{cargaAtiva.produto}</p>
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-black ${
            emRisco
              ? "bg-red-500/15 text-red-300"
              : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {cargaAtiva.status}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap justify-between gap-3 text-sm text-slate-400">
        <span>{cargaAtiva.veiculo}</span>
        <span>{cargaAtiva.rota}</span>
        <span
          className={
            emRisco ? "font-black text-red-300" : "font-black text-white"
          }
        >
          {cargaAtiva.temperatura}
        </span>
      </div>
    </div>
  );
}

function CartaoAlerta({ alerta }) {
  const critico = alerta.nivel === "critico";

  return (
    <div
      className={`border-l-2 py-3 pl-4 ${
        critico ? "border-red-400" : "border-amber-400"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <strong className={critico ? "text-red-300" : "text-amber-300"}>
          {alerta.titulo}
        </strong>

        <span className="text-xs font-bold text-slate-500">
          {alerta.horario}
        </span>
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {alerta.descricao}
      </p>
    </div>
  );
}

function ItemConformidade({ rotulo, status }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-3 last:border-b-0">
      <span className="text-sm text-slate-400">{rotulo}</span>
      <strong className="text-sm text-cyan-300">{status}</strong>
    </div>
  );
}
