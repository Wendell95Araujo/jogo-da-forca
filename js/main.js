// Seletores jQuery
const $iniciarJogoBtn = $("#iniciarJogo");
const $reiniciarJogoBtn = $("#reiniciarJogo");
const $palavraDiv = $("#palavra");
const $tecladoDiv = $("#teclado");
const $dicaDiv = $("#dica");
const $configButton = $("#configuracoes");
const $pontuacoesDiv = $("#Pontuações");
const $btnTop10 = $("#btnTop10");
const $btnLogin = $("#btnLogin");
const $btnLogout = $("#btnLogout");
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
let categoriaSelect = localStorage.getItem("categoriasSelect") || "todas";
let palavraAtual = "";
let erros = 0;
let pontuacao;
let pontuacaoMax;
let letrasclicadas = [];
let top10List = [];

// Função para carregar categorias do Firebase
function carregarCategorias() {
  const categoriasRef = db.ref("palavras");
  categoriasRef.once("value").then((snapshot) => {
    if (snapshot.exists()) {
      const categorias = snapshot.val();
      categoriasList = [];
      $.each(categorias, (categoria, palavras) => {
        categoriasList.push(categoria);
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

  const categoriasSelecionadas =
    categoriaSelect && categoriaSelect.length > 0 ? categoriaSelect : ["todas"];

  let palavras = [];

  if (userLog) {
    db.ref(`jogadores/${userLog.uid}`).update({
      recorde: pontuacaoMax,
      pontuacao: pontuacao,
      categorias: categoriasSelecionadas,
    });
  }

  const palavrasRef = db.ref("palavras");
  palavrasRef
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        if (categoriasSelecionadas.includes("todas")) {
          snapshot.forEach((catSnap) => {
            palavras.push(...catSnap.val());
          });
        } else {
          categoriasSelecionadas.forEach((categoria) => {
            if (snapshot.val()[categoria]) {
              palavras.push(...snapshot.val()[categoria]);
            }
          });
        }

        const usadasCompressed = sessionStorage.getItem("palavrasUsadas") || "";
        const usadas = usadasCompressed ? usadasCompressed.split(",") : [];

        palavras = palavras.filter((palavra) => !usadas.includes(palavra));

        if (palavras.length === 0) {
          sessionStorage.removeItem("palavrasUsadas");
          iniciarJogo();
          return;
        }

        palavraAtual = palavras[Math.floor(Math.random() * palavras.length)];
        usadas.push(palavraAtual);
        const novasUsadasCompressed = usadas.join(",");
        sessionStorage.setItem("palavrasUsadas", novasUsadasCompressed);

        const categoriaPalavra = Object.keys(snapshot.val()).find((cat) =>
          snapshot.val()[cat].includes(palavraAtual)
        );
        const categoriaText = categoriaPalavra || "Categoria desconhecida";

        $dicaDiv.text(`CATEGORIA: ${categoriaText.toUpperCase()}`);
        mostrarPalavra();
        criarTeclado();
        erros = 0;
        partesBoneco.forEach((parte) => parte.hide());
      }
    })
    .catch((error) => {
      console.error("Erro ao carregar palavras:", error);
      Swal.fire(
        "Erro",
        "Não foi possível carregar as palavras. Tente novamente.",
        "error"
      );
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
        confirmButtonText: `<i class="fa-solid fa-check"></i> Continuar`,
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
          confirmButtonText: `<i class="fa-solid fa-rotate-right"></i> Novo Jogo`,
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
        confirmButtonText: `<i class="fa-solid fa-rotate-right"></i> Reiniciar Jogo`,
        showCancelButton: true,
        cancelButtonText: `<i class="fas fa-times"></i> Cancelar`,
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
      <label for="categoria" class="form-label">Selecione as categorias:</label>
      <div id="categoriaCheckboxes">
        <div class="form-check">
          <input type="checkbox" class="form-check-input categoria-checkbox" id="todas" value="todas">
          <label class="form-check-label" for="todas">TODAS</label>
        </div>
        ${categoriasList
          .map(
            (categoria) => `
            <div class="form-check">
              <input type="checkbox" class="form-check-input categoria-checkbox" id="${categoria}" value="${categoria}">
              <label class="form-check-label" for="${categoria}">${categoria.toUpperCase()}</label>
            </div>
          `
          )
          .join("")}
      </div>
    </div>
    `,
    showCancelButton: true,
    confirmButtonText: `<i class="fas fa-save"></i> Salvar`,
    cancelButtonText: `<i class="fas fa-times"></i> Cancelar`,
    showLoaderOnConfirm: true,
    customClass: {
      confirmButton: "btn btn-primary",
      cancelButton: "btn btn-secondary",
      title: "swal2-title",
    },
    didOpen: () => {
      const selectedCategorias = JSON.parse(
        localStorage.getItem("categoriasSelect")
      ) || ["todas"];

      if (selectedCategorias.includes("todas")) {
        $("#categoriaCheckboxes input").prop("checked", true);
      } else {
        selectedCategorias.forEach((cat) => {
          $(`#categoriaCheckboxes input[value="${cat}"]`).prop("checked", true);
        });
      }

      $("#todas").on("change", function () {
        const isChecked = $(this).is(":checked");
        $("#categoriaCheckboxes input").prop("checked", isChecked);
      });

      $(".categoria-checkbox")
        .not("#todas")
        .on("change", function () {
          const allChecked =
            $(".categoria-checkbox").not("#todas").length ===
            $(".categoria-checkbox:checked").not("#todas").length;
          $("#todas").prop("checked", allChecked);
        });
    },
    preConfirm: () => {
      const selectedCategorias = [];
      const isTodasChecked = $("#todas").is(":checked");

      if (isTodasChecked) {
        selectedCategorias.push("todas");
      } else {
        $("#categoriaCheckboxes input:checked").each(function () {
          selectedCategorias.push($(this).val());
        });
      }

      if (selectedCategorias.length === 0) {
        Swal.showValidationMessage("Selecione pelo menos uma categoria!");
        return false;
      }

      localStorage.setItem(
        "categoriasSelect",
        JSON.stringify(selectedCategorias)
      );
      categoriaSelect = selectedCategorias;

      if (userLog) {
        db.ref(`jogadores/${userLog.uid}`).update({
          categorias: categoriaSelect,
        });
      }
    },
  });
});

