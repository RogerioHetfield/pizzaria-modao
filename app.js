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
let cupomAplicado = null;

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
const elBarraInferior = document.getElementById("barraInferior");
const elBarraTotal = document.getElementById("barraTotal");
const elBarraQtdTexto = document.getElementById("barraQtdTexto");
const elBtnFlutuante = document.getElementById("btnFlutuante");

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

  document.getElementById("btnAbrirCarrinho").addEventListener("click", abrirCarrinho);
  document.getElementById("btnFlutuante").addEventListener("click", abrirCarrinho);
  document.getElementById("barraBtnFinalizar").addEventListener("click", abrirCarrinho);
  document.getElementById("btnSobre").addEventListener("click", abrirSobre);
  document.getElementById("btnAplicarCupom").addEventListener("click", aplicarCupom);

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

  document.querySelectorAll('input[name="pagamento"]').forEach(r => {
    r.addEventListener("change", atualizarBlocoTroco);
  });
  document.querySelectorAll('input[name="precisaTroco"]').forEach(r => {
    r.addEventListener("change", atualizarCampoTroco);
  });

  elFormPedido.addEventListener("submit", enviarPedidoWhatsapp);
  ["nome", "telefone", "endereco"].forEach(id => {
    document.getElementById(id).addEventListener("input", salvarDadosCliente);
  });
  elObservacao.addEventListener("input", () => salvarLS("observacao", elObservacao.value));

  elBusca.addEventListener("input", e => {
    termoBusca = e.target.value.toLowerCase().trim();
    renderizarProdutos();
  });

  setInterval(atualizarStatusLoja, 60 * 1000);

  const elHeroNome = document.getElementById("heroNomeLoja");
  const elHeroDesc = document.getElementById("heroDescricao");
  if (elHeroNome) elHeroNome.textContent = config.nomeLoja;
  if (elHeroDesc && config.descricao) elHeroDesc.textContent = config.descricao;
  document.getElementById("btnHeroCardapio").addEventListener("click", () => {
    document.getElementById("topCardapio").scrollIntoView({ behavior: "smooth" });
  });

  renderizarDestaques();
  setupScrollAnimations();
}

function renderizarDestaques() {
  const sec = document.getElementById("secDestaques");
  if (!sec) return;
  const ativos = produtos.filter(p => p.ativo !== false);
  const destaques = ativos.slice(0, 3);
  if (destaques.length === 0) { sec.classList.add("escondido"); return; }
  sec.classList.remove("escondido");
  sec.innerHTML = `
    <h2 class="sec-titulo-home">⭐ Mais Pedidos</h2>
    <div class="grid-destaques">
      ${destaques.map(p => `
        <div class="card-destaque fade-scroll" data-id="${p.id}">
          <div class="destaque-img">
            <img src="${p.imagem}" alt="${p.nome}"
                 onerror="this.src='https://via.placeholder.com/300x200?text=Sem+Imagem'" />
          </div>
          <div class="destaque-corpo">
            <span class="destaque-badge">⭐ Destaque</span>
            <h3>${p.nome}</h3>
            <div class="preco">R$ ${formatarPreco(p.preco)}</div>
            <button class="btn-add">Pedir agora 🍕</button>
          </div>
        </div>`).join("")}
    </div>`;
  destaques.forEach(p => {
    const el = sec.querySelector(`[data-id="${p.id}"]`);
    el.querySelector(".btn-add").addEventListener("click", e => {
      e.stopPropagation();
      pulsarBotao(e.currentTarget);
      adicionarAoCarrinho(p);
    });
    el.addEventListener("click", () => abrirDetalhe(p));
  });
  setupScrollAnimations();
}

function setupScrollAnimations() {
  if (!window.IntersectionObserver) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("visivel");
        observer.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".fade-scroll:not(.visivel)").forEach(el => observer.observe(el));
}

function pulsarBotao(btn) {
  btn.classList.remove("pulsando");
  void btn.offsetWidth;
  btn.classList.add("pulsando");
  setTimeout(() => btn.classList.remove("pulsando"), 400);
}

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

