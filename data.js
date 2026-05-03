/* =====================================================
   data.js
   Funções compartilhadas: LocalStorage com expiração
   de 7 dias, produtos padrão e configurações da loja.
===================================================== */

const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

const CHAVES_PERMANENTES = [
  "produtos", "config", "pedidos",
  "categorias", "clientes", "funcionarios",
  "cupons", "senhaAdmin"
];

const DIAS_SEMANA = [
  { key: "dom", nome: "Domingo" },
  { key: "seg", nome: "Segunda-feira" },
  { key: "ter", nome: "Terça-feira" },
  { key: "qua", nome: "Quarta-feira" },
  { key: "qui", nome: "Quinta-feira" },
  { key: "sex", nome: "Sexta-feira" },
  { key: "sab", nome: "Sábado" }
];

const PRODUTOS_PADRAO = [
  { id: 1, nome: "Pizza Calabresa", descricao: "Molho de tomate, mussarela, calabresa fatiada e cebola.", preco: 45.90, imagem: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600", categoria: "Tradicionais", ativo: true },
  { id: 2, nome: "Pizza Mussarela", descricao: "Molho de tomate, mussarela derretida e orégano.", preco: 39.90, imagem: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600", categoria: "Tradicionais", ativo: true },
  { id: 3, nome: "Pizza Portuguesa", descricao: "Mussarela, presunto, ovos, cebola, ervilha e azeitonas.", preco: 49.90, imagem: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600", categoria: "Tradicionais", ativo: true },
  { id: 4, nome: "Pizza Quatro Queijos", descricao: "Mussarela, provolone, parmesão e gorgonzola.", preco: 55.90, imagem: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600", categoria: "Especiais", ativo: true },
  { id: 5, nome: "Pizza Frango com Catupiry", descricao: "Frango desfiado, catupiry cremoso e mussarela.", preco: 52.90, imagem: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600", categoria: "Especiais", ativo: true },
  { id: 6, nome: "Coca-Cola 2L", descricao: "Refrigerante Coca-Cola gelado, garrafa de 2 litros.", preco: 12.00, imagem: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600", categoria: "Bebidas", ativo: true },
  { id: 7, nome: "Suco de Laranja 1L", descricao: "Suco natural de laranja gelado.", preco: 10.00, imagem: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600", categoria: "Bebidas", ativo: true }
];

function horariosPadrao() {
  const h = {};
  DIAS_SEMANA.forEach(d => {
    h[d.key] = { abre: "18:00", fecha: "23:00", fechado: false };
  });
  h.seg.fechado = true;
  return h;
}

const CONFIG_PADRAO = {
  nomeLoja: "Pizzaria D'Casa",
  descricao: "A melhor pizza artesanal da cidade, feita com ingredientes selecionados.",
  whatsapp: "5519991675464",
  endereco: "Rua das Pizzas, 100 - Centro",
  instagram: "",
  facebook: "",
  taxa: 5.00,
  minimo: 30.00,
  cor: "#FF5722",
  horarios: horariosPadrao()
};

function salvarLS(chave, valor) {
  const dados = { valor, timestamp: Date.now() };
  localStorage.setItem(chave, JSON.stringify(dados));
}

function lerLS(chave) {
  const bruto = localStorage.getItem(chave);
  if (!bruto) return null;
  try {
    const dados = JSON.parse(bruto);
    if (CHAVES_PERMANENTES.includes(chave)) return dados.valor;
    if (Date.now() - dados.timestamp > SETE_DIAS) {
      localStorage.removeItem(chave);
      return null;
    }
    return dados.valor;
  } catch (e) {
    localStorage.removeItem(chave);
    return null;
  }
}

function limparLS(chave) { localStorage.removeItem(chave); }

function carregarProdutos() {
  let salvos = lerLS("produtos");
  if (!salvos || !Array.isArray(salvos) || salvos.length === 0) {
    salvarLS("produtos", PRODUTOS_PADRAO);
    return PRODUTOS_PADRAO;
  }
  let mudou = false;
  salvos = salvos.map(p => {
    if (p.ativo === undefined) { mudou = true; return { ...p, ativo: true }; }
    return p;
  });
  if (mudou) salvarLS("produtos", salvos);
  return salvos;
}

function carregarConfig() {
  const salvas = lerLS("config");
  let finais = { ...CONFIG_PADRAO, ...(salvas || {}) };

  if (salvas && salvas.abre && salvas.fecha && !salvas.horarios) {
    finais.horarios = {};
    DIAS_SEMANA.forEach(d => {
      finais.horarios[d.key] = { abre: salvas.abre, fecha: salvas.fecha, fechado: false };
    });
  }
  if (!finais.horarios) finais.horarios = horariosPadrao();

  if (!salvas) salvarLS("config", finais);
  return finais;
}

function carregarCategorias() {
  const salvas = lerLS("categorias");
  if (salvas && Array.isArray(salvas) && salvas.length > 0) return salvas;
  const prods = carregarProdutos();
  const cats = [...new Set(prods.map(p => p.categoria))].map((nome, i) => ({ id: i + 1, nome }));
  salvarLS("categorias", cats);
  return cats;
}

function carregarPedidos() { return lerLS("pedidos") || []; }
const STATUS_PEDIDO = ["Recebido", "Em preparo", "Saiu para entrega", "Finalizado"];
function salvarPedido(pedido) {
  const lista = carregarPedidos();
  lista.unshift(pedido);
  salvarLS("pedidos", lista);
}

function carregarClientes() { return lerLS("clientes") || []; }

function registrarCliente(dados) {
  const lista = carregarClientes();
  const idx = lista.findIndex(c => c.telefone === dados.telefone);
  if (idx >= 0) lista[idx] = { ...lista[idx], ...dados };
  else lista.push({ ...dados, criadoEm: new Date().toISOString() });
  salvarLS("clientes", lista);
}

function carregarFuncionarios() { return lerLS("funcionarios") || []; }

function carregarCupons() { return lerLS("cupons") || []; }
function salvarCupons(lista) { salvarLS("cupons", lista); }

function validarCupom(codigo, subtotal) {
  if (!codigo) return { erro: "Digite um código." };
  const cup = carregarCupons().find(c =>
    c.codigo.toUpperCase() === codigo.toUpperCase().trim() && c.ativo
  );
  if (!cup) return { erro: "Cupom inválido ou expirado." };
  if (cup.minimo && subtotal < cup.minimo) {
    return { erro: `Pedido mínimo para este cupom: R$ ${formatarPreco(cup.minimo)}` };
  }
  const desconto = +(subtotal * cup.percentual / 100).toFixed(2);
  return { cupom: cup, desconto };
}

const SENHA_PADRAO = "admin";

async function hashSenha(senha) {
  const enc = new TextEncoder();
  const data = enc.encode(senha + "::pizzaria-modao::salt::v1");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function inicializarSenhaAdmin() {
  if (!lerLS("senhaAdmin")) {
    const hash = await hashSenha(SENHA_PADRAO);
    salvarLS("senhaAdmin", hash);
  }
}

async function verificarSenha(senha) {
  return (await hashSenha(senha)) === lerLS("senhaAdmin");
}

async function salvarNovaSenha(novaSenha) {
  salvarLS("senhaAdmin", await hashSenha(novaSenha));
}

async function ehSenhaPadrao() { return await verificarSenha(SENHA_PADRAO); }

function estatisticasHoje() {
  const lista = lerLS("pedidos") || [];
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).getTime();
  const fim = inicio + 24 * 60 * 60 * 1000;

  const pedidosHoje = lista.filter(p => {
    const t = new Date(p.dataHora).getTime();
    return t >= inicio && t < fim;
  });

  const vendas = pedidosHoje.reduce((s, p) => s + (p.total || 0), 0);
  const pendentes = lista.filter(p => p.status !== "Finalizado").length;
  const ticket = pedidosHoje.length > 0 ? vendas / pedidosHoje.length : 0;

  return { pedidosHoje: pedidosHoje.length, vendasHoje: vendas, ticketMedio: ticket, pendentes };
}

function formatarData(iso) {
  const d = new Date(iso);
  const data = d.toLocaleDateString("pt-BR");
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} ${hora}`;
}

function formatarPreco(valor) {
  return Number(valor).toFixed(2).replace(".", ",");
}

function diaDaSemanaKey(date) {
  return ["dom", "seg", "ter", "qua", "qui", "sex", "sab"][date.getDay()];
}

function horarioHoje(config) {
  const h = config.horarios?.[diaDaSemanaKey(new Date())];
  if (!h || h.fechado) return null;
  return h;
}

function lojaAberta(config) {
  const hoje = horarioHoje(config);
  if (!hoje) return false;

  const agora = new Date();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
  const [hAbre, mAbre] = hoje.abre.split(":").map(Number);
  const [hFecha, mFecha] = hoje.fecha.split(":").map(Number);
  const minAbre = hAbre * 60 + mAbre;
  const minFecha = hFecha * 60 + mFecha;

  if (minAbre === minFecha) return false;
  if (minAbre < minFecha) return minutosAgora >= minAbre && minutosAgora < minFecha;
  return minutosAgora >= minAbre || minutosAgora < minFecha;
}

function aplicarCor(cor) {
  if (!cor) return;
  document.documentElement.style.setProperty("--cor-principal", cor);
  document.documentElement.style.setProperty("--cor-principal-escura", escurecerCor(cor, 15));
  document.documentElement.style.setProperty("--cor-principal-rgb", hexParaRgb(cor));
}

function escurecerCor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) - Math.round(255 * percent / 100);
  let g = ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100);
  let b = (num & 0x0000FF) - Math.round(255 * percent / 100);
  r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

function hexParaRgb(hex) {
  const num = parseInt(hex.replace("#", ""), 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

function mostrarToast(mensagem) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = mensagem;
  t.classList.add("ativo");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove("ativo"), 2200);
}
