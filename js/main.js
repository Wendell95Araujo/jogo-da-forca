// Seletores jQuery
const $iniciarJogoBtn = $("#iniciarJogo");
const $reiniciarJogoBtn = $("#reiniciarJogo");
const $palavraDiv = $("#palavra");
const $tecladoDiv = $("#teclado");
const $dicaDiv = $("#dica");
const $configButton = $("#configuracoes");
const $pontuacoesDiv = $("#Pontuações");
const $pontuacao = $("#pontuacao");
const $record = $("#record");

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
let userLog = null;
let userLogado = null;
let categoriasList = [];
let categoriaSelect = localStorage.getItem("categoriaSelect") || "todas";
let palavraAtual = "";
let erros = 0;
let pontuacao;
let pontuacaoMax;
let letrasclicadas = [];

// Função para carregar categorias do Firebase
function carregarCategorias() {
  const categoriasRef = db.ref("palavras");
  categoriasRef.once("value").then((snapshot) => {
    if (snapshot.exists()) {
      const categorias = snapshot.val();
      $.each(categorias, (categoria, palavras) => {
        categoriasList.push(
          `<option value="${categoria}">${categoria.toUpperCase()}</option>`
        );
      });
    }
  });
}

// Função para iniciar o jogo
function iniciarJogo() {
  letrasclicadas = [];
  $pontuacoesDiv.css("display", "flex");
  $pontuacao.text(`Pontuação: ${pontuacao}`);
  $record.text(`Recorde: ${pontuacaoMax}`);
  $iniciarJogoBtn.hide();
  $reiniciarJogoBtn.css("display", "flex");
  const categoria = categoriaSelect || "todas";
  let categoriaText = "";

  if (userLog) {
    db.ref(`jogadores/${userLog.uid}`).update({
      recorde: pontuacaoMax,
      pontuacao: pontuacao,
    });
  }

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
        const categoriaPalavra = Object.keys(snapshot.val()).find((cat) =>
          snapshot.val()[cat].includes(palavraAtual)
        );
        categoriaText = categoriaPalavra
          ? categoriaPalavra
          : "Categoria desconhecida";
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

function verificarLetra(letra) {
  if (!letra) return;
  if (letrasclicadas.includes(letra)) return;

  letrasclicadas.push(letra);

  const letraNormalizada = normalizarString(letra.toUpperCase());
  const palavraNormalizada = normalizarString(palavraAtual);
  const letrasExibidas = $palavraDiv.text().split("");

  const letrasNaPalavra = Array.from(palavraNormalizada);
  const letrasNaPalavraPadrao = Array.from(palavraAtual.toUpperCase());

  $(`.letra${letra}`).prop("disabled", true);

  if (letrasNaPalavra.includes(letraNormalizada)) {
    letrasNaPalavra.forEach((l, i) => {
      if (l === letra) letrasExibidas[i] = letrasNaPalavraPadrao[i];
    });
    $(`.letra${letra}`).addClass("correta");
    $palavraDiv.text(letrasExibidas.join(""));

    if (!letrasExibidas.includes("_")) {
      Swal.fire({
        toast: true,
        position: "center",
        showConfirmButton: true,
        allowEscapeKey: false,
        confirmButtonText: "Continuar",
        customClass: {
          confirmButton: "btn btn-primary",
        },
        title: `<i class="fa-solid fa-check"></i> Parabéns, você acertou a palavra!`,
      }).then((result) => {
        if (!result.isConfirmed) return;
        pontuacao++;
        localStorage.setItem("pontuacao", pontuacao);
        if (pontuacao > pontuacaoMax) {
          pontuacaoMax = pontuacao;
          localStorage.setItem("pontuacaoMax", pontuacaoMax);
          $record.text(`Recorde: ${pontuacaoMax}`);
        }
        $pontuacao.text(`Pontuação: ${pontuacao}`);
        iniciarJogo();
      });
    }
  } else {
    erros++;
    $(`.letra${letra}`).addClass("errada");
    if (erros < partesBoneco.length) {
      partesBoneco[erros - 1].show();
    } else {
      swal
        .fire({
          toast: true,
          position: "center",
          showConfirmButton: true,
          allowEscapeKey: false,
          confirmButtonText: "Novo Jogo",
          customClass: {
            confirmButton: "btn btn-primary",
          },
          title: `<i class="fa-solid fa-xmark"></i> Que pena, você perdeu!`,
          html: `A palavra era: <strong>${palavraAtual.toUpperCase()}</strong>. Tente novamente!`,
        })
        .then((result) => {
          if (!result.isConfirmed) return;
          pontuacao = 0;
          localStorage.setItem("pontuacao", pontuacao);
          iniciarJogo();
        });
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

  const todasAsLetras = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const linhas = [
    {
      id: "tecladoCompleto",
      classe: "teclado-completo",
      letras: todasAsLetras,
    },
    { id: "teclado-linha1", classe: "teclado-linha", letras: "QWERTYUIOP" },
    { id: "teclado-linha2", classe: "teclado-linha", letras: "ASDFGHJKL" },
    { id: "teclado-linha3", classe: "teclado-linha", letras: "ZXCVBNM" },
  ];

  const criarLinha = ({ id, classe, letras }) => {
    const $linha = $(`<div id="${id}" class="${classe}"></div>`);
    letras.split("").forEach((letra) => {
      const $botao = $(`<button class="letra${letra}">${letra}</button>`);
      $botao.on("click", () => verificarLetra(letra));
      $linha.append($botao);
    });
    return $linha;
  };

  linhas.forEach((linha) => {
    $tecladoDiv.append(criarLinha(linha));
  });

  $(document).on("keydown", (e) => {
    const letra = e.key.toUpperCase();
    if (todasAsLetras.includes(letra)) {
      verificarLetra(letra);
    }
  });
}

// Evento de clique para iniciar o jogo
$iniciarJogoBtn.on("click", iniciarJogo);

// Evento de clique para reiniciar o jogo
$reiniciarJogoBtn.on("click", () => {
  if (pontuacao === 0) {
    iniciarJogo();
  } else {
    swal
      .fire({
        toast: true,
        position: "center",
        showConfirmButton: true,
        allowEscapeKey: false,
        confirmButtonText: "Novo Jogo",
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        customClass: {
          confirmButton: "btn btn-primary",
          cancelButton: "btn btn-secondary",
        },
        title: `<i class="fa-solid fa-rotate-right"></i> Reiniciar Jogo?`,
        text: `Sua pontuação atual é ${pontuacao} ${
          pontuacao === 1 ? "ponto" : "pontos"
        }. Tem certeza que deseja reiniciar o jogo? Você perderá essa pontuação.`,
      })
      .then((result) => {
        if (!result.isConfirmed) return;
        pontuacao = 0;
        localStorage.setItem("pontuacao", pontuacao);
        iniciarJogo();
      });
  }
});

// Evento de clique alterar configurações
$configButton.on("click", () => {
  swal.fire({
    title: `<i class="fa-solid fa-cog"></i> Configurações`,
    html: `
    <div class="container-form">
      <label for="categoria" class="form-label">Selecione uma categoria:</label>
            <select id="categoria" class="swal2-input">
                <option value='todas'>TODAS</option>
                ${categoriasList.join("")}
            </select>
    </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Salvar",
    showLoaderOnConfirm: true,
    customClass: {
      confirmButton: "btn btn-primary",
      cancelButton: "btn btn-secondary",
      title: "swal2-title",
    },
    didOpen: () => {
      $("#categoria").val(categoriaSelect);
    },
    preConfirm: () => {
      const categoria = $("#categoria").val();
      localStorage.setItem("categoriaSelect", categoria);
      categoriaSelect = categoria;
      carregarCategorias();
    },
  });
});

carregarCategorias();
