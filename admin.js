/* =====================================================
   admin.js — Painel administrativo completo
===================================================== */

let produtos = carregarProdutos();
let config = carregarConfig();
let categorias = carregarCategorias();
let pedidos = carregarPedidos();
let clientes = carregarClientes();
let funcionarios = carregarFuncionarios();
let cupons = carregarCupons();
let filtroStatus = "";
let buscaPedido = "";
let buscaProduto = "";
let buscaCliente = "";

let idsConhecidos = new Set(pedidos.map(p => p.id));
let audioCtx = null;
let imagemBase64 = null;

async function iniciar() {
  await inicializarSenhaAdmin();

  document.getElementById("subtitLogin").textContent = config.nomeLoja;
  document.title = config.nomeLoja + " - Admin";

  if (sessionStorage.getItem("admin_logado") === "1") {
    await mostrarPainel();
  }

  document.getElementById("formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const senha = document.getElementById("loginSenha").value;
    if (await verificarSenha(senha)) {
      sessionStorage.setItem("admin_logado", "1");
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
      await mostrarPainel();
    } else {
      const erro = document.getElementById("loginErro");
      erro.classList.remove("escondido");
      document.getElementById("loginSenha").value = "";
      document.getElementById("loginSenha").focus();
      setTimeout(() => erro.classList.add("escondido"), 3000);
    }
  });
}

async function mostrarPainel() {
  document.getElementById("telaLogin").classList.add("escondido");
  document.getElementById("painelAdmin").classList.remove("escondido");

  aplicarCor(config.cor);
  const elSidebarNome = document.getElementById("sidebarNome");
  if (elSidebarNome) elSidebarNome.textContent = config.nomeLoja;

  let adminNome = localStorage.getItem("adminNome");
  if (!adminNome) {
    adminNome = prompt("Como quer ser chamado aqui no painel? (ex: Rogério, Maria)") || "Admin";
    localStorage.setItem("adminNome", adminNome);
  }
  const elGreeting = document.getElementById("topbarGreeting");
  if (elGreeting) elGreeting.textContent = "Olá, " + adminNome.split(" ")[0] + " 👋";

  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("sidebar-aberta");
      sidebarOverlay.classList.toggle("ativo");
    });
    sidebarOverlay.addEventListener("click", () => {
      sidebar.classList.remove("sidebar-aberta");
      sidebarOverlay.classList.remove("ativo");
    });
  }

  if (await ehSenhaPadrao()) {
    document.getElementById("bannerSenhaPadrao").classList.remove("escondido");
  }

  document.querySelectorAll(".aba").forEach(btn => {
    btn.addEventListener("click", () => trocarAba(btn.dataset.aba));
  });

  document.getElementById("linkTrocarSenha").addEventListener("click", (e) => {
    e.preventDefault();
    trocarAba("config");
    setTimeout(() => {
      document.getElementById("cardTrocarSenha").scrollIntoView({ behavior: "smooth" });
      document.getElementById("senhaAtual").focus();
    }, 200);
  });

  document.getElementById("btnSair").addEventListener("click", sair);

  document.querySelectorAll("[data-fechar]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.fechar).classList.add("escondido");
    });
  });

  document.getElementById("formProduto").addEventListener("submit", salvarProduto);
  document.getElementById("btnCancelar").addEventListener("click", limparFormProduto);
  document.getElementById("formCategoria").addEventListener("submit", adicionarCategoria);
  document.getElementById("formCupom").addEventListener("submit", adicionarCupom);
  document.getElementById("formFuncionario").addEventListener("submit", adicionarFuncionario);
  document.getElementById("formConfig").addEventListener("submit", salvarConfig);
  document.getElementById("formSenha").addEventListener("submit", trocarSenha);

  document.getElementById("prodImagemArquivo").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      mostrarToast("📷 Processando imagem...");
      imagemBase64 = await resizarImagem(file);
      document.getElementById("prodImagem").value = "";
      previsualizarImagem(imagemBase64);
      mostrarToast("✅ Imagem carregada!");
    } catch (err) { mostrarToast("Erro ao carregar a imagem."); }
  });

  document.getElementById("prodImagem").addEventListener("input", e => {
    imagemBase64 = null;
    document.getElementById("prodImagemArquivo").value = "";
    previsualizarImagem(e.target.value);
  });

  document.getElementById("btnRemoverImagem").addEventListener("click", () => {
    imagemBase64 = null;
    document.getElementById("prodImagem").value = "";
    document.getElementById("prodImagemArquivo").value = "";
    document.getElementById("previewImagem").classList.add("escondido");
  });

  document.getElementById("filtroStatus").addEventListener("change", e => {
    filtroStatus = e.target.value; renderizarPedidos();
  });
  document.getElementById("buscaPedido").addEventListener("input", e => {
    buscaPedido = e.target.value.toLowerCase().trim(); renderizarPedidos();
  });
  document.getElementById("buscaProduto").addEventListener("input", e => {
    buscaProduto = e.target.value.toLowerCase().trim(); renderizarProdutos();
  });
  document.getElementById("buscaCliente").addEventListener("input", e => {
    buscaCliente = e.target.value.toLowerCase().trim(); renderizarClientes();
  });

  renderizarPedidos();
  atualizarDashboard();
  renderizarProdutos();
  renderizarCategoriasOpts();
  renderizarCategoriasLista();
  renderizarCupons();
  renderizarClientes();
  renderizarFuncionarios();
  preencherConfig();
  renderizarHorarios();
  atualizarBadgePedidos();

  window.addEventListener("storage", (e) => {
    if (e.key === "pedidos") verificarNovosPedidos();
  });
  setInterval(verificarNovosPedidos, 5000);

  document.getElementById("cfgPixTipo").value = config.pixTipo || "";
document.getElementById("cfgPixTitular").value = config.pixTitular || "";
document.getElementById("cfgPixChave").value = config.pixChave || "";
}

