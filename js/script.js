const firebaseConfig = {
  apiKey: "AIzaSyBc7bsTNRmThM989rENIf9jYxLtOCPWRBk",
  authDomain: "jogo-da-forca-1faed.firebaseapp.com",
  databaseURL: "https://jogo-da-forca-1faed-default-rtdb.firebaseio.com",
  projectId: "jogo-da-forca-1faed",
  storageBucket: "jogo-da-forca-1faed.firebasestorage.app",
  messagingSenderId: "635259446092",
  appId: "1:635259446092:web:2b86b6a80f111f1064e5e9",
};

firebase.initializeApp(firebaseConfig);
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

// Função para carregar categorias do Firebase
function carregarCategorias() {
  const categoriasRef = db.ref("palavras");
  categoriasRef.once("value").then((snapshot) => {
    if (snapshot.exists()) {
      const categorias = snapshot.val();
      $categoriaSelect
        .empty()
        .append("<option value=''>Escolha uma categoria</option>");
      $.each(categorias, (categoria, palavras) => {
        $categoriaSelect.append(
          `<option value="${categoria}">${categoria}</option>`
        );
      });
    }
  });
}

carregarCategorias();

// Função para iniciar o jogo
function iniciarJogo() {
  const categoria = $categoriaSelect.val();
  if (!categoria) {
    alert("Selecione uma categoria!");
    return;
  }

  const palavrasRef = db.ref(`palavras/${categoria}`);
  palavrasRef.once("value").then((snapshot) => {
    if (snapshot.exists()) {
      const palavras = snapshot.val();
      palavraAtual =
        palavras[Math.floor(Math.random() * palavras.length)].toUpperCase();
      $dicaDiv.text(`Categoria: ${categoria}`);
      $palavraDiv.text("_ ".repeat(palavraAtual.length).trim());
      criarTeclado();
      erros = 0;
      partesBoneco.forEach((parte) => parte.hide());
    }
  });
}

// Função para criar o teclado
function criarTeclado() {
  $tecladoDiv.empty();
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((letra) => {
    const $botao = $(`<button>${letra}</button>`);
    $botao.on("click", () => verificarLetra(letra));
    $tecladoDiv.append($botao);
  });
}

// Função para verificar a letra
function verificarLetra(letra) {
  const letrasPalavra = palavraAtual.split("");
  const letrasExibidas = $palavraDiv.text().split(" ");
  if (letrasPalavra.includes(letra)) {
    letrasPalavra.forEach((l, i) => {
      if (l === letra) letrasExibidas[i] = letra;
    });
    $palavraDiv.text(letrasExibidas.join(" "));
    if (!letrasExibidas.includes("_")) alert("Você ganhou!");
  } else {
    mostrarErro();
  }
}

// Função para mostrar um erro (desenhar o boneco)
function mostrarErro() {
  if (erros < partesBoneco.length) {
    partesBoneco[erros].show();
    erros++;
    if (erros === partesBoneco.length)
      alert(`Você perdeu! A palavra era ${palavraAtual}`);
  }
}

// Evento de clique para iniciar o jogo
$iniciarJogoBtn.on("click", iniciarJogo);
