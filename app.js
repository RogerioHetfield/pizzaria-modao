/* =====================================================
   app.js — Cardápio + Carrinho + Pagamento + Cupom
===================================================== */

let produtos = carregarProdutos();
let config = carregarConfig();
let carrinho = lerLS("carrinho") || [];
let dadosCliente = lerLS("cliente") || { nome: "", telefone: "", endereco: "" };
let categoriaAtiva = "Todas";
let termoBusca = "";
let aberta = false;
let cupomAplicado = null; // { cupom, desconto }

// DOM
const elListaProdutos = document.getElementById("listaProdutos");
const elCategorias = document.getElementById("categorias");
const elQtdCarrinho = document.getElementById("qtdCarrinho");
const elQtdFlutuante = document.getElementById("qtdFlutuante");
const elModalCarrinho = document.getElementById("modalCarrinho");
const elModalProduto = document.getElementById("modalProduto");
const elModalSobre = document.getElementById("modalSobre");
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
const elCupomInput = document.getElementById("cupomInput");
const elCupomStatus = document.getElementById("cupomStatus");
const elBlocoTroco = document.getElementById("blocoTroco");
const elCampoTrocoValor = document.getElementById("campoTrocoValor");
const elLinhaDesc = document.getElementById("linhaDesconto");
const elDscPerc = document.getElementById("dscPercentual");
const elDscValor = document.getElementById("dscValor");

/* -----------------------------------------------------
   Inicialização
----------------------------------------------------- */
function iniciar() {
  aplicarCor(config.cor);
  elNomeLoja.textContent = config.nomeLoja;
  elNomeLojaRodape.textContent = config.nomeLoja;
  document.title = config.nomeLoja + " - Cardápio";

  preencherFormularioCliente();
  atualizarStatusLoja();
  renderizarCategorias();
  renderizarProdutos();
  atualizarCarrinho();

  const obsSalva = lerLS("observacao");
  if (obsSalva) elObservacao.value = obsSalva;

  // Botões
  document.getElementById("btnAbrirCarrinho").addEventListener("click", abrirCarrinho);
  document.getElementById("btnFlutuante").addEventListener("click", abrirCarrinho);
  document.getElementById("btnSobre").addEventListener("click", abrirSobre);
  document.getElementById("btnAplicarCupom").addEventListener("click", aplicarCupom);

  // Fechar modais
  document.querySelectorAll("[data-fechar]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.fechar).classList.add("escondido");
    });
  });
  [elModalCarrinho, elModalProduto, elModalSobre].forEach(modal => {
    modal.addEventListener("click", e => {
      if (e.target === modal) modal.classList.add("escondido");
    });
  });

  // Pagamento (mostra/esconde troco)
  document.querySelectorAll('input[name="pagamento"]').forEach(r => {
    r.addEventListener("change", atualizarBlocoTroco);
  });
  document.querySelectorAll('input[name="precisaTroco"]').forEach(r => {
    r.addEventListener("change", atualizarCampoTroco);
  });

  // Form
  elFormPedido.addEventListener("submit", enviarPedidoWhatsapp);
  ["nome", "telefone", "endereco"].forEach(id => {
    document.getElementById(id).addEventListener("input", salvarDadosCliente);
  });
  elObservacao.addEventListener("input", () => salvarLS("observacao", elObservacao.value));

  // Busca
  elBusca.addEventListener("input", e => {
    termoBusca = e.target.value.toLowerCase().trim();
    renderizarProdutos();
  });

  setInterval(atualizarStatusLoja, 60 * 1000);
}

/* -----------------------------------------------------
   Status (Aberto / Fechado) + horário do dia
----------------------------------------------------- */
function atualizarStatusLoja() {
  aberta = lojaAberta(config);
  const h = horarioHoje(config);
  if (aberta && h) {
    elStatusLoja.textContent = `🟢 Aberto agora (${h.abre} - ${h.fecha})`;
    elStatusLoja.className = "status-loja aberto";
  } else if (h) {
    elStatusLoja.textContent = `🔴 Fechado (hoje: ${h.abre} às ${h.fecha})`;
    elStatusLoja.className = "status-loja fechado";
  } else {
    elStatusLoja.textContent = `🔴 Fechado hoje`;
    elStatusLoja.className = "status-loja fechado";
  }
  atualizarBotaoEnvio();
}