function sair() {
  if (!confirm("Deseja sair do painel?")) return;
  sessionStorage.removeItem("admin_logado");
  location.reload();
}

function verificarNovosPedidos() {
  const atualizados = carregarPedidos();
  const novos = atualizados.filter(p => !idsConhecidos.has(p.id));
  if (novos.length > 0) {
    pedidos = atualizados;
    novos.forEach(p => idsConhecidos.add(p.id));
    if (document.getElementById("toggleSom").checked) tocarBeep();
    flashTitulo(novos.length);
    mostrarToast(`🔔 ${novos.length} pedido(s) novo(s)!`);
    renderizarPedidos();
    atualizarDashboard();
    atualizarBadgePedidos();
  }
}

function tocarBeep() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return; }
  }
  [0, 0.25].forEach(delay => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.value = 880; osc.type = "sine";
    gain.gain.setValueAtTime(0, audioCtx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + delay + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + 0.2);
    osc.start(audioCtx.currentTime + delay);
    osc.stop(audioCtx.currentTime + delay + 0.25);
  });
}

let tituloOriginal = null;
let intervaloFlash = null;
function flashTitulo(qtd) {
  if (!tituloOriginal) tituloOriginal = document.title;
  clearInterval(intervaloFlash);
  let alterna = true;
  intervaloFlash = setInterval(() => {
    document.title = alterna ? `🔔 (${qtd}) NOVO PEDIDO!` : tituloOriginal;
    alterna = !alterna;
  }, 800);
  window.addEventListener("focus", function pararFlash() {
    clearInterval(intervaloFlash);
    document.title = tituloOriginal;
    window.removeEventListener("focus", pararFlash);
  });
}

function trocarAba(nome) {
  document.querySelectorAll(".aba").forEach(b => b.classList.toggle("ativa", b.dataset.aba === nome));
  document.querySelectorAll(".painel").forEach(p => p.classList.add("escondido"));
  const mapa = {
    pedidos: "painelPedidos", produtos: "painelProdutos",
    categorias: "painelCategorias", cupons: "painelCupons",
    clientes: "painelClientes", funcionarios: "painelFuncionarios",
    config: "painelConfig"
  };
  document.getElementById(mapa[nome]).classList.remove("escondido");

  const titulos = {
    pedidos: "Dashboard & Pedidos", produtos: "Produtos",
    categorias: "Categorias", cupons: "Cupons",
    clientes: "Clientes", funcionarios: "Funcionários", config: "Configurações"
  };
  const elTitulo = document.getElementById("topbarTitulo");
  if (elTitulo) elTitulo.textContent = titulos[nome] || nome;

  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar && sidebar.classList.contains("sidebar-aberta")) {
    sidebar.classList.remove("sidebar-aberta");
    if (overlay) overlay.classList.remove("ativo");
  }

  if (nome === "pedidos") { pedidos = carregarPedidos(); renderizarPedidos(); atualizarDashboard(); }
  if (nome === "clientes") { clientes = carregarClientes(); renderizarClientes(); }
  if (nome === "cupons") { cupons = carregarCupons(); renderizarCupons(); }
  document.querySelector(".admin-content")?.scrollTo({ top: 0, behavior: "smooth" });
}

function atualizarDashboard() {
  const e = estatisticasHoje();
  document.getElementById("dashPedidosHoje").textContent = e.pedidosHoje;
  document.getElementById("dashVendasHoje").textContent = "R$ " + formatarPreco(e.vendasHoje);
  document.getElementById("dashTicket").textContent = "R$ " + formatarPreco(e.ticketMedio);
  document.getElementById("dashPendentes").textContent = e.pendentes;
  renderizarGraficoDash();
  renderizarAtividade();
}

function renderizarGraficoDash() {
  const el = document.getElementById("dashChart");
  if (!el) return;
  const hoje = new Date().toDateString();
  const pedidosHoje = pedidos.filter(p => new Date(p.dataHora).toDateString() === hoje);
  const horas = Array(24).fill(0);
  pedidosHoje.forEach(p => { horas[new Date(p.dataHora).getHours()]++; });
  const horasVisiveis = [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23];
  const max = Math.max(...horasVisiveis.map(h => horas[h]), 1);
  el.innerHTML = horasVisiveis.map(h => {
    const pct = Math.round((horas[h] / max) * 100);
    const atual = new Date().getHours() === h;
    return `<div class="chart-col">
      <div class="chart-bar-wrap">
        <div class="chart-bar${atual ? ' chart-bar-atual' : ''}" style="height:${Math.max(pct,3)}%">
          ${horas[h] > 0 ? `<span class="chart-tip">${horas[h]}</span>` : ""}
        </div>
      </div>
      <span class="chart-label">${h}h</span>
    </div>`;
  }).join("");
  if (pedidosHoje.length === 0) {
    el.innerHTML = `<div class="chart-vazio">Nenhum pedido hoje ainda</div>`;
  }
}

function renderizarAtividade() {
  const el = document.getElementById("dashAtividade");
  if (!el) return;
  const recentes = pedidos.slice(0, 6);
  if (recentes.length === 0) {
    el.innerHTML = "<p class='vazio'>Nenhum pedido ainda.</p>";
    return;
  }
  el.innerHTML = recentes.map(p => `
    <div class="ativ-item">
      <div class="ativ-avatar">${p.cliente.nome.charAt(0).toUpperCase()}</div>
      <div class="ativ-info">
        <span class="ativ-nome">${p.cliente.nome}</span>
        <span class="ativ-val">R$ ${formatarPreco(p.total)}</span>
      </div>
      <span class="badge-status status-${statusClasse(p.status)}">${p.status}</span>
    </div>`).join("");
}

