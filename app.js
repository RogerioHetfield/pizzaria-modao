/* =====================================================
   app.js
   Lógica do CARDÁPIO + CARRINHO + ENVIO no WhatsApp
===================================================== */

// Estado da aplicação
let produtos = carregarProdutos();
let config = carregarConfig();
let carrinho = lerLS("carrinho") || [];
let dadosCliente = lerLS("cliente") || { nome: "", telefone: "", endereco: "" };
let categoriaAtiva = "Todas";
let termoBusca = "";
let aberta = false;

// Elementos do DOM
const elListaProdutos = document.getElementById("listaProdutos");
const elCategorias = document.getElementById("categorias");
const elQtdCarrinho = document.getElementById("qtdCarrinho");
const elQtdFlutuante = document.getElementById("qtdFlutuante");
const elModalCarrinho = document.getElementById("modalCarrinho");
const elModalProduto = document.getElementById("modalProduto");
const elItensCarrinho = document.getElementById("itensCarrinho");
const elSubtotal = document.getElementById("subtotal");
const elTaxa = document.getElementById("taxa");
const elTotal = document.getElementById("total");
const elAvisoMinimo = document.getElementById("avisoMinimo");
const elFormPedido = document.getElementById("formPedido");
const elBtnEnviar = document.getElementById("btnEnviar");
const elBusca = document.getElementById("campoBusca");
const elStatusLoja = document.getElementById("statusLoja");
const elNomeLoja = document.getElementById("nomeLoja");
const elNomeLojaRodape = document.getElementById("nomeLojaRodape");
const elObservacao = document.getElementById("observacao");

/* -----------------------------------------------------
   Inicialização
----------------------------------------------------- */
function iniciar() {
  // Aplica cor principal configurada
  aplicarCor(config.cor);

  // Aplica nome da loja em todos os lugares
  elNomeLoja.textContent = config.nomeLoja;
  elNomeLojaRodape.textContent = config.nomeLoja;
  document.title = config.nomeLoja + " - Cardápio";

  preencherFormularioCliente();
  atualizarStatusLoja();
  renderizarCategorias();
  renderizarProdutos();
  atualizarCarrinho();

  // Restaurar observação
  const obsSalva = lerLS("observacao");
  if (obsSalva) elObservacao.value = obsSalva;

  // Botões para abrir/fechar carrinho
  document.getElementById("btnAbrirCarrinho").addEventListener("click", abrirCarrinho);
  document.getElementById("btnFlutuante").addEventListener("click", abrirCarrinho);

  // Fechar modais (botão × com data-fechar)
  document.querySelectorAll("[data-fechar]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.fechar).classList.add("escondido");
    });
  });

  // Fechar modal ao clicar fora
  [elModalCarrinho, elModalProduto].forEach(modal => {
    modal.addEventListener("click", e => {
      if (e.target === modal) modal.classList.add("escondido");
    });
  });

  // Submeter pedido
  elFormPedido.addEventListener("submit", enviarPedidoWhatsapp);

  // Salvar dados do formulário enquanto o usuário digita
  ["nome", "telefone", "endereco"].forEach(id => {
    document.getElementById(id).addEventListener("input", salvarDadosCliente);
  });
  elObservacao.addEventListener("input", () => salvarLS("observacao", elObservacao.value));

  // Busca em tempo real
  elBusca.addEventListener("input", e => {
    termoBusca = e.target.value.toLowerCase().trim();
    renderizarProdutos();
  });

  // Atualiza status da loja a cada minuto
  setInterval(atualizarStatusLoja, 60 * 1000);
}

/* -----------------------------------------------------
   Status (Aberto / Fechado)
----------------------------------------------------- */
function atualizarStatusLoja() {
  aberta = lojaAberta(config);
  if (aberta) {
    elStatusLoja.textContent = `🟢 Aberto agora (${config.abre} - ${config.fecha})`;
    elStatusLoja.className = "status-loja aberto";
  } else {
    elStatusLoja.textContent = `🔴 Fechado (abre às ${config.abre})`;
    elStatusLoja.className = "status-loja fechado";
  }
  atualizarBotaoEnvio();
}