/* -----------------------------------------------------
   Modal "Sobre" — preenche e abre
----------------------------------------------------- */
function abrirSobre() {
  document.getElementById("sobreNomeLoja").textContent = config.nomeLoja;
  document.getElementById("sobreDescricao").textContent = config.descricao || "";
  document.getElementById("sobreEndereco").textContent = config.endereco || "—";
  document.getElementById("sobreWhatsapp").innerHTML =
    `📱 <a href="https://wa.me/${config.whatsapp}" target="_blank">${config.whatsapp}</a>`;

  // Redes sociais (só mostra se tiver)
  const redes = document.getElementById("sobreRedes");
  redes.innerHTML = "";
  if (config.instagram) {
    const u = config.instagram.replace("@", "");
    redes.innerHTML += `<a href="https://instagram.com/${u}" target="_blank">📷 Instagram</a>`;
  }
  if (config.facebook) {
    redes.innerHTML += `<a href="https://facebook.com/${config.facebook}" target="_blank">👍 Facebook</a>`;
  }

  // Horários por dia
  const tbl = document.getElementById("sobreHorarios");
  const hojeKey = diaDaSemanaKey(new Date());
  tbl.innerHTML = DIAS_SEMANA.map(d => {
    const h = config.horarios[d.key];
    const eHoje = d.key === hojeKey;
    const txt = h.fechado ? "Fechado" : `${h.abre} às ${h.fecha}`;
    return `<tr class="${eHoje ? 'hoje' : ''}">
      <td>${d.nome}${eHoje ? " (hoje)" : ""}</td>
      <td class="${h.fechado ? 'dia-fechado' : ''}">${txt}</td>
    </tr>`;
  }).join("");

  elModalSobre.classList.remove("escondido");
}

/* -----------------------------------------------------
   Categorias + Produtos
----------------------------------------------------- */
function renderizarCategorias() {
  const ativos = produtos.filter(p => p.ativo !== false);
  const cats = ["Todas", ...new Set(ativos.map(p => p.categoria))];

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

function renderizarProdutos() {
  // Cliente só vê produtos ativos
  let filtrados = produtos.filter(p => p.ativo !== false);

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
      </div>`;
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

function abrirDetalhe(produto) {
  document.getElementById("modalProdImg").src = produto.imagem;
  document.getElementById("modalProdImg").alt = produto.nome;
  document.getElementById("modalProdNome").textContent = produto.nome;
  document.getElementById("modalProdCategoria").textContent = produto.categoria;
  document.getElementById("modalProdDescricao").textContent = produto.descricao;
  document.getElementById("modalProdPreco").textContent = "R$ " + formatarPreco(produto.preco);
  document.getElementById("modalAddBtn").onclick = () => {
    adicionarAoCarrinho(produto);
    elModalProduto.classList.add("escondido");
  };
  elModalProduto.classList.remove("escondido");
}

/* -----------------------------------------------------
   Carrinho
----------------------------------------------------- */
function adicionarAoCarrinho(produto) {
  const existente = carrinho.find(i => i.id === produto.id);
  if (existente) existente.qtd += 1;
  else carrinho.push({ id: produto.id, nome: produto.nome, preco: produto.preco, qtd: 1 });
  salvarLS("carrinho", carrinho);
  atualizarCarrinho();
  mostrarToast(`✅ ${produto.nome} adicionado ao carrinho`);
}

function alterarQtd(id, delta) {
  const item = carrinho.find(i => i.id === id);
  if (!item) return;
  item.qtd += delta;
  if (item.qtd <= 0) carrinho = carrinho.filter(i => i.id !== id);
  salvarLS("carrinho", carrinho);
  atualizarCarrinho();
}

function removerItem(id) {
  carrinho = carrinho.filter(i => i.id !== id);
  salvarLS("carrinho", carrinho);
  atualizarCarrinho();
}

function atualizarCarrinho() {
  const qtdTotal = carrinho.reduce((s, i) => s + i.qtd, 0);
  elQtdCarrinho.textContent = qtdTotal;
  elQtdFlutuante.textContent = qtdTotal;

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
        </div>`;
      linha.querySelector('[data-acao="menos"]').addEventListener("click", () => alterarQtd(item.id, -1));
      linha.querySelector('[data-acao="mais"]').addEventListener("click", () => alterarQtd(item.id, +1));
      linha.querySelector(".btn-remover").addEventListener("click", () => removerItem(item.id));
      elItensCarrinho.appendChild(linha);
    });
  }

  // Recalcular cupom (subtotal pode ter mudado)
  if (cupomAplicado) revalidarCupom();

  const subtotal = carrinho.reduce((s, i) => s + (i.preco * i.qtd), 0);
  const taxa = carrinho.length > 0 ? config.taxa : 0;
  const desconto = cupomAplicado ? cupomAplicado.desconto : 0;
  const total = Math.max(0, subtotal + taxa - desconto);

  elSubtotal.textContent = formatarPreco(subtotal);
  elTaxa.textContent = formatarPreco(taxa);
  elTotal.textContent = formatarPreco(total);

  if (cupomAplicado) {
    elDscPerc.textContent = `${cupomAplicado.cupom.percentual}%`;
    elDscValor.textContent = formatarPreco(desconto);
    elLinhaDesc.classList.remove("escondido");
  } else {
    elLinhaDesc.classList.add("escondido");
  }

  atualizarBotaoEnvio();
}