function renderizarPedidos() {
  const lista = document.getElementById("listaPedidos");
  let filtrados = filtroStatus
    ? pedidos.filter(p => p.status === filtroStatus)
    : pedidos.slice();

  if (buscaPedido) {
    filtrados = filtrados.filter(p => {
      const idStr = p.id.toString();
      return p.cliente.nome.toLowerCase().includes(buscaPedido) ||
             p.cliente.telefone.toLowerCase().includes(buscaPedido) ||
             idStr.includes(buscaPedido);
    });
  }

  if (filtrados.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhum pedido encontrado.</p>";
    return;
  }

  lista.innerHTML = "";
  filtrados.forEach(p => {
    const card = document.createElement("div");
    card.className = "card-pedido status-" + statusClasse(p.status);
    const pagamento = p.pagamento || "—";
    const trocoBadge = (p.troco && p.troco.precisa)
      ? `<span class="badge-info">💸 Troco p/ R$ ${formatarPreco(p.troco.valor)}</span>`
      : "";
    const cupomBadge = p.cupom
      ? `<span class="badge-info">🎟️ ${p.cupom.codigo} (-${p.cupom.percentual}%)</span>`
      : "";

    card.innerHTML = `
      <div class="pedido-topo">
        <div>
          <strong>#${p.id.toString().slice(-5)}</strong>
          <span class="badge-status status-${statusClasse(p.status)}">${p.status}</span>
        </div>
        <small>${formatarData(p.dataHora)}</small>
      </div>
      <div class="pedido-corpo">
        <p><strong>${p.cliente.nome}</strong> — ${p.cliente.telefone}</p>
        <p class="pedido-end">📍 ${p.cliente.endereco}</p>
        <p class="pedido-itens">${p.itens.length} item(ns) — <strong>R$ ${formatarPreco(p.total)}</strong></p>
        <p class="pedido-pag">💳 ${pagamento} ${trocoBadge} ${cupomBadge}</p>
      </div>
      <div class="pedido-acoes">
        <button class="btn-mini" data-acao="ver">👁️ Detalhes</button>
        <button class="btn-mini" data-acao="imprimir">🖨️ Imprimir</button>
        ${proximoStatusBotao(p.status)}
      </div>`;
    card.querySelector('[data-acao="ver"]').addEventListener("click", () => abrirDetalhePedido(p.id));
    card.querySelector('[data-acao="imprimir"]').addEventListener("click", () => imprimirPedido(p));
    const btnAvancar = card.querySelector('[data-acao="avancar"]');
    if (btnAvancar) btnAvancar.addEventListener("click", () => avancarStatus(p.id));
    lista.appendChild(card);
  });
}

function statusClasse(status) {
  return {
    "Recebido": "recebido", "Em preparo": "preparo",
    "Saiu para entrega": "entrega", "Finalizado": "final"
  }[status] || "recebido";
}

function proximoStatusBotao(status) {
  const idx = STATUS_PEDIDO.indexOf(status);
  if (idx < 0 || idx >= STATUS_PEDIDO.length - 1) return "";
  return `<button class="btn-mini btn-avancar" data-acao="avancar">→ ${STATUS_PEDIDO[idx + 1]}</button>`;
}


