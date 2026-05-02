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

/* -----------------------------------------------------
   Início → tela de login
----------------------------------------------------- */
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
  document.getElementById("adminLogo").textContent = "Admin - " + config.nomeLoja;

  if (await ehSenhaPadrao()) {
    document.getElementById("bannerSenhaPadrao").classList.remove("escondido");
  }

  // Abas
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

  // Forms
  document.getElementById("formProduto").addEventListener("submit", salvarProduto);
  document.getElementById("btnCancelar").addEventListener("click", limparFormProduto);
  document.getElementById("formCategoria").addEventListener("submit", adicionarCategoria);
  document.getElementById("formCupom").addEventListener("submit", adicionarCupom);
  document.getElementById("formFuncionario").addEventListener("submit", adicionarFuncionario);
  document.getElementById("formConfig").addEventListener("submit", salvarConfig);
  document.getElementById("formSenha").addEventListener("submit", trocarSenha);

  // Filtros / buscas
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

  // Render inicial
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

  // Polling de pedidos novos
  window.addEventListener("storage", (e) => {
    if (e.key === "pedidos") verificarNovosPedidos();
  });
  setInterval(verificarNovosPedidos, 5000);
}

function sair() {
  if (!confirm("Deseja sair do painel?")) return;
  sessionStorage.removeItem("admin_logado");
  location.reload();
}

/* -----------------------------------------------------
   Detectar pedido novo + beep + flash
----------------------------------------------------- */
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

/* -----------------------------------------------------
   Trocar aba
----------------------------------------------------- */
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

  if (nome === "pedidos") { pedidos = carregarPedidos(); renderizarPedidos(); atualizarDashboard(); }
  if (nome === "clientes") { clientes = carregarClientes(); renderizarClientes(); }
  if (nome === "cupons") { cupons = carregarCupons(); renderizarCupons(); }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =====================================================
   📊 DASHBOARD
===================================================== */
function atualizarDashboard() {
  const e = estatisticasHoje();
  document.getElementById("dashPedidosHoje").textContent = e.pedidosHoje;
  document.getElementById("dashVendasHoje").textContent = "R$ " + formatarPreco(e.vendasHoje);
  document.getElementById("dashTicket").textContent = "R$ " + formatarPreco(e.ticketMedio);
  document.getElementById("dashPendentes").textContent = e.pendentes;
}

/* =====================================================
   📦 PEDIDOS
===================================================== */
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

function avancarStatus(id) {
  const p = pedidos.find(x => x.id === id);
  if (!p) return;
  const idx = STATUS_PEDIDO.indexOf(p.status);
  if (idx < STATUS_PEDIDO.length - 1) {
    p.status = STATUS_PEDIDO[idx + 1];
    salvarLS("pedidos", pedidos);
    renderizarPedidos(); atualizarDashboard(); atualizarBadgePedidos();
    mostrarToast(`Pedido agora: ${p.status}`);
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
      <button class="btn-primario" id="btnImprimirPedido">🖨️ Imprimir cupom</button>
      <button class="btn-excluir" id="btnExcluirPedido">🗑️ Excluir</button>
    </div>`;

  corpo.querySelectorAll(".btn-status").forEach(b => {
    b.addEventListener("click", () => {
      p.status = b.dataset.status;
      salvarLS("pedidos", pedidos);
      renderizarPedidos(); atualizarDashboard(); atualizarBadgePedidos();
      abrirDetalhePedido(id);
      mostrarToast(`Status atualizado: ${p.status}`);
    });
  });
  corpo.querySelector("#btnFecharModal").addEventListener("click", () => {
    document.getElementById("modalPedido").classList.add("escondido");
  });
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

/* =====================================================
   🖨️ IMPRESSÃO 80mm — agora inclui pagamento e cupom
===================================================== */
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
  <script>window.onload = function() { window.print(); setTimeout(function(){window.close();}, 600); };</script>
</body></html>`);
  w.document.close();
}