/* -----------------------------------------------------
   Cupom de desconto
----------------------------------------------------- */
function aplicarCupom() {
  const codigo = elCupomInput.value.trim();
  const subtotal = carrinho.reduce((s, i) => s + (i.preco * i.qtd), 0);

  if (subtotal === 0) {
    mostrarStatusCupom("Adicione produtos antes de aplicar um cupom.", "erro");
    return;
  }

  const r = validarCupom(codigo, subtotal);
  if (r.erro) {
    cupomAplicado = null;
    mostrarStatusCupom(r.erro, "erro");
    atualizarCarrinho();
    return;
  }
  cupomAplicado = { cupom: r.cupom, desconto: r.desconto };
  mostrarStatusCupom(`✅ Cupom aplicado: ${r.cupom.percentual}% de desconto (− R$ ${formatarPreco(r.desconto)})`, "ok");
  atualizarCarrinho();
}

function revalidarCupom() {
  const subtotal = carrinho.reduce((s, i) => s + (i.preco * i.qtd), 0);
  const r = validarCupom(cupomAplicado.cupom.codigo, subtotal);
  if (r.erro) {
    cupomAplicado = null;
    mostrarStatusCupom(r.erro, "erro");
  } else {
    cupomAplicado = { cupom: r.cupom, desconto: r.desconto };
  }
}

function mostrarStatusCupom(msg, tipo) {
  elCupomStatus.textContent = msg;
  elCupomStatus.className = "cupom-status " + (tipo === "ok" ? "cupom-ok" : "cupom-erro");
}

/* -----------------------------------------------------
   Pagamento e troco
----------------------------------------------------- */
function pagamentoSelecionado() {
  return document.querySelector('input[name="pagamento"]:checked').value;
}

function atualizarBlocoTroco() {
  if (pagamentoSelecionado() === "Dinheiro") {
    elBlocoTroco.classList.remove("escondido");
  } else {
    elBlocoTroco.classList.add("escondido");
  }
}

function atualizarCampoTroco() {
  const sim = document.querySelector('input[name="precisaTroco"]:checked').value === "sim";
  elCampoTrocoValor.classList.toggle("escondido", !sim);
}