function abrirWhatsAppStatus(p, status = p.status) {
  if (!p || !p.cliente || !p.cliente.telefone) {
    mostrarToast("Este pedido não tem telefone cadastrado.");
    return;
  }

  const mensagens = {
  "Recebido": `Opa, ${p.cliente.nome}! 😄🍕 Seu pedido #${String(p.id).slice(-5)} chegou por aqui! Valeu por pedir com a gente. Daqui a pouquinho vamos preparar tudo com carinho! ❤️`,

  "Em preparo": `Boa, ${p.cliente.nome}! 🍕🔥 Seu pedido #${String(p.id).slice(-5)} já tá sendo preparado! Aguenta só mais um pouquinho que vem coisa boa por aí! 😋`,

  "Saiu para entrega": `Aí sim, ${p.cliente.nome}! 🛵💨 Seu pedido #${String(p.id).slice(-5)} já saiu e tá indo até você! Já pode ir preparando a fome! 😂🍕`,

  "Finalizado": `E aí, ${p.cliente.nome}, tudo certo? 😋🍕 Seu pedido #${String(p.id).slice(-5)} foi finalizado! Obrigado por pedir com a gente. Bom apetite e volte sempre! ❤️🤠`
};

  const telefone = String(p.cliente.telefone).replace(/\D/g, "");
  const telefoneBR = telefone.startsWith("55") ? telefone : "55" + telefone;
  const mensagem = mensagens[status] || `Olá, ${p.cliente.nome}! Atualização do pedido #${String(p.id).slice(-5)}: ${status}.`;
  const url = `https://wa.me/${telefoneBR}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function avancarStatus(id) {
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  const idx = STATUS_PEDIDO.indexOf(p.status);
  if (idx < STATUS_PEDIDO.length - 1) {
    p.status = STATUS_PEDIDO[idx + 1];
    salvarLS("pedidos", pedidos);
    renderizarPedidos(); atualizarDashboard(); atualizarBadgePedidos();
    mostrarToast(`Pedido agora: ${p.status}`);
    abrirWhatsAppStatus(p, p.status);
  }
}

function abrirDetalhePedido(id) {
  const p = pedidos.find(x => x.id === id);
  if (!p) return;

  const itensHtml = p.itens.map(i =>
    `<li>${i.nome} <small>(R$ ${formatarPreco(i.preco)})</small> × ${i.qtd} = <strong>R$ ${formatarPreco(i.preco * i.qtd)}</strong></li>`
  ).join("");

  const pagamento = p.pagamento || "—";
  let pagHtml = `<p>💳 <strong>${pagamento}</strong></p>`;
  if (p.troco) {
    if (p.troco.precisa) {
      pagHtml += `<p class="troco-info">💸 Troco para R$ ${formatarPreco(p.troco.valor)} → levar <strong>R$ ${formatarPreco(p.troco.troco)}</strong></p>`;
    } else {
      pagHtml += `<p class="troco-info">💸 Não precisa de troco</p>`;
    }
  }

  let cupomHtml = "";
  if (p.cupom) {
    cupomHtml = `<p class="cupom-info">🎟️ Cupom usado: <strong>${p.cupom.codigo}</strong> (-${p.cupom.percentual}%)</p>`;
  }

  const corpo = document.getElementById("modalPedidoCorpo");
  corpo.innerHTML = `
    <h2>Pedido #${p.id.toString().slice(-5)}</h2>
    <span class="badge-status status-${statusClasse(p.status)}">${p.status}</span>
    <p class="pedido-data">${formatarData(p.dataHora)}</p>

    <h3>Cliente</h3>
    <p>👤 ${p.cliente.nome}</p>
    <p>📞 ${p.cliente.telefone}</p>
    <p>📍 ${p.cliente.endereco}</p>

    <h3>Itens</h3>
    <ul class="lista-itens-modal">${itensHtml}</ul>

    ${p.observacao ? `<h3>Observação</h3><p class="obs-box">${p.observacao}</p>` : ""}

    <h3>Pagamento</h3>
    ${pagHtml}
    ${cupomHtml}

    <div class="totais-modal">
      <p>Subtotal: R$ ${formatarPreco(p.subtotal)}</p>
      <p>Taxa: R$ ${formatarPreco(p.taxa)}</p>
      ${p.desconto ? `<p>Desconto: − R$ ${formatarPreco(p.desconto)}</p>` : ""}
      <p class="total">Total: R$ ${formatarPreco(p.total)}</p>
    </div>

    <h3>Mudar status</h3>
    <div class="status-botoes">
      ${STATUS_PEDIDO.map(s => `
        <button class="btn-status ${p.status === s ? 'ativo' : ''} status-${statusClasse(s)}"
                data-status="${s}">${s}</button>
      `).join("")}
    </div>

    <div class="acoes-form" style="margin-top:16px; flex-wrap:wrap;">
      <button class="btn-secundario" id="btnFecharModal">Fechar</button>
      <button class="btn-primario" id="btnEnviarWhatsAppStatus">💬 Enviar mensagem ao cliente</button>
      <button class="btn-primario" id="btnImprimirPedido">🖨️ Imprimir cupom</button>
      <button class="btn-excluir" id="btnExcluirPedido">🗑️ Excluir</button>
    </div>`;

  corpo.querySelectorAll(".btn-status").forEach(b => {
    b.addEventListener("click", () => {
      const statusAnterior = p.status;
      const novoStatus = b.dataset.status;
      p.status = novoStatus;
      salvarLS("pedidos", pedidos);
      renderizarPedidos(); atualizarDashboard(); atualizarBadgePedidos();
      abrirDetalhePedido(id);
      mostrarToast(`Status atualizado: ${p.status}`);
      if (novoStatus !== statusAnterior) abrirWhatsAppStatus(p, novoStatus);
    });
  });
  corpo.querySelector("#btnFecharModal").addEventListener("click", () => {
    document.getElementById("modalPedido").classList.add("escondido");
  });
  corpo.querySelector("#btnEnviarWhatsAppStatus").addEventListener("click", () => abrirWhatsAppStatus(p, p.status));
  corpo.querySelector("#btnImprimirPedido").addEventListener("click", () => imprimirPedido(p));
  corpo.querySelector("#btnExcluirPedido").addEventListener("click", () => {
    if (!confirm("Excluir este pedido permanentemente?")) return;
    pedidos = pedidos.filter(x => x.id !== id);
    salvarLS("pedidos", pedidos);
    document.getElementById("modalPedido").classList.add("escondido");
    renderizarPedidos(); atualizarDashboard(); atualizarBadgePedidos();
    mostrarToast("Pedido excluído.");
  });

  document.getElementById("modalPedido").classList.remove("escondido");
}

function atualizarBadgePedidos() {
  const ativos = pedidos.filter(p => p.status !== "Finalizado").length;
  const badge = document.getElementById("badgePedidos");
  if (ativos > 0) { badge.textContent = ativos; badge.style.display = "inline-flex"; }
  else { badge.style.display = "none"; }
}

function imprimirPedido(p) {
  const w = window.open("", "_blank", "width=400,height=700");
  if (!w) { alert("Permita pop-ups neste site para conseguir imprimir."); return; }

  const itensHtml = p.itens.map(i => `
    <tr>
      <td style="vertical-align:top; padding-right:6px;">${i.qtd}x</td>
      <td style="vertical-align:top;">${i.nome}</td>
      <td style="text-align:right; vertical-align:top; white-space:nowrap;">R$ ${formatarPreco(i.preco * i.qtd)}</td>
    </tr>`).join("");

  let pagInfo = "";
  if (p.pagamento) {
    pagInfo += `<p class="info-row"><span class="bold">Pagamento:</span> ${p.pagamento}</p>`;
    if (p.troco) {
      if (p.troco.precisa) {
        pagInfo += `<p class="info-row"><span class="bold">⚠️ Troco para:</span> R$ ${formatarPreco(p.troco.valor)}</p>`;
        pagInfo += `<p class="info-row"><span class="bold">Levar de troco:</span> R$ ${formatarPreco(p.troco.troco)}</p>`;
      } else {
        pagInfo += `<p class="info-row">Não precisa de troco</p>`;
      }
    }
  }
  let cupomInfo = "";
  if (p.cupom) cupomInfo = `<p class="info-row"><span class="bold">Cupom:</span> ${p.cupom.codigo} (-${p.cupom.percentual}%)</p>`;

  w.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Cupom #${p.id.toString().slice(-5)}</title>
<style>
  @page { size: 80mm auto; margin: 4mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', Consolas, monospace; font-size: 12px; width: 72mm; margin: 0; padding: 0; color: #000; }
  h1 { font-size: 16px; text-align: center; margin: 4px 0; }
  h2 { font-size: 13px; text-align: center; margin: 4px 0; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; font-size: 12px; }
  .total-linha { font-size: 15px; text-align: right; font-weight: bold; padding-top: 4px; border-top: 1px solid #000; }
  .center { text-align: center; }
  .obs { background: #f5f5f5; padding: 4px; border: 1px dashed #999; font-style: italic; }
  .bold { font-weight: bold; }
  .info-row { margin: 2px 0; }
</style></head>
<body>
  <h1>${config.nomeLoja || "Pizzaria"}</h1>
  <p class="center">${config.whatsapp ? "Tel: " + config.whatsapp : ""}</p>
  <hr>
  <h2>PEDIDO #${p.id.toString().slice(-5)}</h2>
  <p class="center">${formatarData(p.dataHora)}</p>
  <hr>
  <p class="info-row"><span class="bold">Cliente:</span> ${p.cliente.nome}</p>
  <p class="info-row"><span class="bold">Tel:</span> ${p.cliente.telefone}</p>
  <p class="info-row"><span class="bold">Endereço:</span> ${p.cliente.endereco}</p>
  <hr>
  <table>${itensHtml}</table>
  <hr>
  <table>
    <tr><td>Subtotal:</td><td style="text-align:right;">R$ ${formatarPreco(p.subtotal)}</td></tr>
    <tr><td>Taxa entrega:</td><td style="text-align:right;">R$ ${formatarPreco(p.taxa)}</td></tr>
    ${p.desconto ? `<tr><td>Desconto:</td><td style="text-align:right;">-R$ ${formatarPreco(p.desconto)}</td></tr>` : ""}
    <tr><td colspan="2" class="total-linha">TOTAL: R$ ${formatarPreco(p.total)}</td></tr>
  </table>
  <hr>
  ${pagInfo}
  ${cupomInfo}
  ${p.observacao ? `<hr><p class="bold">OBSERVAÇÃO:</p><div class="obs">${p.observacao}</div>` : ""}
  <hr>
  <p class="center bold">Status: ${p.status}</p>
  <p class="center" style="font-size:10px; margin-top:8px;">--- Obrigado pela preferência! ---</p>
  <script>window.onload = function() { window.print(); setTimeout(function(){window.close();}, 600); };<\/script>
</body></html>`);
  w.document.close();
}

