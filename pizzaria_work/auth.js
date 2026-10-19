
// LOGIN PADRÃO (você pode mudar)
const usuarioPadrao = "admin";
const senhaPadrao = "123456";

function fazerLogin() {
  const usuario = document.getElementById("usuario").value;
  const senha = document.getElementById("senha").value;

  if (usuario === usuarioPadrao && senha === senhaPadrao) {
    localStorage.setItem("logado", "true");
    window.location.href = "admin.html";
  } else {
    alert("Usuário ou senha incorretos");
  }
}