/* =====================================================
   🍕 PRODUTOS (com busca e ativo/inativo)
===================================================== */
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

  filtrados.forEach(p => {
    const linha = document.createElement("div");
    linha.className = "linha-admin" + (p.ativo === false ? " inativo" : "");
    linha.innerHTML = `
      <img src="${p.imagem}" alt="${p.nome}"
           onerror="this.src='https://via.placeholder.com/100?text=Sem+Imagem'" />
      <div class="linha-info">
        <h4>${p.nome} ${p.ativo === false ? '<span class="tag-off">OCULTO</span>' : ""}</h4>
        <small>${p.categoria} - R$ ${formatarPreco(p.preco)}</small>
      </div>
      <div class="linha-acoes">
        <button class="btn-toggle" title="${p.ativo === false ? 'Ativar (mostrar no cardápio)' : 'Desativar (ocultar)'}">
          ${p.ativo === false ? "🔴" : "🟢"}
        </button>
        <button class="btn-editar">Editar</button>
        <button class="btn-excluir">Excluir</button>
      </div>`;
    linha.querySelector(".btn-toggle").addEventListener("click", () => alternarAtivo(p.id));
    linha.querySelector(".btn-editar").addEventListener("click", () => editarProduto(p.id));
    linha.querySelector(".btn-excluir").addEventListener("click", () => excluirProduto(p.id));
    lista.appendChild(linha);
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
    imagem: document.getElementById("prodImagem").value.trim(),
    categoria: document.getElementById("prodCategoria").value,
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
  document.getElementById("prodImagem").value = p.imagem;
  document.getElementById("prodAtivo").checked = p.ativo !== false;

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
}

/* =====================================================
   🏷️ CATEGORIAS — com reordenação
===================================================== */
function renderizarCategoriasLista() {
  const lista = document.getElementById("listaCategorias");
  lista.innerHTML = "";
  if (categorias.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhuma categoria cadastrada.</p>";
    return;
  }
  categorias.forEach((c, idx) => {
    const qtd = produtos.filter(p => p.categoria === c.nome).length;
    const linha = document.createElement("div");
    linha.className = "linha-admin";
    linha.innerHTML = `
      <div class="cat-icon">🏷️</div>
      <div class="linha-info">
        <h4>${c.nome}</h4>
        <small>${qtd} produto(s)</small>
      </div>
      <div class="linha-acoes">
        <button class="btn-mini" data-acao="cima" ${idx === 0 ? "disabled" : ""}>↑</button>
        <button class="btn-mini" data-acao="baixo" ${idx === categorias.length - 1 ? "disabled" : ""}>↓</button>
        <button class="btn-excluir" data-acao="del">Remover</button>
      </div>`;
    linha.querySelector('[data-acao="cima"]').addEventListener("click", () => moverCategoria(idx, -1));
    linha.querySelector('[data-acao="baixo"]').addEventListener("click", () => moverCategoria(idx, +1));
    linha.querySelector('[data-acao="del"]').addEventListener("click", () => removerCategoria(c.id));
    lista.appendChild(linha);
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

/* =====================================================
   🎟️ CUPONS
===================================================== */
function renderizarCupons() {
  const lista = document.getElementById("listaCupons");
  lista.innerHTML = "";
  if (cupons.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhum cupom cadastrado.</p>";
    return;
  }
  cupons.forEach(c => {
    const linha = document.createElement("div");
    linha.className = "linha-admin" + (c.ativo ? "" : " inativo");
    linha.innerHTML = `
      <div class="cat-icon">🎟️</div>
      <div class="linha-info">
        <h4><code class="cupom-codigo">${c.codigo}</code> ${c.ativo ? '<span class="tag-on">ATIVO</span>' : '<span class="tag-off">INATIVO</span>'}</h4>
        <small><strong>${c.percentual}%</strong> de desconto${c.minimo ? ` · pedido mínimo R$ ${formatarPreco(c.minimo)}` : ""}</small>
      </div>
      <div class="linha-acoes">
        <button class="btn-mini" data-acao="toggle">${c.ativo ? "Desativar" : "Ativar"}</button>
        <button class="btn-excluir" data-acao="del">Remover</button>
      </div>`;
    linha.querySelector('[data-acao="toggle"]').addEventListener("click", () => alternarCupom(c.id));
    linha.querySelector('[data-acao="del"]').addEventListener("click", () => removerCupom(c.id));
    lista.appendChild(linha);
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

/* =====================================================
   👤 CLIENTES
===================================================== */
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

  filtrados.forEach(c => {
    const meusPedidos = pedidos.filter(p => p.cliente.telefone === c.telefone);
    const totalGasto = meusPedidos.reduce((s, p) => s + (p.total || 0), 0);
    const ultimo = meusPedidos[0]; // pedidos mais recentes vêm primeiro

    const linha = document.createElement("div");
    linha.className = "linha-admin";
    linha.innerHTML = `
      <div class="cat-icon">👤</div>
      <div class="linha-info">
        <h4>${c.nome}</h4>
        <small>📞 ${c.telefone}</small><br>
        <small>📍 ${c.endereco}</small><br>
        <small><strong>${meusPedidos.length}</strong> pedido(s) · Total gasto: <strong>R$ ${formatarPreco(totalGasto)}</strong></small>
        ${ultimo ? `<br><small>Último: ${formatarData(ultimo.dataHora)}</small>` : ""}
      </div>`;
    lista.appendChild(linha);
  });
}

/* =====================================================
   👷 FUNCIONÁRIOS
===================================================== */
function renderizarFuncionarios() {
  const lista = document.getElementById("listaFuncionarios");
  lista.innerHTML = "";
  if (funcionarios.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhum funcionário cadastrado.</p>";
    return;
  }
  funcionarios.forEach(f => {
    const linha = document.createElement("div");
    linha.className = "linha-admin";
    linha.innerHTML = `
      <div class="cat-icon">👷</div>
      <div class="linha-info">
        <h4>${f.nome}</h4>
        <small>${f.funcao}${f.telefone ? " · 📞 " + f.telefone : ""}</small>
      </div>
      <div class="linha-acoes">
        <button class="btn-excluir">Remover</button>
      </div>`;
    linha.querySelector(".btn-excluir").addEventListener("click", () => removerFuncionario(f.id));
    lista.appendChild(linha);
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

/* =====================================================
   ⚙️ CONFIGURAÇÕES
===================================================== */
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
    taxa: parseFloat(document.getElementById("cfgTaxa").value),
    minimo: parseFloat(document.getElementById("cfgMinimo").value),
    cor: document.getElementById("cfgCor").value,
    horarios: lerHorariosForm()
  };
  salvarLS("config", config);
  aplicarCor(config.cor);
  document.getElementById("adminLogo").textContent = "Admin - " + config.nomeLoja;
  mostrarToast("✅ Configurações salvas!");
}

/* =====================================================
   🔑 TROCAR SENHA
===================================================== */
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