function resizarImagem(file, maxWidth = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function previsualizarImagem(src) {
  const wrap = document.getElementById("previewImagem");
  const img = document.getElementById("previewImg");
  if (!src) { wrap.classList.add("escondido"); return; }
  img.src = src;
  wrap.classList.remove("escondido");
}

function renderizarProdutos() {
  const lista = document.getElementById("listaAdmin");
  lista.innerHTML = "";

  let filtrados = produtos.slice();
  if (buscaProduto) {
    filtrados = filtrados.filter(p =>
      p.nome.toLowerCase().includes(buscaProduto) ||
      (p.descricao || "").toLowerCase().includes(buscaProduto) ||
      (p.categoria || "").toLowerCase().includes(buscaProduto)
    );
  }

  if (filtrados.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhum produto encontrado.</p>";
    return;
  }

  lista.className = "prod-grid";
  filtrados.forEach(p => {
    const card = document.createElement("div");
    card.className = "prod-card" + (p.ativo === false ? " prod-inativo" : "");
    const imgSrc = p.imagem || "";
    card.innerHTML = `
      <div class="prod-card-img">
        <img src="${imgSrc}" alt="${p.nome}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
        <div class="prod-card-sem-img" style="display:none">🍕</div>
        ${p.ativo === false ? '<span class="prod-tag-off">OCULTO</span>' : ""}
        ${p.badge ? `<span class="prod-badge-pill">${p.badge.replace(/[🔥⭐🆕🏷️]/g,"").trim()}</span>` : ""}
      </div>
      <div class="prod-card-corpo">
        <h4 class="prod-card-nome">${p.nome}</h4>
        <p class="prod-card-cat">${p.categoria}</p>
        <p class="prod-card-preco">R$ ${formatarPreco(p.preco)}</p>
      </div>
      <div class="prod-card-acoes">
        <button class="btn-toggle-card" title="${p.ativo === false ? 'Ativar' : 'Desativar'}">
          ${p.ativo === false ? "🔴 Ativar" : "🟢 Ativo"}
        </button>
        <button class="btn-editar-card">✏️ Editar</button>
        <button class="btn-excluir-card">🗑️</button>
      </div>`;
    card.querySelector(".btn-toggle-card").addEventListener("click", () => alternarAtivo(p.id));
    card.querySelector(".btn-editar-card").addEventListener("click", () => editarProduto(p.id));
    card.querySelector(".btn-excluir-card").addEventListener("click", () => excluirProduto(p.id));
    lista.appendChild(card);
  });
}

function alternarAtivo(id) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;
  p.ativo = p.ativo === false ? true : false;
  salvarLS("produtos", produtos);
  renderizarProdutos();
  mostrarToast(p.ativo ? "Produto ativado" : "Produto ocultado do cardápio");
}

function renderizarCategoriasOpts() {
  const sel = document.getElementById("prodCategoria");
  sel.innerHTML = "";
  categorias.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.nome; opt.textContent = c.nome;
    sel.appendChild(opt);
  });
  if (categorias.length === 0) {
    const opt = document.createElement("option");
    opt.value = "Outros"; opt.textContent = "Outros";
    sel.appendChild(opt);
  }
}

function salvarProduto(e) {
  e.preventDefault();
  const id = document.getElementById("produtoId").value;
  const dados = {
    nome: document.getElementById("prodNome").value.trim(),
    descricao: document.getElementById("prodDescricao").value.trim(),
    preco: parseFloat(document.getElementById("prodPreco").value),
    imagem: imagemBase64 || document.getElementById("prodImagem").value.trim(),
    categoria: document.getElementById("prodCategoria").value,
    badge: document.getElementById("prodBadge").value,
    ativo: document.getElementById("prodAtivo").checked
  };
  if (id) {
    const idx = produtos.findIndex(p => p.id === Number(id));
    if (idx >= 0) produtos[idx] = { ...produtos[idx], ...dados };
  } else {
    const novoId = produtos.length > 0 ? Math.max(...produtos.map(p => p.id)) + 1 : 1;
    produtos.push({ id: novoId, ...dados });
  }
  salvarLS("produtos", produtos);
  limparFormProduto();
  renderizarProdutos();
  mostrarToast("✅ Produto salvo!");
}