/* -----------------------------------------------------
   Renderizar botões de categoria
----------------------------------------------------- */
function renderizarCategorias() {
  const cats = ["Todas", ...new Set(produtos.map(p => p.categoria))];

  elCategorias.innerHTML = "";
  cats.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    if (cat === categoriaAtiva) btn.classList.add("ativa");
    btn.addEventListener("click", () => {
      categoriaAtiva = cat;
      renderizarCategorias();
      renderizarProdutos();
    });
    elCategorias.appendChild(btn);
  });
}

/* -----------------------------------------------------
   Renderizar cards de produtos
   (com filtro de categoria + busca)
----------------------------------------------------- */
function renderizarProdutos() {
  let filtrados = produtos;

  if (categoriaAtiva !== "Todas") {
    filtrados = filtrados.filter(p => p.categoria === categoriaAtiva);
  }

  if (termoBusca) {
    filtrados = filtrados.filter(p =>
      p.nome.toLowerCase().includes(termoBusca) ||
      p.descricao.toLowerCase().includes(termoBusca)
    );
  }

  elListaProdutos.innerHTML = "";

  if (filtrados.length === 0) {
    elListaProdutos.innerHTML = "<p class='vazio'>Nenhum produto encontrado.</p>";
    return;
  }

  filtrados.forEach(produto => {
    const card = document.createElement("div");
    card.className = "card-produto";
    card.innerHTML = `
      <div class="card-img">
        <img src="${produto.imagem}" alt="${produto.nome}"
             onerror="this.src='https://via.placeholder.com/300x200?text=Sem+Imagem'" />
      </div>
      <div class="card-corpo">
        <h3>${produto.nome}</h3>
        <p>${produto.descricao}</p>
        <div class="preco">R$ ${formatarPreco(produto.preco)}</div>
        <button class="btn-add">Adicionar ao carrinho</button>
      </div>
    `;
    // Clique no card abre detalhes (exceto no botão)
    card.addEventListener("click", e => {
      if (e.target.classList.contains("btn-add")) return;
      abrirDetalhe(produto);
    });
    card.querySelector(".btn-add").addEventListener("click", e => {
      e.stopPropagation();
      adicionarAoCarrinho(produto);
    });
    elListaProdutos.appendChild(card);
  });
}

/* -----------------------------------------------------
   Modal de detalhe do produto
----------------------------------------------------- */
function abrirDetalhe(produto) {
  document.getElementById("modalProdImg").src = produto.imagem;
  document.getElementById("modalProdImg").alt = produto.nome;
  document.getElementById("modalProdNome").textContent = produto.nome;
  document.getElementById("modalProdCategoria").textContent = produto.categoria;
  document.getElementById("modalProdDescricao").textContent = produto.descricao;
  document.getElementById("modalProdPreco").textContent = "R$ " + formatarPreco(produto.preco);

  const btn = document.getElementById("modalAddBtn");
  btn.onclick = () => {
    adicionarAoCarrinho(produto);
    elModalProduto.classList.add("escondido");
  };

  elModalProduto.classList.remove("escondido");
}

/* -----------------------------------------------------
   Carrinho — adicionar
----------------------------------------------------- */
function adicionarAoCarrinho(produto) {
  const existente = carrinho.find(i => i.id === produto.id);
  if (existente) {
    existente.qtd += 1;
  } else {
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      qtd: 1
    });
  }
  salvarLS("carrinho", carrinho);
  atualizarCarrinho();
  mostrarToast(`✅ ${produto.nome} adicionado ao carrinho`);
}