$btnTop10.on("click", showTop10Modal);

function showTop10Modal() {
  // Construir o HTML da tabela
  const tableRows = top10List
    .map((player, index) => {
      const position = `${index + 1}º`;
      const name = player?.nome || "-";
      const score = player?.recorde || "-";
      return `
        <tr class="table-row">
          <td>${position}</td>
          <td>${name}</td>
          <td>${score}</td>
        </tr>
      `;
    })
    .join("");

  // Estrutura completa da tabela
  const tableHTML = `
    <table id="top10-table">
      <thead>
        <tr class="table-header">
          <th>Posição</th>
          <th>Nome</th>
          <th>Recorde</th>
        </tr>
      </thead>
      <tbody>
        ${
          tableRows ||
          "<tr><td colspan='3' style='text-align: center;'>Nenhum jogador encontrado</td></tr>"
        }
      </tbody>
    </table>
  `;

  // Exibir o modal do SweetAlert
  Swal.fire({
    title: `<i class="fas fa-trophy"></i> Top 10 Jogadores`,
    html: tableHTML,
    confirmButtonText: `<i class="fas fa-times"></i> Fechar`,
    customClass: {
      confirmButton: "btn btn-primary",
    },
  });
}

// Função para buscar e ordenar o Top 10
function updateLeaderboard() {
  db.ref("jogadores").once("value", (snapshot) => {
    const jogadores = snapshot.val();
    top10List = Object.values(jogadores)
      .sort((a, b) => b.recorde - a.recorde)
      .slice(0, 10);
  });
}

// Atualizar o Top 10 em tempo real
db.ref("jogadores").on("value", updateLeaderboard);

carregarCategorias();
