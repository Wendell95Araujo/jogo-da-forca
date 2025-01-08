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
let acertoParaAvancar = 0;
let erros = 0;
let pontuacao = 0;
let pontuacaoMax = 0;
let acertosTotal = 0;
let errosTotal = 0;
let nivelAtual = 1;
let conquistas = {};
let letrasclicadas = [];
let top10List = [];
let niveisList = [];
let conquistasList = [];
let lastAccess = sessionStorage.getItem("lastAccess") || null;
let todasPalavras = {};
let palavrasUsadas = [];

function carregarPalavra() {
  const palavrasRef = db.ref("palavras");
  palavrasRef
    .once("value")
    .then((snapshot) => {
      if (snapshot.exists()) {
        todasPalavras = snapshot.val();
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

  // Carregar palavras usadas do localStorage
  const usadasCompressed = localStorage.getItem("palavrasUsadas") || "";
  palavrasUsadas = usadasCompressed ? usadasCompressed.split(",") : [];
}

// Função iniciar o jogo
$iniciarJogoBtn.on("click", iniciarJogo);

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

  if (categoriasSelecionadas.includes("todas")) {
    Object.values(todasPalavras).forEach((catPalavras) => {
      palavras.push(...catPalavras);
    });
  } else {
    categoriasSelecionadas.forEach((categoria) => {
      if (todasPalavras[categoria]) {
        palavras.push(...todasPalavras[categoria]);
      }
    });
  }

  palavras = palavras.filter((palavra) => !palavrasUsadas.includes(palavra));

  if (palavras.length === 0) {
    localStorage.removeItem("palavrasUsadas");
    palavrasUsadas = [];
    iniciarJogo();
    return;
  }

  palavraAtual = palavras[Math.floor(Math.random() * palavras.length)];
  palavrasUsadas.push(palavraAtual);
  localStorage.setItem("palavrasUsadas", palavrasUsadas.join(","));

  const categoriaPalavra = Object.keys(todasPalavras).find((cat) =>
    todasPalavras[cat].includes(palavraAtual)
  );
  const categoriaText = categoriaPalavra || "Categoria desconhecida";

  $dicaDiv.text(`CATEGORIA: ${categoriaText.toUpperCase()}`);
  mostrarPalavra();
  criarTeclado();
  erros = 0;
  partesBoneco.forEach((parte) => parte.hide());
}

// Função para exibir palavra na tela
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

// Função para verifica letra selecionada
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
      pontuacao++;
      acertosTotal++;
      acertoParaAvancar++;
      localStorage.setItem("pontuacao", pontuacao);
      if (pontuacao > pontuacaoMax) {
        pontuacaoMax = pontuacao;
        localStorage.setItem("pontuacaoMax", pontuacaoMax);
        $record.text(`Recorde: ${pontuacaoMax}`);
      }
      $pontuacao.text(`Pontuação: ${pontuacao}`);
      if (userLog) {
        db.ref(`jogadores/${userLog.uid}`).update({
          recorde: pontuacaoMax,
          pontuacao: pontuacao,
          acertosTotal: acertosTotal,
          acertoParaAvancar: acertoParaAvancar,
        });

        userLogado.recorde = pontuacaoMax;
        userLogado.pontuacao = pontuacao;
        userLogado.acertosTotal = acertosTotal;
        userLogado.acertoParaAvancar = acertoParaAvancar;
      }
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
        if (userLogado) {
          verificarConquistasJogador(userLogado);
        }
        iniciarJogo();
      });
    }
  } else {
    erros++;
    $(`.letra${letra}`).addClass("errada");
    if (erros < partesBoneco.length) {
      partesBoneco[erros - 1].show();
    } else {
      pontuacao = 0;
      errosTotal++;
      if (userLog) {
        db.ref(`jogadores/${userLog.uid}`).update({
          pontuacao: pontuacao,
          errosTotal: errosTotal,
        });

        userLogado.pontuacao = pontuacao;
        userLogado.errosTotal = errosTotal;
      }
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
          if (userLogado) {
            verificarConquistasJogador(userLogado);
          }
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

// Função para criar o teclado e eventos de click teclado físico
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

// Função reiniciar o jogo
$reiniciarJogoBtn.on("click", reiniciarJogo);

function reiniciarJogo() {
  if (pontuacao === 0) {
    iniciarJogo();
  } else {
    return swal
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
        if (result.isConfirmed) {
          pontuacao = 0;
          errosTotal++;
          localStorage.setItem("pontuacao", pontuacao);
          if (userLog) {
            db.ref(`jogadores/${userLog.uid}`).update({
              pontuacao: 0,
              errosTotal: errosTotal,
            });
          }
          iniciarJogo();
        }
      });
  }
}

