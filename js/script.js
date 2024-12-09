const db = firebase.database();

// Seletores jQuery
const $categoriaSelect = $("#categoria");
const $iniciarJogoBtn = $("#iniciarJogo");
const $palavraDiv = $("#palavra");
const $tecladoDiv = $("#teclado");
const $dicaDiv = $("#dica");

// Partes do boneco
const partesBoneco = [
  $(".cabeca"),
  $(".corpo"),
  $(".braco-esq"),
  $(".braco-dir"),
  $(".perna-esq"),
  $(".perna-dir"),
];

// Variáveis do jogo
let palavraAtual = "";
let erros = 0;
let pontuacao = 0;
let pontuacaoMax = localStorage.getItem("pontuacaoMax") || 0;

// Função para carregar categorias do Firebase
function carregarCategorias() {
  const categoriasRef = db.ref("palavras");
  categoriasRef.once("value").then((snapshot) => {
    if (snapshot.exists()) {
      const categorias = snapshot.val();
      $categoriaSelect.empty().append("<option value='todas'>Todas</option>");
      $.each(categorias, (categoria, palavras) => {
        $categoriaSelect.append(
          `<option value="${categoria}">${categoria}</option>`
        );
      });
    }
  });
}

// Função para iniciar o jogo
function iniciarJogo() {
  const categoria = $categoriaSelect.val();
  let categoriaText = "";

  const palavrasRef = db.ref(
    categoria === "todas" ? "palavras" : `palavras/${categoria}`
  );
  palavrasRef.once("value").then((snapshot) => {
    if (snapshot.exists()) {
      let palavras = [];
      if (categoria === "todas") {
        snapshot.forEach((catSnap) => {
          palavras.push(...catSnap.val());
        });
      } else {
        palavras = snapshot.val();
      }
      const usadas = JSON.parse(sessionStorage.getItem("palavrasUsadas")) || [];
      palavras = palavras.filter((palavra) => !usadas.includes(palavra));

      if (palavras.length === 0) {
        sessionStorage.removeItem("palavrasUsadas");
        iniciarJogo();
        return;
      }

      palavraAtual = palavras[Math.floor(Math.random() * palavras.length)];
      usadas.push(palavraAtual);
      sessionStorage.setItem("palavrasUsadas", JSON.stringify(usadas));

      if (categoria === "todas") {
        const categoriaPalavra = Object.keys(snapshot.val()).find(cat => snapshot.val()[cat].includes(palavraAtual));
        categoriaText = categoriaPalavra ? categoriaPalavra : "Categoria desconhecida";
      } else {
        categoriaText = categoria;
      }

      $dicaDiv.text(`CATEGORIA: ${categoriaText.toUpperCase()}`);
      mostrarPalavra();
      criarTeclado();
      erros = 0;
      partesBoneco.forEach((parte) => parte.hide());
    }
  });
}

function mostrarPalavra() {
  const palavraFormatada = Array.from(palavraAtual)
    .map((letra) => {
      if (letra === " ") return " ";
      if (letra === "-") return "-";
      return "_";
    })
    .join("");

  $palavraDiv.text(palavraFormatada);
}

function verificarLetra(letra, $botao) {
  if (!letra) return;

  const letraNormalizada = normalizarString(letra.toUpperCase());
  const palavraNormalizada = normalizarString(palavraAtual);
  const letrasExibidas = $palavraDiv.text().split("");

  const letrasNaPalavra = Array.from(palavraNormalizada);
  const letrasNaPalavraPadrao = Array.from(palavraAtual.toUpperCase());

  $botao.prop("disabled", true);

  if (letrasNaPalavra.includes(letraNormalizada)) {
    letrasNaPalavra.forEach((l, i) => {
      if (l === letra) letrasExibidas[i] = letrasNaPalavraPadrao[i];
    });
    $botao.addClass("correta");
    $palavraDiv.text(letrasExibidas.join(""));

    if (!letrasExibidas.includes("_")) {
      alert("Parabéns, você venceu!");
      pontuacao++;
      if (pontuacao > pontuacaoMax) {
        pontuacaoMax = pontuacao;
        localStorage.setItem("pontuacaoMax", pontuacaoMax);
      }
      iniciarJogo();
    }
  } else {
    erros++;
    $botao.addClass("errada");
    if (erros < partesBoneco.length) {
      partesBoneco[erros - 1].show();
    } else {
      alert(`Você perdeu! A palavra era: ${palavraAtual}`);
      pontuacao = 0;
      iniciarJogo();
    }
  }
}

// Função para remover acentos e caracteres especiais
function normalizarString(str) {
  if (typeof str !== "string") {
    return str;
  }
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

// Função para criar o teclado
function criarTeclado() {
  $tecladoDiv.empty();
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letra) => {
    const $botao = $(`<button>${letra}</button>`);
    $botao.on("click", () => verificarLetra(letra, $botao));
    $tecladoDiv.append($botao);
  });
}

// Evento de clique para iniciar o jogo
$iniciarJogoBtn.on("click", iniciarJogo);

carregarCategorias();
