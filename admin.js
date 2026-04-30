/* =====================================================
   admin.js — Painel administrativo completo
   Abas: Pedidos, Produtos, Categorias, Clientes,
         Funcionários, Configurações
===================================================== */

// Estado em memória (carregado do LocalStorage)
const logado = localStorage.getItem("logado");

if (logado !== "true") {
  window.location.href = "login.html";
}


let produtos = carregarProdutos();
let config = carregarConfig();
let categorias = carregarCategorias();
let pedidos = carregarPedidos();
let clientes = carregarClientes();
let funcionarios = carregarFuncionarios();
let filtroStatus = "";

/* -----------------------------------------------------
   Inicialização geral
----------------------------------------------------- */
function iniciar() {
  aplicarCor(config.cor);
  document.getElementById("adminLogo").textContent = "Admin - " + config.nomeLoja;

  // Trocar de aba
  document.querySelectorAll(".aba").forEach(btn => {
    btn.addEventListener("click", () => trocarAba(btn.dataset.aba));
  });

  // Fechar modais
  document.querySelectorAll("[data-fechar]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.fechar).classList.add("escondido");
    });
  });

  // Forms
  document.getElementById("formProduto").addEventListener("submit", salvarProduto);
  document.getElementById("btnCancelar").addEventListener("click", limparFormProduto);
  document.getElementById("formCategoria").addEventListener("submit", adicionarCategoria);
  document.getElementById("formFuncionario").addEventListener("submit", adicionarFuncionario);
  document.getElementById("formConfig").addEventListener("submit", salvarConfig);
  document.getElementById("filtroStatus").addEventListener("change", e => {
    filtroStatus = e.target.value;
    renderizarPedidos();
  });

  // Renderiza tudo
  renderizarPedidos();
  renderizarProdutos();
  renderizarCategoriasOpts();
  renderizarCategoriasLista();
  renderizarClientes();
  renderizarFuncionarios();
  preencherConfig();
  atualizarBadgePedidos();
}