// Função alterar configurações
$configButton.on("click", configGame);

function configGame() {
  let showEditPlayer = false;
  if (userLogado) showEditPlayer = true;
  swal
    .fire({
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
      showCloseButton: true,
      showDenyButton: showEditPlayer,
      confirmButtonText: `<i class="fas fa-save"></i> Salvar`,
      denyButtonText: `<i class="fas fa-user-edit"></i> Editar Perfil`,
      showLoaderOnConfirm: true,
      customClass: {
        confirmButton: "btn btn-primary",
        denyButton: "btn btn-secondary",
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
            $(`#categoriaCheckboxes input[value="${cat}"]`).prop(
              "checked",
              true
            );
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
    })
    .then((result) => {
      if (result.isDenied) {
        editPlayer();
      }
    });
}

// Funçao exibir modal top10
$btnTop10.on("click", showTop10Modal);
function showTop10Modal() {
  const tableRows = top10List
    .map((player, index) => {
      const position = player?.posicao || "-";
      const name = player?.nome || "-";
      const score = player?.recorde || 0;
      const uid = player?.uid || "-";

      const isCurrentUser = uid === userLog.uid;

      let highlightClass = "";
      let positionHTML = `${position}º`;

      if (isCurrentUser) {
        highlightClass = "highlight";
      }

      if (position === 1) {
        positionHTML = `<i class="fas fa-medal" style="color: #ffd700;" title="1º Lugar"></i>`;
        if (isCurrentUser) highlightClass = "highlight-first";
      } else if (position === 2) {
        positionHTML = `<i class="fas fa-medal" style="color: #c0c0c0;" title="2º Lugar"></i>`;
        if (isCurrentUser) highlightClass = "highlight-second";
      } else if (position === 3) {
        positionHTML = `<i class="fas fa-medal" style="color: #cd7f32;" title="3º Lugar"></i>`;
        if (isCurrentUser) highlightClass = "highlight-third";
      }

      return `
        <tr class="table-row ${highlightClass}">
          <td>${positionHTML}</td>
          <td>${name}</td>
          <td>${score}</td>
        </tr>
      `;
    })
    .join("");

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

  Swal.fire({
    title: `<i class="fas fa-ranking-star"></i> Top 10 Jogadores`,
    html: tableHTML,
    showConfirmButton: false,
    showCloseButton: true,
  });
}

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

// Função para verificar conquistas e mudanças de nível do jogador
function verificarConquistasJogador(jogador) {
  const acertosTotais = jogador.acertosTotal || 0;
  const acertosParaAvancar = jogador.acertoParaAvancar || 0;
  const acertosConsecutivos = jogador.recorde || 0;
  const errosTotais = jogador.errosTotal || 0;
  const nivelAtual = jogador.nivel || 1;
  const conquistasObtidas = jogador.conquistas || {};
  let novoNivel = nivelAtual;
  let conquistasParaExibir = [];
  let countConquistas = conquistasList.length - 1;
  let conquistasBronze = 0;
  let conquistasPrata = 0;
  let conquistasOuro = 0;
  let conquistasPlatina = 0;
  let conquistasDiamante = 0;
  let conquistasSupremo = 0;

  let conquistadasBronze = 0;
  let conquistadasPrata = 0;
  let conquistadasOuro = 0;
  let conquistadasPlatina = 0;
  let conquistadasDiamante = 0;
  let conquistadasSupremo = 0;

  let countConquistadas = Object.keys(conquistasObtidas).length;

  Object.keys(conquistasObtidas).forEach((idConquista) => {
    if (idConquista.includes("Bronze")) conquistadasBronze++;
    if (idConquista.includes("Prata")) conquistadasPrata++;
    if (idConquista.includes("Ouro")) conquistadasOuro++;
    if (idConquista.includes("Platina")) conquistadasPlatina++;
    if (idConquista.includes("Diamante")) conquistadasDiamante++;
    if (idConquista.includes("Supremo")) conquistadasSupremo++;
  });

  conquistasList.forEach((conquista) => {
    if (conquista.categoria !== "porConquistasConquistadas") {
      if (conquista.id.includes("Bronze")) conquistasBronze++;
      if (conquista.id.includes("Prata")) conquistasPrata++;
      if (conquista.id.includes("Ouro")) conquistasOuro++;
      if (conquista.id.includes("Platina")) conquistasPlatina++;
      if (conquista.id.includes("Diamante")) conquistasDiamante++;
      if (conquista.id.includes("Supremo")) conquistasSupremo++;
    }
  });

  console.log(conquistasSupremo);

  // Verificar se o jogador avançou de nível
  niveisList.forEach((nivel) => {
    if (acertosParaAvancar >= nivel.acertosParaAvancar) {
      novoNivel = nivel.nivel;
    }
  });

  if (novoNivel > nivelAtual) {
    acertoParaAvancar = 0;
    conquistasParaExibir.push({
      icon: '<i class="fas fa-trophy"></i>',
      title: "Parabéns!",
      text: `Você alcançou o nível ${novoNivel}`,
    });

    userLogado.nivel = novoNivel;
    userLogado.acertoParaAvancar = acertoParaAvancar;
    db.ref(`jogadores/${userLog.uid}`).update({
      nivel: novoNivel,
      acertoParaAvancar: acertoParaAvancar,
    });
  }

  const nivelExibicao = nivelAtual > novoNivel ? nivelAtual : novoNivel;

  // Verificar conquistas
  conquistasList.forEach((conquista) => {
    if (!conquistasObtidas[conquista.id]) {
      let conquistada = false;

      if (
        conquista.categoria === "porTotalDeAcertos" &&
        acertosTotais >= conquista.acertosNecessarios
      ) {
        conquistada = true;
      } else if (
        conquista.categoria === "porAcertosConsecutivos" &&
        acertosConsecutivos >= conquista.acertosNecessarios
      ) {
        conquistada = true;
      } else if (
        conquista.categoria === "porTotalDeErros" &&
        errosTotais >= conquista.errosNecessarios
      ) {
        conquistada = true;
      } else if (
        conquista.categoria === "porAtingirNiveis" &&
        nivelExibicao >= conquista.nivelNecessario
      ) {
        conquistada = true;
      } else if (conquista.categoria === "porConquistasConquistadas") {
        if (
          conquista.id.includes("Bronze") &&
          conquistadasBronze >= conquistasBronze
        ) {
          conquistada = true;
        } else if (
          conquista.id.includes("Prata") &&
          conquistadasPrata >= conquistasPrata
        ) {
          conquistada = true;
        } else if (
          conquista.id.includes("Ouro") &&
          conquistadasOuro >= conquistasOuro
        ) {
          conquistada = true;
        } else if (
          conquista.id.includes("Platina") &&
          conquistadasPlatina >= conquistasPlatina
        ) {
          conquistada = true;
        } else if (
          conquista.id.includes("Diamante") &&
          conquistadasDiamante >= conquistasDiamante
        ) {
          conquistada = true;
        } else if (countConquistas === countConquistadas) {
          conquistada = true;
        }
      }

      if (conquistada) {
        countConquistadas++;

        if (conquista.id.includes("Bronze")) conquistadasBronze++;
        else if (conquista.id.includes("Prata")) conquistadasPrata++;
        else if (conquista.id.includes("Ouro")) conquistadasOuro++;
        else if (conquista.id.includes("Platina")) conquistadasPlatina++;
        else if (conquista.id.includes("Diamante")) conquistadasDiamante++;

        conquistasObtidas[conquista.id] = {
          dataConquista: new Date().toISOString(),
        };

        conquistasParaExibir.push({
          icon: '<i class="fas fa-medal"></i>',
          title: "Conquista desbloqueada!",
          text: `${conquista.nome}: ${conquista.descricao}`,
        });
      }
    }
  });

  db.ref(`jogadores/${userLog.uid}/conquistas`).update(conquistasObtidas);
  userLogado.conquistas = conquistasObtidas;

  function exibirProximaConquista() {
    if (conquistasParaExibir.length > 0) {
      const conquista = conquistasParaExibir.shift();
      swal
        .fire({
          toast: true,
          position: "center",
          iconHtml: conquista.icon,
          title: conquista.title,
          text: conquista.text,
          confirmButtonText: `<i class="fas fa-check"></i> OK`,
          customClass: {
            confirmButton: "btn btn-primary",
            icon: "custom-icon-class",
          },
        })
        .then(() => {
          exibirProximaConquista();
        });
    }
  }

  exibirProximaConquista();
}

// Função para exibir conquistas do jogador
$("#btnConquistas").on("click", function () {
  if (userLog) {
    exibirConquistasJogador(userLogado);
  }
});

function exibirConquistasJogador(jogador) {
  const conquistasJogador = jogador.conquistas || {};
  const nivelAtual = niveisList.find((n) => n.nivel === jogador.nivel);
  const proximoNivel = niveisList.find((n) => n.nivel === jogador.nivel + 1);

  let progresso = 100;
  let levelMax = true;
  let textoProximoNivel = "Máximo alcançado!";
  let countConquistadas = 0;
  let countConquistas = conquistasList.length;

  if (nivelAtual && proximoNivel) {
    const pontosInicioNivelAtual = proximoNivel.acertosParaAvancar;

    const progressoAtual = pontosInicioNivelAtual - jogador.acertoParaAvancar;
    const pontosParaAvancar = pontosInicioNivelAtual;

    progresso =
      100 -
      Math.max(
        0,
        Math.min((progressoAtual / pontosParaAvancar) * 100, 100)
      ).toFixed(2);
    textoProximoNivel = `Nível ${proximoNivel.nivel}`;
    levelMax = false;
  }

  let conquistasHTML = '<div style="text-align: left;">';
  let conquistasTrophHtml = '<div class="conquista-item-container">';
  conquistasList.forEach((conquista) => {
    const conquistado = conquistasJogador[conquista.id];
    let cor = "#fefcf3";
    let opacity = 0.5;
    let status = "Ainda não conquistado";

    if (conquistado) {
      opacity = 1;
      cor = "#654321";
      if (conquista.id === "mestreConquistas") {
        cor = "#5f4b8b";
      } else if (conquista.id.includes("Bronze")) {
        cor = "#cd7f32";
      } else if (conquista.id.includes("Prata")) {
        cor = "#c0c0c0";
      } else if (conquista.id.includes("Ouro")) {
        cor = "#ffd700";
      } else if (conquista.id.includes("Platina")) {
        cor = "#e5e4e2";
      } else if (conquista.id.includes("Diamante")) {
        cor = "#b9f2ff";
      } else if (conquista.id.includes("Supremo")) {
        cor = "#ff69b4";
      }

      countConquistadas++;
      const dataConquista = new Date(conquistado.dataConquista);
      const dataFormatada = dataConquista.toLocaleDateString("pt-BR");
      status = `Conquistada em ${dataFormatada}`;
    }

    conquistasTrophHtml += `
      <div class="conquista-item ${conquistado ? "conquistado" : ""}">
        <i class="fas fa-trophy" style="color: ${cor}; font-size: 20px; margin-right: 10px;"
        title="${conquista.nome} - ${status}"></i>
        <div style="opacity: ${opacity};">
          <strong>${conquista.nome}</strong><br>
          <span style="font-size: 12px;">${conquista.descricao}</span><br>
          <span style="font-size: 14px;">${status}</span>
        </div>
      </div>`;
  });

  conquistasTrophHtml += "</div>";
  conquistasHTML += `
    <p class="conquista-text">
      <p style="text-align: center;" class="conquistado">${ levelMax ? "" : `Progresso para próximo nível:`}</p></p>
      <div style="display: flex; align-items: center;">
      <span style="font-size: 12px;" class="conquistado"><strong>Nível ${jogador.nivel }</strong></span>
        <div style="flex: 1; height: 10px; background-color: #ddd; border-radius: 5px; overflow: hidden; margin: 10px;">
          <div class="progress-bar-conquista" style="width: ${progresso}%; height: 100%;"></div>
        </div>
        <span style="font-size: 12px;" class="${ levelMax ? "conquistado" : ""}">${textoProximoNivel}</span>
      </div>
    </p>
    <p class="conquista-text"><strong>Pontuação Atual:</strong> ${jogador.pontuacao}</p>
    <p class="conquista-text"><strong>Total de erros:</strong> ${jogador.errosTotal}</p>
    <p class="conquista-text"><strong>Total de acertos:</strong> ${jogador.acertosTotal}</p>
    <p class="conquista-text"><strong>Maior pontuação alcançada:</strong> ${jogador.recorde}</p><br>
    <p class="conquista-text contador-conquistas"><strong>Conquistas:</strong> ${countConquistadas}/${countConquistas}</p>
  `;

  conquistasHTML += conquistasTrophHtml;
  conquistasHTML += "</div>";

  Swal.fire({
    title: `<i class="fas fa-trophy"></i> Conquistas de ${jogador.nome}`,
    html: conquistasHTML,
    showConfirmButton: false,
    showCloseButton: true,
  });
}

// Função para carregar as conquistas
function carregarConquistas() {
  const conquistasRef = db.ref("conquistas");
  const ordemCategorias = [
    "porTotalDeErros",
    "porAcertosConsecutivos",
    "porTotalDeAcertos",
    "porAtingirNiveis",
    "porConquistasConquistadas",
  ];
  const ordemNiveis = [
    "bronze",
    "prata",
    "ouro",
    "platina",
    "diamante",
    "supremo",
  ];

  conquistasRef.once("value").then((snapshot) => {
    if (snapshot.exists()) {
      const conquistas = snapshot.val();

      for (const categoria of ordemCategorias) {
        if (conquistas[categoria]) {
          const itens = conquistas[categoria];

          if (
            [
              "porTotalDeAcertos",
              "porAcertosConsecutivos",
              "porTotalDeErros",
            ].includes(categoria)
          ) {
            ordemNiveis.forEach((nivel) => {
              for (const [chave, conquista] of Object.entries(itens)) {
                if (chave.toLowerCase().includes(nivel)) {
                  conquistasList.push({
                    categoria,
                    id: chave,
                    nome: conquista.nome,
                    descricao: conquista.descricao,
                    acertosNecessarios: conquista.acertosNecessarios || null,
                    errosNecessarios: conquista.errosNecessarios || null,
                  });
                }
              }
            });
          } else if (categoria === "porAtingirNiveis") {
            Object.entries(itens)
              .sort(([, a], [, b]) => a.nivelNecessario - b.nivelNecessario)
              .forEach(([chave, conquista]) => {
                conquistasList.push({
                  categoria,
                  id: chave,
                  nome: conquista.nome,
                  descricao: conquista.descricao,
                  nivelNecessario: conquista.nivelNecessario,
                });
              });
          } else if (categoria === "porConquistasConquistadas") {
            ordemNiveis.push("mestre");
            ordemNiveis.forEach((nivel) => {
              for (const [chave, conquista] of Object.entries(itens)) {
                if (chave.toLowerCase().includes(nivel)) {
                  conquistasList.push({
                    categoria,
                    id: chave,
                    nome: conquista.nome,
                    descricao: conquista.descricao,
                  });
                }
              }
            });
          }
        }
      }

      if (userLogado) verificarConquistasJogador(userLogado);
    } else {
      console.warn("Nenhuma conquista encontrada no Firebase.");
    }
  });
}

// Função para buscar os niveis
function searchLevels() {
  db.ref("niveis").once("value", (snapshot) => {
    const niveis = snapshot.val();
    niveisList = Object.values(niveis);
  });
}

// Função para buscar e ordenar o Top 10
async function updateLeaderboard() {
  const allPlayersSnapshot = await db
    .ref("jogadores")
    .orderByChild("recorde")
    .once("value");

  const allPlayers = Object.entries(allPlayersSnapshot.val() || {})
    .map(([uid, jogador]) => ({
      uid,
      nome: jogador.nome,
      recorde: jogador.recorde,
      acertosTotal: jogador.acertosTotal || 0,
      errosTotal: jogador.errosTotal || 0,
    }))
    .sort(
      (a, b) =>
        b.recorde - a.recorde ||
        b.acertosTotal - a.acertosTotal ||
        a.errosTotal - b.errosTotal ||
        a.uid.localeCompare(b.uid)
    );

  const userPosition =
    allPlayers.findIndex((jogador) => jogador.uid === userLog.uid) + 1;

  top10List = allPlayers.slice(0, 10).map((jogador, index) => ({
    ...jogador,
    posicao: index + 1,
  }));

  if (userPosition > 10) {
    const userData = allPlayers.find((jogador) => jogador.uid === userLog.uid);

    if (userData) {
      top10List.push({
        ...userData,
        posicao: userPosition,
      });
    }
  }
}

// Função editar nome do jogador
function editPlayer() {
  Swal.fire({
    title: `<i class="fas fa-user-edit"></i> Editar perfil`,
    html: `
      <form>
        <div class="container-form">
          <label class="form-label" for="nome">Apelido:</label>
          <input type="text" name="nome" id="nomeEdit" class="swal2-input" placeholder="Digite seu nome" value="${userLogado.nome}" required>
        </div>
      </form>
      `,
    showCloseButton: true,
    confirmButtonText: `<i class="fas fa-save"></i> Salvar`,
    customClass: {
      confirmButton: "btn btn-primary",
    },
    preConfirm: () => {
      const nomeJogador = $("#nomeEdit").val().trim();

      if (!nomeJogador) {
        Swal.showValidationMessage("Por favor, preencha o campo apelido!");
        return false;
      }

      return { nomeJogador };
    },
  }).then((result) => {
    if (result.isConfirmed) {
      const { nomeJogador } = result.value;
      db.ref(`jogadores/${userLog.uid}`)
        .update({ nome: nomeJogador })
        .then(() => {
          Swal.fire({
            icon: "success",
            title: "Sucesso",
            text: "Informações atualizadas com sucesso!",
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            allowOutsideClick: false,
            allowEscapeKey: false,
          }).then(() => {
            userLogado.nome = nomeJogador;
            $("#usuarioLogado").text(nomeJogador);
          });
        });
    }
  });
}

// Chamadas funções ao carregar arquivo
carregarPalavra();
carregarCategorias();
searchLevels();
