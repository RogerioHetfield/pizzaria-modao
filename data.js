/* =====================================================
   data.js
   Funções compartilhadas: LocalStorage com expiração
   de 7 dias, produtos padrão e configurações da loja.
===================================================== */

// 7 dias em milissegundos (validade dos dados salvos)
const SETE_DIAS = 7 * 24 * 60 * 60 * 1000;

// Chaves que NUNCA expiram (dados administrativos da loja)
// Outras chaves (carrinho, cliente, observacao) expiram em 7 dias
const CHAVES_PERMANENTES = [
  "produtos", "config", "pedidos",
  "categorias", "clientes", "funcionarios"
];

/* -----------------------------------------------------
   Produtos padrão (na primeira vez que o site abre)
----------------------------------------------------- */
const PRODUTOS_PADRAO = [
  // ----- TRADICIONAIS -----
  {
    id: 1,
    nome: "Pizza Calabresa",
    descricao: "Molho de tomate, mussarela, calabresa fatiada e cebola.",
    preco: 45.90,
    imagem: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600",
    categoria: "Tradicionais"
  },
  {
    id: 2,
    nome: "Pizza Mussarela",
    descricao: "Molho de tomate, mussarela derretida e orégano.",
    preco: 39.90,
    imagem: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600",
    categoria: "Tradicionais"
  },
  {
    id: 3,
    nome: "Pizza Portuguesa",
    descricao: "Mussarela, presunto, ovos, cebola, ervilha e azeitonas.",
    preco: 49.90,
    imagem: "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600",
    categoria: "Tradicionais"
  },

  // ----- ESPECIAIS -----
  {
    id: 4,
    nome: "Pizza Quatro Queijos",
    descricao: "Mussarela, provolone, parmesão e gorgonzola.",
    preco: 55.90,
    imagem: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600",
    categoria: "Especiais"
  },
  {
    id: 5,
    nome: "Pizza Frango com Catupiry",
    descricao: "Frango desfiado, catupiry cremoso e mussarela.",
    preco: 52.90,
    imagem: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=600",
    categoria: "Especiais"
  },

  // ----- BEBIDAS -----
  {
    id: 6,
    nome: "Coca-Cola 2L",
    descricao: "Refrigerante Coca-Cola gelado, garrafa de 2 litros.",
    preco: 12.00,
    imagem: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600",
    categoria: "Bebidas"
  },
  {
    id: 7,
    nome: "Suco de Laranja 1L",
    descricao: "Suco natural de laranja gelado.",
    preco: 10.00,
    imagem: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600",
    categoria: "Bebidas"
  }
];

// Configurações padrão da loja
const CONFIG_PADRAO = {
  nomeLoja: "Pizzaria Modão",
  whatsapp: "5519991675464",
  taxa: 5.00,
  minimo: 30.00,
  abre: "18:00",
  fecha: "23:00",
  cor: "#FF5722" // cor principal (laranja)
};

/* -----------------------------------------------------
   Salvar valor no LocalStorage com timestamp
----------------------------------------------------- */
function salvarLS(chave, valor) {
  const dados = {
    valor: valor,
    timestamp: Date.now()
  };
  localStorage.setItem(chave, JSON.stringify(dados));
}

/* -----------------------------------------------------
   Ler valor do LocalStorage; expira após 7 dias
----------------------------------------------------- */
function lerLS(chave) {
  const bruto = localStorage.getItem(chave);
  if (!bruto) return null;

  try {
    const dados = JSON.parse(bruto);
    // Dados administrativos nunca expiram
    if (CHAVES_PERMANENTES.includes(chave)) {
      return dados.valor;
    }
    if (Date.now() - dados.timestamp > SETE_DIAS) {
      // Dado vencido — apaga e retorna null
      localStorage.removeItem(chave);
      return null;
    }
    return dados.valor;
  } catch (e) {
    localStorage.removeItem(chave);
    return null;
  }
}

/* -----------------------------------------------------
   Apagar uma chave específica do LocalStorage
----------------------------------------------------- */
function limparLS(chave) {
  localStorage.removeItem(chave);
}

/* -----------------------------------------------------
   Carregar produtos (do LocalStorage ou padrão)
----------------------------------------------------- */
function carregarProdutos() {
  const salvos = lerLS("produtos");
  if (salvos && Array.isArray(salvos) && salvos.length > 0) {
    return salvos;
  }
  salvarLS("produtos", PRODUTOS_PADRAO);
  return PRODUTOS_PADRAO;
}

/* -----------------------------------------------------
   Carregar configurações (mescla com padrões caso falte algo)
----------------------------------------------------- */
function carregarConfig() {
  const salvas = lerLS("config");
  const finais = { ...CONFIG_PADRAO, ...(salvas || {}) };
  if (!salvas) salvarLS("config", finais);
  return finais;
}