/* -----------------------------------------------------
   Carrinho — alterar quantidade
   delta = +1 (aumenta) ou -1 (diminui)
   Se quantidade chega a 0, remove o item
----------------------------------------------------- */
function alterarQtd(id, delta) {
  const item = carrinho.find(i => i.id === id);
  if (!item) return;

  item.qtd += delta;
  if (item.qtd <= 0) {
    carrinho = carrinho.filter(i => i.id !== id);
  }
  salvarLS("carrinho", carrinho);
  atualizarCarrinho();
}

/* -----------------------------------------------------
   Carrinho — remover item completamente
----------------------------------------------------- */
function removerItem(id) {
  carrinho = carrinho.filter(i => i.id !== id);
  salvarLS("carrinho", carrinho);
  atualizarCarrinho();
}

/* -----------------------------------------------------
   Atualizar visual do carrinho e totais
----------------------------------------------------- */
function atualizarCarrinho() {
  const qtdTotal = carrinho.reduce((s, i) => s + i.qtd, 0);
  elQtdCarrinho.textContent = qtdTotal;
  elQtdFlutuante.textContent = qtdTotal;

  // Lista de itens no modal
  elItensCarrinho.innerHTML = "";
  if (carrinho.length === 0) {
    elItensCarrinho.innerHTML = "<p class='vazio'>Seu carrinho está vazio.</p>";
  } else {
    carrinho.forEach(item => {
      const linha = document.createElement("div");
      linha.className = "item-carrinho";
      linha.innerHTML = `
        <div class="item-info">
          <strong>${item.nome}</strong>
          <small>R$ ${formatarPreco(item.preco)} cada</small>
        </div>
        <div class="qtd-controle">
          <button class="btn-qtd" data-acao="menos">−</button>
          <span class="qtd">${item.qtd}</span>
          <button class="btn-qtd" data-acao="mais">+</button>
        </div>
        <div class="item-total">
          <strong>R$ ${formatarPreco(item.preco * item.qtd)}</strong>
          <button class="btn-remover" title="Remover item">🗑️</button>
        </div>
      `;
      linha.querySelector('[data-acao="menos"]').addEventListener("click", () => alterarQtd(item.id, -1));
      linha.querySelector('[data-acao="mais"]').addEventListener("click", () => alterarQtd(item.id, +1));
      linha.querySelector(".btn-remover").addEventListener("click", () => removerItem(item.id));
      elItensCarrinho.appendChild(linha);
    });
  }

  // Calcula totais
  const subtotal = carrinho.reduce((s, i) => s + (i.preco * i.qtd), 0);
  const taxa = carrinho.length > 0 ? config.taxa : 0;
  const total = subtotal + taxa;

  elSubtotal.textContent = formatarPreco(subtotal);
  elTaxa.textContent = formatarPreco(taxa);
  elTotal.textContent = formatarPreco(total);

  atualizarBotaoEnvio();
}

/* -----------------------------------------------------
   Habilita/desabilita botão de envio conforme regras:
   - loja precisa estar aberta
   - precisa atingir o valor mínimo
   - carrinho não pode estar vazio
----------------------------------------------------- */
function atualizarBotaoEnvio() {
  const subtotal = carrinho.reduce((s, i) => s + (i.preco * i.qtd), 0);
  let bloqueado = false;
  let aviso = "";

  if (carrinho.length === 0) {
    bloqueado = true;
  } else if (!aberta) {
    bloqueado = true;
    aviso = `⚠️ A loja está fechada. Horário: ${config.abre} às ${config.fecha}.`;
  } else if (subtotal < config.minimo) {
    bloqueado = true;
    const falta = config.minimo - subtotal;
    aviso = `⚠️ Pedido mínimo: R$ ${formatarPreco(config.minimo)}. Faltam R$ ${formatarPreco(falta)}.`;
  }

  if (aviso) {
    elAvisoMinimo.textContent = aviso;
    elAvisoMinimo.classList.remove("escondido");
  } else {
    elAvisoMinimo.classList.add("escondido");
  }

  elBtnEnviar.disabled = bloqueado;
  elBtnEnviar.classList.toggle("desabilitado", bloqueado);
}

