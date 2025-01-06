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
let pontuacao;
let pontuacaoMax;
let acertosTotal;
let errosTotal;
let nivelAtual;
let conquistas = {};
let letrasclicadas = [];
let top10List = [];
let niveisList = [];
let conquistasList = [];

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

        const usadasCompressed = localStorage.getItem("palavrasUsadas") || "";
        const usadas = usadasCompressed ? usadasCompressed.split(",") : [];

        palavras = palavras.filter((palavra) => !usadas.includes(palavra));

        if (palavras.length === 0) {
          localStorage.removeItem("palavrasUsadas");
          iniciarJogo();
          return;
        }

        palavraAtual = palavras[Math.floor(Math.random() * palavras.length)];
        usadas.push(palavraAtual);
        const novasUsadasCompressed = usadas.join(",");
        localStorage.setItem("palavrasUsadas", novasUsadasCompressed);

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
        acertosTotal++;
        acertoParaAvancar++;
        localStorage.setItem("pontuacao", pontuacao);
        localStorage.setItem("acertosTotal", acertosTotal);
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
      localStorage.setItem("pontuacao", pontuacao);
      localStorage.setItem("errosTotal", errosTotal);
      if (userLog) {
        db.ref(`jogadores/${userLog.uid}`).update({
          pontuacao: pontuacao,
          errosTotal: errosTotal,
        });

        userLogado.pontuacao = pontuacao;
        userLogado.errosTotal = errosTotal;

        verificarConquistasJogador(userLogado);
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
});

$btnTop10.on("click", showTop10Modal);

function showTop10Modal() {
  // Construir o HTML da tabela
  const tableRows = top10List
    .map((player, index) => {
      const position = index + 1;
      const name = player?.nome || "-";
      const score = player?.recorde || "-";

      let positionHTML = `${position}º`;
      if (position === 1) {
        positionHTML = `<i class="fas fa-medal" style="color: #ffd700;" title="1º Lugar"></i>`;
      } else if (position === 2) {
        positionHTML = `<i class="fas fa-medal" style="color: #c0c0c0;" title="2º Lugar"></i>`;
      } else if (position === 3) {
        positionHTML = `<i class="fas fa-medal" style="color: #cd7f32;" title="3º Lugar"></i>`;
      }

      return `
        <tr class="table-row">
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

// Função para verificar conquistas do jogador
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
  let countConquistadas = Object.keys(conquistasObtidas).length;


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

  // Verificar conquistas
  conquistasList.forEach((conquista) => {
    if (!conquistasObtidas[conquista.id]) {
      let conquistada = false;

      if (
        conquista.categoria === "porTotalDeAcertos" &&
        acertosTotais >= conquista.acertosNecessarios
      ) {
        conquistada = true;
        countConquistadas++;
      } else if (
        conquista.categoria === "porAcertosConsecutivos" &&
        acertosConsecutivos >= conquista.acertosNecessarios
      ) {
        conquistada = true;
        countConquistadas++;
      } else if (
        conquista.categoria === "porTotalDeErros" &&
        errosTotais >= conquista.errosNecessarios
      ) {
        conquistada = true;
        countConquistadas++;
      } else if (
        conquista.categoria === "porAtingirNiveis" &&
        nivelAtual >= conquista.nivelNecessario
      ) {
        conquistada = true;
        countConquistadas++;
      } else if (
        conquista.categoria === "porConquistasConquistadas" &&
        countConquistas === countConquistadas
      ) {
        conquistada = true;
      }

      if (conquistada) {
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
  let conquistasTrophHtml = "";
  conquistasList.forEach((conquista) => {
    const conquistado = conquistasJogador[conquista.id];
    let cor = "#654321";
    let opacity = 0.1;
    let status = "Ainda não conquistado";

    if (conquistado) {
      opacity = 1;
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
      }

      countConquistadas++;
      const dataConquista = new Date(conquistado.dataConquista);
      const dataFormatada = dataConquista.toLocaleDateString("pt-BR");
      status = `Conquistada em ${dataFormatada}`;
    }

    conquistasTrophHtml += `
      <div style="margin: 10px 0; display: flex; align-items: center;" class="conquista-item ${
        conquistado ? "conquistado" : ""
      }">
        <i class="fas fa-trophy" style="color: ${cor}; opacity: ${opacity}; font-size: 20px; margin-right: 10px;"
        title="${conquista.nome} - ${status}"></i>
        <div>
          <strong>${conquista.nome}</strong><br>
          <span style="font-size: 12px;">${conquista.descricao}</span><br>
          <span style="font-size: 14px;">${status}</span>
        </div>
      </div>`;
  });

  conquistasHTML += `
    <p class="conquista-text">
      <p style="text-align: center;" class="conquistado">${
        levelMax ? "" : `Progresso para próximo nível:`
      }</p></p>
      <div style="display: flex; align-items: center;">
      <span style="font-size: 12px;" class="conquistado"><strong>Nível ${
        jogador.nivel
      }</strong></span>
        <div style="flex: 1; height: 10px; background-color: #ddd; border-radius: 5px; overflow: hidden; margin: 10px;">
          <div class="progress-bar-conquista" style="width: ${progresso}%; height: 100%;"></div>
        </div>
        <span style="font-size: 12px;" class="${
          levelMax ? "conquistado" : ""
        }">${textoProximoNivel}</span>
      </div>
    </p>
    <p class="conquista-text"><strong>Pontuação Atual:</strong> ${jogador.pontuacao}</p>
    <p class="conquista-text"><strong>Total de erros:</strong> ${jogador.errosTotal}</p>
    <p class="conquista-text"><strong>Total de acertos:</strong> ${jogador.acertosTotal}</p>
    <p class="conquista-text"><strong>Maior pontuação alcançada:</strong> ${jogador.recorde}</p><br>
    <p class="conquista-text"><strong>Conquistas:</strong> ${countConquistadas}/${countConquistas}</p>
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
    "porTotalDeAcertos",
    "porAcertosConsecutivos",
    "porTotalDeErros",
    "porAtingirNiveis",
    "porConquistasConquistadas",
  ];
  const ordemNiveis = ["bronze", "prata", "ouro", "platina", "diamante"];

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
            Object.entries(itens)
              .sort(
                ([, a], [, b]) =>
                  a.conquistasNecessarias - b.conquistasNecessarias
              )
              .forEach(([chave, conquista]) => {
                conquistasList.push({
                  categoria,
                  id: chave,
                  nome: conquista.nome,
                  descricao: conquista.descricao,
                });
              });
          }
        }
      }

      if (userLog) verificarConquistasJogador(userLogado);
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
function updateLeaderboard() {
  db.ref("jogadores")
    .orderByChild("recorde")
    .limitToLast(10)
    .once("value", (snapshot) => {
      const jogadores = snapshot.val();
      top10List = Object.values(jogadores)
        .map((jogador) => ({ nome: jogador.nome, recorde: jogador.recorde }))
        .sort((a, b) => b.recorde - a.recorde); // Ordena os 10 maiores pela pontuação
    });
}

// Atualizar o Top 10 em tempo real
db.ref("jogadores").on("child_changed", (snapshot) => {
  const jogadorAtualizado = snapshot.val();
  if (jogadorAtualizado.recorde) {
    updateLeaderboard();
  }
});

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

carregarCategorias();
updateLeaderboard();
searchLevels();
carregarConquistas();