/* -----------------------------------------------------
   Botão de envio (regras)
----------------------------------------------------- */
function atualizarBotaoEnvio() {
  const subtotal = carrinho.reduce((s, i) => s + (i.preco * i.qtd), 0);
  let bloqueado = false;
  let aviso = "";

  if (carrinho.length === 0) bloqueado = true;
  else if (!aberta) {
    bloqueado = true;
    aviso = "⚠️ A loja está fechada agora.";
  } else if (subtotal < config.minimo) {
    bloqueado = true;
    aviso = `⚠️ Pedido mínimo: R$ ${formatarPreco(config.minimo)}. Faltam R$ ${formatarPreco(config.minimo - subtotal)}.`;
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

function abrirCarrinho() { elModalCarrinho.classList.remove("escondido"); }

/* -----------------------------------------------------
   Form do cliente
----------------------------------------------------- */
function preencherFormularioCliente() {
  document.getElementById("nome").value = dadosCliente.nome || "";
  document.getElementById("telefone").value = dadosCliente.telefone || "";
  document.getElementById("endereco").value = dadosCliente.endereco || "";
}

function salvarDadosCliente() {
  dadosCliente = {
    nome: document.getElementById("nome").value,
    telefone: document.getElementById("telefone").value,
    endereco: document.getElementById("endereco").value
  };
  salvarLS("cliente", dadosCliente);
}

/* -----------------------------------------------------
   Enviar pedido pelo WhatsApp
----------------------------------------------------- */
function enviarPedidoWhatsapp(evento) {
  evento.preventDefault();
  if (carrinho.length === 0) { mostrarToast("Seu carrinho está vazio!"); return; }
  if (!aberta) { mostrarToast("A loja está fechada no momento."); return; }

  const nome = document.getElementById("nome").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const endereco = document.getElementById("endereco").value.trim();
  const observacao = elObservacao.value.trim();

  if (!nome || !telefone || !endereco) {
    mostrarToast("Preencha nome, telefone e endereço.");
    return;
  }

  const subtotal = carrinho.reduce((s, i) => s + (i.preco * i.qtd), 0);
  if (subtotal < config.minimo) {
    mostrarToast(`Pedido mínimo: R$ ${formatarPreco(config.minimo)}`);
    return;
  }

  const taxa = config.taxa;
  const desconto = cupomAplicado ? cupomAplicado.desconto : 0;
  const total = Math.max(0, subtotal + taxa - desconto);

  // Pagamento e troco
  const pagamento = pagamentoSelecionado();
  let trocoInfo = null;
  if (pagamento === "Dinheiro") {
    const precisa = document.querySelector('input[name="precisaTroco"]:checked').value === "sim";
    if (precisa) {
      const valor = parseFloat(document.getElementById("trocoValor").value);
      if (!valor || valor < total) {
        mostrarToast(`Informe um valor de troco maior ou igual a R$ ${formatarPreco(total)}`);
        return;
      }
      trocoInfo = { precisa: true, valor, troco: +(valor - total).toFixed(2) };
    } else {
      trocoInfo = { precisa: false };
    }
  }

  // Mensagem WhatsApp
  let msg = `*${config.nomeLoja}*\n\n📦 *Pedido*\n\n`;
  msg += `👤 Cliente: ${nome}\n📞 Telefone: ${telefone}\n📍 Endereço: ${endereco}\n\n`;
  msg += `🛒 *Itens:*\n`;
  carrinho.forEach(item => {
    msg += `• ${item.nome} (R$ ${formatarPreco(item.preco)}) x${item.qtd} = R$ ${formatarPreco(item.preco * item.qtd)}\n`;
  });
  if (observacao) msg += `\n💬 *Observação:*\n${observacao}\n`;

  msg += `\n💰 Subtotal: R$ ${formatarPreco(subtotal)}\n🚚 Taxa: R$ ${formatarPreco(taxa)}`;
  if (cupomAplicado) {
    msg += `\n🎟️ Cupom ${cupomAplicado.cupom.codigo} (-${cupomAplicado.cupom.percentual}%): − R$ ${formatarPreco(desconto)}`;
  }
  msg += `\n💵 *Total: R$ ${formatarPreco(total)}*\n`;

  msg += `\n💳 *Pagamento:* ${pagamento}`;
  if (trocoInfo) {
    if (trocoInfo.precisa) {
      msg += `\n💸 Troco para R$ ${formatarPreco(trocoInfo.valor)} (levar R$ ${formatarPreco(trocoInfo.troco)} de troco)`;
    } else {
      msg += `\n💸 Não precisa de troco`;
    }
  }

  // Salva pedido
  const pedido = {
    id: Date.now(),
    cliente: { nome, telefone, endereco },
    itens: carrinho.map(i => ({ id: i.id, nome: i.nome, preco: i.preco, qtd: i.qtd })),
    observacao,
    subtotal, taxa, desconto, total,
    pagamento, troco: trocoInfo,
    cupom: cupomAplicado ? { codigo: cupomAplicado.cupom.codigo, percentual: cupomAplicado.cupom.percentual } : null,
    status: "Recebido",
    dataHora: new Date().toISOString()
  };
  salvarPedido(pedido);
  registrarCliente({ nome, telefone, endereco });

  // Abre WhatsApp
  window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");

  // Limpa
  carrinho = [];
  cupomAplicado = null;
  elCupomInput.value = "";
  elCupomStatus.classList.add("escondido");
  salvarLS("carrinho", carrinho);
  elObservacao.value = "";
  limparLS("observacao");
  atualizarCarrinho();
  elModalCarrinho.classList.add("escondido");
  mostrarToast("✅ Pedido enviado! Confira o WhatsApp.");
}

iniciar();