function abrirSobre() {
  document.getElementById("sobreNomeLoja").textContent = config.nomeLoja;
  document.getElementById("sobreDescricao").textContent = config.descricao || "";
  document.getElementById("sobreEndereco").textContent = config.endereco || "—";
  document.getElementById("sobreWhatsapp").innerHTML =
    `📱 <a href="https://wa.me/${config.whatsapp}" target="_blank">${config.whatsapp}</a>`;

  const redes = document.getElementById("sobreRedes");
  redes.innerHTML = "";
  if (config.instagram) {
    const u = config.instagram.replace("@", "");
    redes.innerHTML += `<a href="https://instagram.com/${u}" target="_blank">📷 Instagram</a>`;
  }
  if (config.facebook) {
    redes.innerHTML += `<a href="https://facebook.com/${config.facebook}" target="_blank">👍 Facebook</a>`;
  }

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
    const badgeClass = produto.badge && produto.badge.includes("Recomendado") ? "badge-rec"
      : produto.badge && produto.badge.includes("Novo") ? "badge-novo"
      : produto.badge && produto.badge.includes("Promo") ? "badge-promo" : "";
    card.innerHTML = `
      <div class="card-img">
        ${produto.badge ? `<div class="card-badge-wrap"><span class="card-badge-label ${badgeClass}">${produto.badge}</span></div>` : ""}
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
      pulsarBotao(e.currentTarget);
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

function adicionarAoCarrinho(produto) {
  const existente = carrinho.find(i => i.id === produto.id);
  if (existente) existente.qtd += 1;
  else carrinho.push({ id: produto.id, nome: produto.nome, preco: produto.preco, qtd: 1 });
  salvarLS("carrinho", carrinho);
  atualizarCarrinho();
  mostrarToast(`✅ ${produto.nome} adicionado ao carrinho`);
  elBtnFlutuante.classList.remove("shake");
  void elBtnFlutuante.offsetWidth;
  elBtnFlutuante.classList.add("shake");
  setTimeout(() => elBtnFlutuante.classList.remove("shake"), 600);
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

  if (qtdTotal > 0) {
    elBarraInferior.classList.remove("escondido");
    document.body.classList.add("com-barra");
    elBarraQtdTexto.textContent = `${qtdTotal} ${qtdTotal === 1 ? "item" : "itens"}`;
  } else {
    elBarraInferior.classList.add("escondido");
    document.body.classList.remove("com-barra");
  }

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

  if (cupomAplicado) revalidarCupom();

  const subtotal = carrinho.reduce((s, i) => s + (i.preco * i.qtd), 0);
  const taxa = carrinho.length > 0 ? config.taxa : 0;
  const desconto = cupomAplicado ? cupomAplicado.desconto : 0;
  const total = Math.max(0, subtotal + taxa - desconto);

  elSubtotal.textContent = formatarPreco(subtotal);
  elTaxa.textContent = formatarPreco(taxa);
  elTotal.textContent = formatarPreco(total);
  elBarraTotal.textContent = formatarPreco(total);

  if (cupomAplicado) {
    elDscPerc.textContent = `${cupomAplicado.cupom.percentual}%`;
    elDscValor.textContent = formatarPreco(desconto);
    elLinhaDesc.classList.remove("escondido");
  } else {
    elLinhaDesc.classList.add("escondido");
  }

  atualizarBotaoEnvio();
}

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
  
if (pagamento === "PIX") {
  if (config.pixChave) {
    msg += `\n\n🔷 *Dados para pagamento via PIX*`;

    if (config.pixTipo) {
      msg += `\nTipo de chave: ${config.pixTipo}`;
    }

    msg += `\nChave PIX: ${config.pixChave}`;

    if (config.pixTitular) {
      msg += `\nTitular: ${config.pixTitular}`;
    }
  } else {
    msg += `\n\n⚠️ A chave PIX não está cadastrada nas configurações da loja.`;
  }
}

  if (trocoInfo) {
    if (trocoInfo.precisa) {
      msg += `\n💸 Troco para R$ ${formatarPreco(trocoInfo.valor)} (levar R$ ${formatarPreco(trocoInfo.troco)} de troco)`;
    } else {
      msg += `\n💸 Não precisa de troco`;
    }
  }

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

  window.open(`https://wa.me/${config.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");

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

window.addEventListener("load", () => {
  const ls = document.getElementById("loadingScreen");
  if (!ls) return;
  const lnome = document.getElementById("loadingNome");
  if (lnome) lnome.textContent = config.nomeLoja;
  setTimeout(() => {
    ls.classList.add("loading-saindo");
    setTimeout(() => ls.remove(), 500);
  }, 900);
});