function editarProduto(id) {
  const p = produtos.find(x => x.id === id);
  if (!p) return;
  document.getElementById("produtoId").value = p.id;
  document.getElementById("prodNome").value = p.nome;
  document.getElementById("prodDescricao").value = p.descricao;
  document.getElementById("prodPreco").value = p.preco;
  imagemBase64 = null;
  document.getElementById("prodImagem").value = p.imagem && p.imagem.startsWith("data:") ? "" : (p.imagem || "");
  document.getElementById("prodBadge").value = p.badge || "";
  document.getElementById("prodAtivo").checked = p.ativo !== false;
  previsualizarImagem(p.imagem);

  if (!categorias.find(c => c.nome === p.categoria)) {
    const opt = document.createElement("option");
    opt.value = p.categoria; opt.textContent = p.categoria;
    document.getElementById("prodCategoria").appendChild(opt);
  }
  document.getElementById("prodCategoria").value = p.categoria;
  document.getElementById("tituloForm").textContent = "Editar Produto";
  document.getElementById("btnCancelar").classList.remove("escondido");
  document.getElementById("formProduto").scrollIntoView({ behavior: "smooth" });
}

function excluirProduto(id) {
  if (!confirm("Excluir este produto?")) return;
  produtos = produtos.filter(p => p.id !== id);
  salvarLS("produtos", produtos);
  renderizarProdutos();
  mostrarToast("Produto excluído.");
}

function limparFormProduto() {
  document.getElementById("formProduto").reset();
  document.getElementById("produtoId").value = "";
  document.getElementById("prodAtivo").checked = true;
  document.getElementById("tituloForm").textContent = "Adicionar Novo Produto";
  document.getElementById("btnCancelar").classList.add("escondido");
  imagemBase64 = null;
  document.getElementById("prodImagemArquivo").value = "";
  document.getElementById("prodBadge").value = "";
  document.getElementById("previewImagem").classList.add("escondido");
}

function renderizarCategoriasLista() {
  const lista = document.getElementById("listaCategorias");
  lista.innerHTML = "";
  if (categorias.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhuma categoria cadastrada.</p>";
    return;
  }
  const CORES_CAT = ["#e74c3c","#e67e22","#f1c40f","#2ecc71","#3498db","#9b59b6","#1abc9c","#e91e63","#00bcd4","#ff5722"];
  lista.className = "cat-chips-grid";
  categorias.forEach((c, idx) => {
    const qtd = produtos.filter(p => p.categoria === c.nome).length;
    const cor = CORES_CAT[idx % CORES_CAT.length];
    const chip = document.createElement("div");
    chip.className = "cat-chip";
    chip.style.borderColor = cor;
    chip.innerHTML = `
      <div class="cat-chip-topo">
        <span class="cat-chip-dot" style="background:${cor}"></span>
        <span class="cat-chip-nome">${c.nome}</span>
        <span class="cat-chip-qtd" style="background:${cor}20;color:${cor}">${qtd} item${qtd !== 1 ? "s" : ""}</span>
      </div>
      <div class="cat-chip-acoes">
        <button class="btn-mini" data-acao="cima" ${idx === 0 ? "disabled" : ""} title="Mover para cima">↑</button>
        <button class="btn-mini" data-acao="baixo" ${idx === categorias.length - 1 ? "disabled" : ""} title="Mover para baixo">↓</button>
        <button class="btn-excluir-sm" data-acao="del" title="Remover">✕</button>
      </div>`;
    chip.querySelector('[data-acao="cima"]').addEventListener("click", () => moverCategoria(idx, -1));
    chip.querySelector('[data-acao="baixo"]').addEventListener("click", () => moverCategoria(idx, +1));
    chip.querySelector('[data-acao="del"]').addEventListener("click", () => removerCategoria(c.id));
    lista.appendChild(chip);
  });
}

function moverCategoria(idx, delta) {
  const novo = idx + delta;
  if (novo < 0 || novo >= categorias.length) return;
  [categorias[idx], categorias[novo]] = [categorias[novo], categorias[idx]];
  salvarLS("categorias", categorias);
  renderizarCategoriasLista();
}

function adicionarCategoria(e) {
  e.preventDefault();
  const nome = document.getElementById("catNome").value.trim();
  if (!nome) return;
  if (categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase())) {
    mostrarToast("Essa categoria já existe."); return;
  }
  const novoId = categorias.length > 0 ? Math.max(...categorias.map(c => c.id)) + 1 : 1;
  categorias.push({ id: novoId, nome });
  salvarLS("categorias", categorias);
  document.getElementById("formCategoria").reset();
  renderizarCategoriasLista();
  renderizarCategoriasOpts();
  mostrarToast("✅ Categoria adicionada!");
}

function removerCategoria(id) {
  const cat = categorias.find(c => c.id === id);
  if (!cat) return;
  if (!confirm(`Remover a categoria "${cat.nome}"? Os produtos dela vão para "Outros".`)) return;

  produtos.forEach(p => { if (p.categoria === cat.nome) p.categoria = "Outros"; });
  salvarLS("produtos", produtos);

  if (!categorias.find(c => c.nome === "Outros") && produtos.some(p => p.categoria === "Outros")) {
    const novoId = Math.max(...categorias.map(c => c.id), 0) + 1;
    categorias.push({ id: novoId, nome: "Outros" });
  }
  categorias = categorias.filter(c => c.id !== id);
  salvarLS("categorias", categorias);

  renderizarCategoriasLista();
  renderizarCategoriasOpts();
  renderizarProdutos();
  mostrarToast("Categoria removida.");
}