/* -----------------------------------------------------
   Abrir modal do carrinho
----------------------------------------------------- */
function abrirCarrinho() {
  elModalCarrinho.classList.remove("escondido");
}

/* -----------------------------------------------------
   Preencher formulário com dados salvos
----------------------------------------------------- */
function preencherFormularioCliente() {
  document.getElementById("nome").value = dadosCliente.nome || "";
  document.getElementById("telefone").value = dadosCliente.telefone || "";
  document.getElementById("endereco").value = dadosCliente.endereco || "";
}

/* -----------------------------------------------------
   Salvar dados do cliente conforme digita
   (com timestamp via salvarLS — expira em 7 dias)
----------------------------------------------------- */
function salvarDadosCliente() {
  dadosCliente = {
    nome: document.getElementById("nome").value,
    telefone: document.getElementById("telefone").value,
    endereco: document.getElementById("endereco").value
  };
  salvarLS("cliente", dadosCliente);
}

/* -----------------------------------------------------
   Enviar pedido pelo WhatsApp (formato profissional)
----------------------------------------------------- */
function enviarPedidoWhatsapp(evento) {
  evento.preventDefault();

  if (carrinho.length === 0) {
    mostrarToast("Seu carrinho está vazio!");
    return;
  }
  if (!aberta) {
    mostrarToast("A loja está fechada no momento.");
    return;
  }

  const nome = document.getElementById("nome").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const endereco = document.getElementById("endereco").value.trim();
  const observacao = elObservacao.value.trim();

  if (!nome || !telefone || !endereco) {
    mostrarToast("Preencha nome, telefone e endereço.");
    return;
  }

  // Valores
  const subtotal = carrinho.reduce((s, i) => s + (i.preco * i.qtd), 0);
  if (subtotal < config.minimo) {
    mostrarToast(`Pedido mínimo: R$ ${formatarPreco(config.minimo)}`);
    return;
  }
  const taxa = config.taxa;
  const total = subtotal + taxa;

  // Monta mensagem
  let msg = `*${config.nomeLoja}*\n\n`;
  msg += `📦 *Pedido*\n\n`;
  msg += `👤 Cliente: ${nome}\n`;
  msg += `📞 Telefone: ${telefone}\n`;
  msg += `📍 Endereço: ${endereco}\n\n`;
  msg += `🛒 *Itens:*\n`;

  carrinho.forEach(item => {
    const totalItem = item.preco * item.qtd;
    msg += `• ${item.nome} (R$ ${formatarPreco(item.preco)}) x${item.qtd} = R$ ${formatarPreco(totalItem)}\n`;
  });

  if (observacao) {
    msg += `\n💬 *Observação:*\n${observacao}\n`;
  }

  msg += `\n💰 Subtotal: R$ ${formatarPreco(subtotal)}\n`;
  msg += `🚚 Taxa: R$ ${formatarPreco(taxa)}\n`;
  msg += `💵 *Total: R$ ${formatarPreco(total)}*`;

  // Salva o pedido no histórico (para o admin gerenciar)
  const pedido = {
    id: Date.now(),
    cliente: { nome, telefone, endereco },
    itens: carrinho.map(i => ({ id: i.id, nome: i.nome, preco: i.preco, qtd: i.qtd })),
    observacao,
    subtotal,
    taxa,
    total,
    status: "Recebido",
    dataHora: new Date().toISOString()
  };
  salvarPedido(pedido);

  // Registra/atualiza cliente
  registrarCliente({ nome, telefone, endereco });

  // Abre WhatsApp
  const url = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");

  // Limpa o carrinho e a observação após o envio
  carrinho = [];
  salvarLS("carrinho", carrinho);
  elObservacao.value = "";
  limparLS("observacao");
  atualizarCarrinho();
  elModalCarrinho.classList.add("escondido");
  mostrarToast("✅ Pedido enviado! Confira o WhatsApp.");
}

// Inicia tudo
iniciar();