/* -----------------------------------------------------
   Trocar aba ativa
----------------------------------------------------- */
function trocarAba(nome) {
  document.querySelectorAll(".aba").forEach(b => b.classList.toggle("ativa", b.dataset.aba === nome));
  document.querySelectorAll(".painel").forEach(p => p.classList.add("escondido"));
  const mapa = {
    pedidos: "painelPedidos",
    produtos: "painelProdutos",
    categorias: "painelCategorias",
    clientes: "painelClientes",
    funcionarios: "painelFuncionarios",
    config: "painelConfig"
  };
  document.getElementById(mapa[nome]).classList.remove("escondido");
  // Recarrega dados que podem ter mudado
  if (nome === "pedidos") { pedidos = carregarPedidos(); renderizarPedidos(); }
  if (nome === "clientes") { clientes = carregarClientes(); renderizarClientes(); }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/* =====================================================
   📦 PEDIDOS
===================================================== */
function renderizarPedidos() {
  const lista = document.getElementById("listaPedidos");
  const filtrados = filtroStatus
    ? pedidos.filter(p => p.status === filtroStatus)
    : pedidos;

  if (filtrados.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhum pedido " +
      (filtroStatus ? `com status "${filtroStatus}"` : "ainda") + ".</p>";
    return;
  }

  lista.innerHTML = "";
  filtrados.forEach(p => {
    const card = document.createElement("div");
    card.className = "card-pedido status-" + statusClasse(p.status);
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
      </div>
      <div class="pedido-acoes">
        <button class="btn-mini" data-acao="ver">👁️ Detalhes</button>
        ${proximoStatusBotao(p.status)}
      </div>
    `;
    card.querySelector('[data-acao="ver"]').addEventListener("click", () => abrirDetalhePedido(p.id));
    const btnAvancar = card.querySelector('[data-acao="avancar"]');
    if (btnAvancar) btnAvancar.addEventListener("click", () => avancarStatus(p.id));
    lista.appendChild(card);
  });
}

function statusClasse(status) {
  return {
    "Recebido": "recebido",
    "Em preparo": "preparo",
    "Saiu para entrega": "entrega",
    "Finalizado": "final"
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
    renderizarPedidos();
    atualizarBadgePedidos();
    mostrarToast(`Pedido agora: ${p.status}`);
  }
}

function abrirDetalhePedido(id) {
  const p = pedidos.find(x => x.id === id);
  if (!p) return;

  let itensHtml = p.itens.map(i =>
    `<li>${i.nome} <small>(R$ ${formatarPreco(i.preco)})</small> × ${i.qtd} = <strong>R$ ${formatarPreco(i.preco * i.qtd)}</strong></li>`
  ).join("");

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

    <div class="totais-modal">
      <p>Subtotal: R$ ${formatarPreco(p.subtotal)}</p>
      <p>Taxa: R$ ${formatarPreco(p.taxa)}</p>
      <p class="total">Total: R$ ${formatarPreco(p.total)}</p>
    </div>

    <h3>Mudar status</h3>
    <div class="status-botoes">
      ${STATUS_PEDIDO.map(s => `
        <button class="btn-status ${p.status === s ? 'ativo' : ''} status-${statusClasse(s)}"
                data-status="${s}">${s}</button>
      `).join("")}
    </div>

    <div class="acoes-form" style="margin-top:16px;">
      <button class="btn-secundario" id="btnFecharModal">Fechar</button>
      <button class="btn-excluir" id="btnExcluirPedido">🗑️ Excluir pedido</button>
    </div>
  `;

  // Botões de status
  corpo.querySelectorAll(".btn-status").forEach(b => {
    b.addEventListener("click", () => {
      p.status = b.dataset.status;
      salvarLS("pedidos", pedidos);
      renderizarPedidos();
      atualizarBadgePedidos();
      abrirDetalhePedido(id); // re-renderiza modal
      mostrarToast(`Status atualizado: ${p.status}`);
    });
  });

  corpo.querySelector("#btnFecharModal").addEventListener("click", () => {
    document.getElementById("modalPedido").classList.add("escondido");
  });

  corpo.querySelector("#btnExcluirPedido").addEventListener("click", () => {
    if (!confirm("Excluir este pedido permanentemente?")) return;
    pedidos = pedidos.filter(x => x.id !== id);
    salvarLS("pedidos", pedidos);
    document.getElementById("modalPedido").classList.add("escondido");
    renderizarPedidos();
    atualizarBadgePedidos();
    mostrarToast("Pedido excluído.");
  });

  document.getElementById("modalPedido").classList.remove("escondido");
}

function atualizarBadgePedidos() {
  const ativos = pedidos.filter(p => p.status !== "Finalizado").length;
  const badge = document.getElementById("badgePedidos");
  if (ativos > 0) {
    badge.textContent = ativos;
    badge.style.display = "inline-flex";
  } else {
    badge.style.display = "none";
  }
}

/* =====================================================
   🍕 PRODUTOS
===================================================== */
function renderizarProdutos() {
  const lista = document.getElementById("listaAdmin");
  lista.innerHTML = "";

  if (produtos.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhum produto cadastrado.</p>";
    return;
  }

  produtos.forEach(p => {
    const linha = document.createElement("div");
    linha.className = "linha-admin";
    linha.innerHTML = `
      <img src="${p.imagem}" alt="${p.nome}"
           onerror="this.src='https://via.placeholder.com/100?text=Sem+Imagem'" />
      <div class="linha-info">
        <h4>${p.nome}</h4>
        <small>${p.categoria} - R$ ${formatarPreco(p.preco)}</small>
      </div>
      <div class="linha-acoes">
        <button class="btn-editar">Editar</button>
        <button class="btn-excluir">Excluir</button>
      </div>
    `;
    linha.querySelector(".btn-editar").addEventListener("click", () => editarProduto(p.id));
    linha.querySelector(".btn-excluir").addEventListener("click", () => excluirProduto(p.id));
    lista.appendChild(linha);
  });
}

function renderizarCategoriasOpts() {
  // Atualiza o <select> de categoria do form de produto
  const sel = document.getElementById("prodCategoria");
  sel.innerHTML = "";
  categorias.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c.nome;
    opt.textContent = c.nome;
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
    categoria: document.getElementById("prodCategoria").value
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

  // Garante que a categoria existe na lista
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
  document.getElementById("tituloForm").textContent = "Adicionar Novo Produto";
  document.getElementById("btnCancelar").classList.add("escondido");
}

/* =====================================================
   🏷️ CATEGORIAS
===================================================== */
function renderizarCategoriasLista() {
  const lista = document.getElementById("listaCategorias");
  lista.innerHTML = "";

  if (categorias.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhuma categoria cadastrada.</p>";
    return;
  }

  categorias.forEach(c => {
    // Conta quantos produtos têm essa categoria
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
        <button class="btn-excluir">Remover</button>
      </div>
    `;
    linha.querySelector(".btn-excluir").addEventListener("click", () => removerCategoria(c.id));
    lista.appendChild(linha);
  });
}

function adicionarCategoria(e) {
  e.preventDefault();
  const nome = document.getElementById("catNome").value.trim();
  if (!nome) return;

  if (categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase())) {
    mostrarToast("Essa categoria já existe.");
    return;
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

  // Move produtos para "Outros"
  produtos.forEach(p => {
    if (p.categoria === cat.nome) p.categoria = "Outros";
  });
  salvarLS("produtos", produtos);

  // Garante "Outros" na lista
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
   👤 CLIENTES
===================================================== */
function renderizarClientes() {
  const lista = document.getElementById("listaClientes");
  lista.innerHTML = "";

  if (clientes.length === 0) {
    lista.innerHTML = "<p class='vazio'>Nenhum cliente cadastrado ainda.</p>";
    return;
  }

  clientes.forEach(c => {
    // Conta pedidos desse cliente
    const qtdPed = pedidos.filter(p => p.cliente.telefone === c.telefone).length;

    const linha = document.createElement("div");
    linha.className = "linha-admin";
    linha.innerHTML = `
      <div class="cat-icon">👤</div>
      <div class="linha-info">
        <h4>${c.nome}</h4>
        <small>📞 ${c.telefone}</small><br>
        <small>📍 ${c.endereco}</small><br>
        <small><strong>${qtdPed}</strong> pedido(s)</small>
      </div>
    `;
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
        <small>${f.funcao}</small>
      </div>
      <div class="linha-acoes">
        <button class="btn-excluir">Remover</button>
      </div>
    `;
    linha.querySelector(".btn-excluir").addEventListener("click", () => removerFuncionario(f.id));
    lista.appendChild(linha);
  });
}

function adicionarFuncionario(e) {
  e.preventDefault();
  const dados = {
    nome: document.getElementById("funcNome").value.trim(),
    funcao: document.getElementById("funcFuncao").value
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
  document.getElementById("cfgNome").value = config.nomeLoja;
  document.getElementById("cfgWhatsapp").value = config.whatsapp;
  document.getElementById("cfgTaxa").value = config.taxa;
  document.getElementById("cfgMinimo").value = config.minimo;
  document.getElementById("cfgAbre").value = config.abre;
  document.getElementById("cfgFecha").value = config.fecha;
  document.getElementById("cfgCor").value = config.cor;
}

function salvarConfig(e) {
  e.preventDefault();
  config = {
    nomeLoja: document.getElementById("cfgNome").value.trim(),
    whatsapp: document.getElementById("cfgWhatsapp").value.trim(),
    taxa: parseFloat(document.getElementById("cfgTaxa").value),
    minimo: parseFloat(document.getElementById("cfgMinimo").value),
    abre: document.getElementById("cfgAbre").value,
    fecha: document.getElementById("cfgFecha").value,
    cor: document.getElementById("cfgCor").value
  };
  salvarLS("config", config);
  aplicarCor(config.cor);
  document.getElementById("adminLogo").textContent = "Admin - " + config.nomeLoja;
  mostrarToast("✅ Configurações salvas!");
}

function sair() {
  localStorage.removeItem("logado");
  window.location.href = "login.html";
}

iniciar();