function renderizarCupons() {
  const lista = document.getElementById("listaCupons");
  lista.innerHTML = "";
  if (cupons.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhum cupom cadastrado.</p>";
    return;
  }
  lista.className = "cupons-lista";
  cupons.forEach(c => {
    const ticket = document.createElement("div");
    ticket.className = "cupom-ticket" + (c.ativo ? "" : " cupom-ticket-inativo");
    ticket.innerHTML = `
      <div class="ticket-esq">
        <span class="ticket-pct">${c.percentual}%</span>
        <span class="ticket-off">OFF</span>
      </div>
      <div class="ticket-sep"><span></span></div>
      <div class="ticket-dir">
        <code class="ticket-codigo">${c.codigo}</code>
        <span class="ticket-min">${c.minimo ? `Mín. R$ ${formatarPreco(c.minimo)}` : "Sem pedido mínimo"}</span>
        <span class="${c.ativo ? "tag-on" : "tag-off"}">${c.ativo ? "✓ Ativo" : "✗ Pausado"}</span>
      </div>
      <div class="ticket-acoes">
        <button class="btn-mini" data-acao="toggle" title="${c.ativo ? 'Pausar' : 'Ativar'}">${c.ativo ? "⏸ Pausar" : "▶ Ativar"}</button>
        <button class="btn-excluir-sm" data-acao="del" title="Remover">✕</button>
      </div>`;
    ticket.querySelector('[data-acao="toggle"]').addEventListener("click", () => alternarCupom(c.id));
    ticket.querySelector('[data-acao="del"]').addEventListener("click", () => removerCupom(c.id));
    lista.appendChild(ticket);
  });
}

function adicionarCupom(e) {
  e.preventDefault();
  const codigo = document.getElementById("cupCodigo").value.trim().toUpperCase().replace(/\s+/g, "");
  const percentual = parseInt(document.getElementById("cupPercentual").value);
  const minimo = parseFloat(document.getElementById("cupMinimo").value) || 0;

  if (!codigo || percentual < 1 || percentual > 90) {
    mostrarToast("Código e desconto válidos são obrigatórios."); return;
  }
  if (cupons.find(c => c.codigo.toUpperCase() === codigo)) {
    mostrarToast("Já existe um cupom com esse código."); return;
  }
  const novoId = cupons.length > 0 ? Math.max(...cupons.map(c => c.id)) + 1 : 1;
  cupons.push({
    id: novoId, codigo, percentual, minimo, ativo: true,
    criadoEm: new Date().toISOString()
  });
  salvarCupons(cupons);
  document.getElementById("formCupom").reset();
  renderizarCupons();
  mostrarToast(`✅ Cupom ${codigo} criado!`);
}

function alternarCupom(id) {
  const c = cupons.find(x => x.id === id);
  if (!c) return;
  c.ativo = !c.ativo;
  salvarCupons(cupons);
  renderizarCupons();
  mostrarToast(c.ativo ? "Cupom ativado" : "Cupom desativado");
}

function removerCupom(id) {
  if (!confirm("Remover este cupom permanentemente?")) return;
  cupons = cupons.filter(c => c.id !== id);
  salvarCupons(cupons);
  renderizarCupons();
  mostrarToast("Cupom removido.");
}

function renderizarClientes() {
  const lista = document.getElementById("listaClientes");
  lista.innerHTML = "";

  let filtrados = clientes.slice();
  if (buscaCliente) {
    filtrados = filtrados.filter(c =>
      c.nome.toLowerCase().includes(buscaCliente) ||
      c.telefone.toLowerCase().includes(buscaCliente)
    );
  }

  if (filtrados.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhum cliente encontrado.</p>";
    return;
  }

  lista.className = "clientes-lista";
  filtrados.forEach(c => {
    const meusPedidos = pedidos.filter(p => p.cliente.telefone === c.telefone);
    const totalGasto = meusPedidos.reduce((s, p) => s + (p.total || 0), 0);
    const ultimo = meusPedidos[0];

    const card = document.createElement("div");
    card.className = "cliente-card";
    card.innerHTML = `
      <div class="cliente-avatar">${c.nome.charAt(0).toUpperCase()}</div>
      <div class="cliente-info">
        <h4 class="cliente-nome">${c.nome}</h4>
        <p class="cliente-tel">📞 ${c.telefone}</p>
        <p class="cliente-end">📍 ${c.endereco}</p>
        ${ultimo ? `<p class="cliente-ultimo">Último pedido: ${formatarData(ultimo.dataHora)}</p>` : ""}
      </div>
      <div class="cliente-stats">
        <div class="cliente-stat">
          <span class="cstat-val">${meusPedidos.length}</span>
          <span class="cstat-label">pedidos</span>
        </div>
        <div class="cliente-stat verde">
          <span class="cstat-val">R$ ${formatarPreco(totalGasto)}</span>
          <span class="cstat-label">total gasto</span>
        </div>
      </div>`;
    lista.appendChild(card);
  });
}

function renderizarFuncionarios() {
  const lista = document.getElementById("listaFuncionarios");
  lista.innerHTML = "";
  if (funcionarios.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhum funcionário cadastrado.</p>";
    return;
  }
  const CORES_FUNCAO = { "Atendente":"#2196F3","Pizzaiolo":"#FF5722","Entregador":"#9C27B0","Caixa":"#4CAF50","Gerente":"#FF9800" };
  lista.className = "func-grid";
  funcionarios.forEach(f => {
    const cor = CORES_FUNCAO[f.funcao] || "#607D8B";
    const card = document.createElement("div");
    card.className = "func-card";
    card.innerHTML = `
      <div class="func-avatar" style="background:${cor}">${f.nome.charAt(0).toUpperCase()}</div>
      <div class="func-info">
        <h4 class="func-nome">${f.nome}</h4>
        <span class="func-badge" style="background:${cor}18;color:${cor};border-color:${cor}40">${f.funcao}</span>
        ${f.telefone ? `<p class="func-tel">📞 ${f.telefone}</p>` : ""}
      </div>
      <button class="btn-excluir-sm func-del" title="Remover">✕</button>`;
    card.querySelector(".func-del").addEventListener("click", () => removerFuncionario(f.id));
    lista.appendChild(card);
  });
}