/* -----------------------------------------------------
   CATEGORIAS — lista de categorias cadastradas
   Inicializa com as categorias dos produtos padrão
----------------------------------------------------- */
function carregarCategorias() {
  const salvas = lerLS("categorias");
  if (salvas && Array.isArray(salvas) && salvas.length > 0) return salvas;

  // Pega categorias únicas dos produtos atuais
  const prods = carregarProdutos();
  const cats = [...new Set(prods.map(p => p.categoria))].map((nome, i) => ({
    id: i + 1,
    nome
  }));
  salvarLS("categorias", cats);
  return cats;
}

/* -----------------------------------------------------
   PEDIDOS
----------------------------------------------------- */
function carregarPedidos() {
  return lerLS("pedidos") || [];
}

// Status disponíveis para um pedido (em ordem)
const STATUS_PEDIDO = ["Recebido", "Em preparo", "Saiu para entrega", "Finalizado"];

function salvarPedido(pedido) {
  const lista = carregarPedidos();
  lista.unshift(pedido); // mais recente em cima
  salvarLS("pedidos", lista);
}

/* -----------------------------------------------------
   CLIENTES — registrados automaticamente quando pedem
   Deduplicação pelo telefone
----------------------------------------------------- */
function carregarClientes() {
  return lerLS("clientes") || [];
}

function registrarCliente(dados) {
  const lista = carregarClientes();
  const idx = lista.findIndex(c => c.telefone === dados.telefone);
  if (idx >= 0) {
    // Atualiza dados (endereço pode ter mudado)
    lista[idx] = { ...lista[idx], ...dados };
  } else {
    lista.push({ ...dados, criadoEm: new Date().toISOString() });
  }
  salvarLS("clientes", lista);
}

/* -----------------------------------------------------
   FUNCIONÁRIOS
----------------------------------------------------- */
function carregarFuncionarios() {
  return lerLS("funcionarios") || [];
}

/* -----------------------------------------------------
   Formatar data ISO em formato brasileiro DD/MM/YYYY HH:MM
----------------------------------------------------- */
function formatarData(iso) {
  const d = new Date(iso);
  const data = d.toLocaleDateString("pt-BR");
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `${data} ${hora}`;
}

/* -----------------------------------------------------
   Formatar número como moeda BR (sem símbolo)
----------------------------------------------------- */
function formatarPreco(valor) {
  return Number(valor).toFixed(2).replace(".", ",");
}

/* -----------------------------------------------------
   Verificar se a loja está aberta agora
   Aceita horários que cruzam meia-noite (ex: 18:00 → 02:00)
----------------------------------------------------- */
function lojaAberta(config) {
  const agora = new Date();
  const minutosAgora = agora.getHours() * 60 + agora.getMinutes();

  const [hAbre, mAbre] = config.abre.split(":").map(Number);
  const [hFecha, mFecha] = config.fecha.split(":").map(Number);

  const minAbre = hAbre * 60 + mAbre;
  const minFecha = hFecha * 60 + mFecha;

  if (minAbre === minFecha) return false;

  if (minAbre < minFecha) {
    // Horário normal (ex: 18:00 → 23:00)
    return minutosAgora >= minAbre && minutosAgora < minFecha;
  } else {
    // Horário que cruza meia-noite (ex: 18:00 → 02:00)
    return minutosAgora >= minAbre || minutosAgora < minFecha;
  }
}

/* -----------------------------------------------------
   Aplicar cor principal dinamicamente (via CSS variable)
   Calcula uma versão mais escura para hover automaticamente.
----------------------------------------------------- */
function aplicarCor(cor) {
  if (!cor) return;
  document.documentElement.style.setProperty("--cor-principal", cor);
  document.documentElement.style.setProperty("--cor-principal-escura", escurecerCor(cor, 15));
  document.documentElement.style.setProperty("--cor-principal-rgb", hexParaRgb(cor));
}

// Escurece um hex em N% (para o hover)
function escurecerCor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) - Math.round(255 * percent / 100);
  let g = ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100);
  let b = (num & 0x0000FF) - Math.round(255 * percent / 100);
  r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

// Converte hex em "r, g, b" (para usar em rgba)
function hexParaRgb(hex) {
  const num = parseInt(hex.replace("#", ""), 16);
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

/* -----------------------------------------------------
   Mostrar toast (feedback visual)
----------------------------------------------------- */
function mostrarToast(mensagem) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = mensagem;
  t.classList.add("ativo");
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove("ativo"), 2000);
}