function adicionarFuncionario(e) {
  e.preventDefault();
  const dados = {
    nome: document.getElementById("funcNome").value.trim(),
    funcao: document.getElementById("funcFuncao").value,
    telefone: document.getElementById("funcTelefone").value.trim()
  };
  const novoId = funcionarios.length > 0 ? Math.max(...funcionarios.map(f => f.id)) + 1 : 1;
  funcionarios.push({ id: novoId, ...dados });
  salvarLS("funcionarios", funcionarios);
  document.getElementById("formFuncionario").reset();
  renderizarFuncionarios();
  mostrarToast("✅ Funcionário adicionado!");
}

function removerFuncionario(id) {
  if (!confirm("Remover este funcionário?")) return;
  funcionarios = funcionarios.filter(f => f.id !== id);
  salvarLS("funcionarios", funcionarios);
  renderizarFuncionarios();
  mostrarToast("Funcionário removido.");
}

function preencherConfig() {
  document.getElementById("cfgNome").value = config.nomeLoja || "";
  document.getElementById("cfgDescricao").value = config.descricao || "";
  document.getElementById("cfgEndereco").value = config.endereco || "";
  document.getElementById("cfgWhatsapp").value = config.whatsapp || "";
  document.getElementById("cfgInstagram").value = config.instagram || "";
  document.getElementById("cfgFacebook").value = config.facebook || "";
  document.getElementById("cfgTaxa").value = config.taxa;
  document.getElementById("cfgMinimo").value = config.minimo;
  document.getElementById("cfgCor").value = config.cor;
}

function renderizarHorarios() {
  const wrap = document.getElementById("horariosLista");
  wrap.innerHTML = "";
  DIAS_SEMANA.forEach(d => {
    const h = config.horarios[d.key];
    const linha = document.createElement("div");
    linha.className = "horario-linha";
    linha.innerHTML = `
      <div class="horario-dia">${d.nome}</div>
      <label class="horario-fechado">
        <input type="checkbox" data-fechado="${d.key}" ${h.fechado ? "checked" : ""} /> Fechado
      </label>
      <input type="time" data-abre="${d.key}" value="${h.abre}" ${h.fechado ? "disabled" : ""} />
      <span>até</span>
      <input type="time" data-fecha="${d.key}" value="${h.fecha}" ${h.fechado ? "disabled" : ""} />`;
    linha.querySelector(`[data-fechado="${d.key}"]`).addEventListener("change", e => {
      const dis = e.target.checked;
      linha.querySelector(`[data-abre="${d.key}"]`).disabled = dis;
      linha.querySelector(`[data-fecha="${d.key}"]`).disabled = dis;
    });
    wrap.appendChild(linha);
  });
}

function lerHorariosForm() {
  const horarios = {};
  DIAS_SEMANA.forEach(d => {
    horarios[d.key] = {
      fechado: document.querySelector(`[data-fechado="${d.key}"]`).checked,
      abre: document.querySelector(`[data-abre="${d.key}"]`).value || "18:00",
      fecha: document.querySelector(`[data-fecha="${d.key}"]`).value || "23:00"
    };
  });
  return horarios;
}

function salvarConfig(e) {
  e.preventDefault();
  config = {
    nomeLoja: document.getElementById("cfgNome").value.trim(),
    descricao: document.getElementById("cfgDescricao").value.trim(),
    endereco: document.getElementById("cfgEndereco").value.trim(),
    whatsapp: document.getElementById("cfgWhatsapp").value.trim(),
    instagram: document.getElementById("cfgInstagram").value.trim(),
    facebook: document.getElementById("cfgFacebook").value.trim(),
    pixTipo: document.getElementById("cfgPixTipo").value,
    pixTitular: document.getElementById("cfgPixTitular").value.trim(),
    pixChave: document.getElementById("cfgPixChave").value.trim(),
    taxa: parseFloat(document.getElementById("cfgTaxa").value),
    minimo: parseFloat(document.getElementById("cfgMinimo").value),
    cor: document.getElementById("cfgCor").value,
    horarios: lerHorariosForm()
  };
  salvarLS("config", config);
  aplicarCor(config.cor);
  const elSN = document.getElementById("sidebarNome");
  if (elSN) elSN.textContent = config.nomeLoja;
  mostrarToast("✅ Configurações salvas!");
}

async function trocarSenha(e) {
  e.preventDefault();
  const erro = document.getElementById("erroSenha");
  erro.classList.add("escondido");
  const atual = document.getElementById("senhaAtual").value;
  const nova = document.getElementById("senhaNova").value;
  const conf = document.getElementById("senhaConfirma").value;

  if (!(await verificarSenha(atual))) { erro.textContent = "❌ Senha atual incorreta."; erro.classList.remove("escondido"); return; }
  if (nova !== conf) { erro.textContent = "❌ A nova senha e a confirmação não são iguais."; erro.classList.remove("escondido"); return; }
  if (nova.length < 4) { erro.textContent = "❌ A nova senha precisa ter pelo menos 4 caracteres."; erro.classList.remove("escondido"); return; }
  if (nova === atual) { erro.textContent = "❌ A nova senha deve ser diferente da atual."; erro.classList.remove("escondido"); return; }

  await salvarNovaSenha(nova);
  document.getElementById("formSenha").reset();
  document.getElementById("bannerSenhaPadrao").classList.add("escondido");
  mostrarToast("🔒 Senha alterada com sucesso!");
}

iniciar();
