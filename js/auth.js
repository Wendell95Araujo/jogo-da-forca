// Variáveis globais
const emailPattern = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;

// Função validar usuário autenticado
function verificarAutenticacao() {
  auth.onAuthStateChanged((user) => {
    if (user) {
      userLog = user;
      const userRef = db.ref(`jogadores/${user.uid}`);
      userRef
        .once("value")
        .then((snapshot) => {
          if (snapshot.exists()) {
            const jogador = snapshot.val();
            userLogado = jogador;

            pontuacao = jogador.pontuacao;
            pontuacaoMax = jogador.recorde;
            acertoParaAvancar = jogador.acertoParaAvancar;
            acertosTotal = jogador.acertosTotal || 0;
            errosTotal = jogador.errosTotal || 0;
            nivelAtual = jogador.nivelAtual || 1;
            conquistas = jogador.conquistas || {};
            categoriaSelect = jogador.categorias ? jogador.categorias : "todas";
            localStorage.setItem(
              "categoriasSelect",
              JSON.stringify(categoriaSelect)
            );

            $("#usuarioLogado").text(jogador.nome);
            $("#btnLogin").hide();
            $("#btnLogout").css("display", "flex");
            $("#logado").css("display", "flex");
            $("#btnTop10").css("display", "flex");
            $("#btnConquistas").css("display", "flex");
            $("#lembreteLogin").hide();

            if (!user.displayName) {
              user
                .updateProfile({
                  displayName: jogador.nome,
                })
                .then(() => {
                  console.log("Nome de exibição atualizado com sucesso!");
                })
                .catch((error) => {
                  console.error("Erro ao atualizar o nome de exibição:", error);
                });
            }
          }
          $(".loading").fadeOut(500);

          updateLeaderboard();
          carregarConquistas();

          // Atualizar o Top 10 em tempo real
          db.ref("jogadores").on("child_changed", (snapshot) => {
            const jogadorAtualizado = snapshot.val();
            if (jogadorAtualizado.recorde) {
              updateLeaderboard();
            }
          });
          if (!lastAccess) {
            lastAccess = new Date().toISOString();
            sessionStorage.setItem("lastAccess", lastAccess);
            db.ref(`jogadores/${user.uid}`).update({
              lastAccess: lastAccess,
            });
          }
        })
        .catch((error) => {
          console.error("Erro ao carregar os dados do jogador:", error);
          $(".loading").fadeOut(500);
        });
    } else {
      pontuacao = parseInt(localStorage.getItem("pontuacao")) || 0;
      pontuacaoMax = localStorage.getItem("pontuacaoMax") || 0;
      $("#btnConquistas").hide();
      $("#btnTop10").hide();
      $("#btnLogin").css("display", "flex");
      $("#btnLogout").hide();
      $("#logado").hide();
      $("#lembreteLogin").show();
      $(".loading").fadeOut(500);
    }
  });
}

// Função exibir modal Login
$btnLogin.on("click", showmModalLogin);

function showmModalLogin() {
  Swal.fire({
    title: `<i class="fas fa-user"></i> Entrar`,
    html: `
      <form>
        <div class="container-form">
            <label class="form-label" for="email">Email:</label>
            <input type="email" name="email" id="emailLogin" class="swal2-input" placeholder="Digite seu email" required autocomplete="username">
        </div>
            <div class="container-form">
            <label class="form-label" for="senha">Senha:</label>
            <input type="password" name="senha" id="senhaLogin" class="swal2-input" placeholder="Digite sua senha" required autocomplete="current-password">
        </div>
        <div class="container-form">
            <span id="esqueciSenha">Esqueci minha senha</span>
        </div>
      </form>
        `,
    showCloseButton: true,
    showDenyButton: true,
    confirmButtonText: `<i class="fas fa-sign-in-alt"></i> Entrar`,
    denyButtonText: `<i class="fas fa-user-plus"></i> Registrar`,
    showLoaderOnConfirm: true,
    customClass: {
      confirmButton: "btn btn-primary",
      denyButton: "btn btn-secondary",
    },
    didOpen: () => {
      const swalModal = Swal.getPopup();
      swalModal.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          Swal.clickConfirm();
        }
      });

      $("#esqueciSenha").on("click", forgotPassword);
    },
    preConfirm: () => {
      const email = $("#emailLogin").val().trim();
      const senha = $("#senhaLogin").val().trim();

      if (!email || !senha) {
        Swal.showValidationMessage("Por favor, preencha todos os campos!");
        return false;
      }

      if (!emailPattern.test(email)) {
        Swal.showValidationMessage("Por favor, digite um email válido!");
        return false;
      }

      return auth
        .signInWithEmailAndPassword(email, senha)
        .then(() => {
          Swal.fire({
            toast: true,
            position: "center",
            icon: "success",
            title: "Login efetuado com sucesso!",
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false,
          }).then(() => {
            verificarAutenticacao();
          });
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;

          if (errorCode === "auth/user-not-found") {
            Swal.showValidationMessage("Usuário não encontrado.");
          } else if (errorCode === "auth/wrong-password") {
            Swal.showValidationMessage("Senha incorreta.");
          } else if (errorCode === "auth/invalid-email") {
            Swal.showValidationMessage("Email inválido.");
          } else if (errorCode === "auth/internal-error") {
            Swal.showValidationMessage("Usuário e/ou senha incorretos.");
          } else {
            console.error("Erro inesperado:", errorMessage);
            Swal.showValidationMessage("Ocorreu um erro. Tente novamente.");
          }
          return false;
        });
    },
  }).then((result) => {
    if (result.isDenied) {
      showModalRegister();
    }
  });
}

// Função exibir modal Register
function showModalRegister() {
  Swal.fire({
    title: `<i class="fas fa-user-plus"></i> Registrar`,
    html: `
      <form>
        <div class="container-form">
          <label class="form-label" for="email">Email:</label>
          <input type="email" name="email" id="emailCadastro" class="swal2-input" placeholder="Digite seu email" required autocomplete="username">
        </div>
        <div class="container-form">
          <label class="form-label" for="senha">Senha:</label>
          <input type="password" name="senha" id="senhaCadastro" class="swal2-input" placeholder="Digite sua senha" required autocomplete="new-password">
        </div>
        <div class="container-form">
          <label class="form-label" for="senhaConfirm">Confirme a senha:</label>
          <input type="password" name="senhaConfirm" id="senhaConfirmCadastro" class="swal2-input" placeholder="Digite sua senha" required autocomplete="new-password">
        </div>
        <div class="container-form">
          <label class="form-label" for="nome">Apelido:</label>
          <input type="text" name="nome" id="nomeCadastro" class="swal2-input" placeholder="Digite seu nome" required>
        </div>
      </form>
      `,
    showCloseButton: true,
    showDenyButton: true,
    confirmButtonText: `<i class="fas fa-user-plus"></i> Registrar`,
    denyButtonText: `<i class="fas fa-sign-in-alt"></i> Entrar`,
    customClass: {
      confirmButton: "btn btn-primary",
      denyButton: "btn btn-secondary",
    },
    didOpen: () => {
      const swalModal = Swal.getPopup();
      swalModal.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          Swal.clickConfirm();
        }
      });
    },
    preConfirm: () => {
      const email = $("#emailCadastro").val().trim();
      const senha = $("#senhaCadastro").val().trim();
      const senhaConfirm = $("#senhaConfirmCadastro").val().trim();
      const nomeJogador = $("#nomeCadastro").val().trim();

      if (!email || !senha || !senhaConfirm || !nomeJogador) {
        Swal.showValidationMessage("Por favor, preencha todos os campos!");
        return false;
      }

      if (!emailPattern.test(email)) {
        Swal.showValidationMessage("Por favor, digite um email válido!");
        return false;
      }

      if (senha.length < 6) {
        Swal.showValidationMessage("A senha deve ter pelo menos 6 caracteres!");
        return false;
      }

      if (senha !== senhaConfirm) {
        Swal.showValidationMessage("As senhas devem ser iguais!");
        return false;
      }

      return db
        .ref("jogadores")
        .orderByChild("nome")
        .equalTo(nomeJogador)
        .once("value")
        .then((snapshot) => {
          if (snapshot.exists()) {
            Swal.showValidationMessage(
              "Esse apelido já está em usado. Por favor, escolha outro!"
            );
            return false;
          }

          return auth
            .createUserWithEmailAndPassword(email, senha)
            .then((userCredential) => {
              const user = userCredential.user;
              const uid = user.uid;
              const userRef = db.ref(`jogadores/${uid}`);
              userRef.set({
                nome: nomeJogador,
                pontuacao: 0,
                recorde: 0,
                nivel: 1,
                errosTotal: 0,
                acertosTotal: 0,
                categorias: ["todas"],
              });

              Swal.fire({
                toast: true,
                position: "center",
                icon: "success",
                title: "Conta criada com sucesso!",
                text: `Bem-vindo, ${nomeJogador}!`,
                confirmButtonText: "OK",
                customClass: {
                  confirmButton: "btn btn-primary",
                },
              });
              verificarAutenticacao();
            })
            .catch((error) => {
              const errorCode = error.code;

              if (errorCode === "auth/email-already-in-use") {
                Swal.showValidationMessage(
                  "O e-mail já está sendo usado por outra conta."
                );
              } else if (errorCode === "auth/invalid-email") {
                Swal.showValidationMessage(
                  "Email inválido. Verifique e tente novamente."
                );
              } else if (errorCode === "auth/weak-password") {
                Swal.showValidationMessage(
                  "A senha é muito fraca. Use pelo menos 6 caracteres."
                );
              } else {
                console.error("Erro inesperado:", error.message);
                Swal.showValidationMessage(
                  "Ocorreu um erro inesperado. Tente novamente."
                );
              }
              return false;
            });
        })
        .catch((error) => {
          console.error(error);
          Swal.showValidationMessage(
            "Ocorreu um erro inesperado. Tente novamente."
          );
          return false;
        });
    },
  }).then((result) => {
    if (result.isDenied) {
      showmModalLogin();
    }
  });
}

// Função exibir modal logout
$btnLogout.on("click", logout);

function logout() {
  Swal.fire({
    title: "Sair",
    text: "Tem certeza que deseja sair?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: `<i class="fas fa-person-to-door"></i> Sim, sair`,
    cancelButtonText: `<i class="fas fa-times"></i> Cancelar`,
    customClass: {
      confirmButton: "btn btn-primary",
      cancelButton: "btn btn-secondary",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      auth.signOut().then(() => {
        userLogado = null;
        $("#btnAuth").html(
          `<i class="fas fa-user"></i>
            <span>Entrar</span>`
        );
        $("#logado").css("display", "none");
        localStorage.clear();
        Swal.fire({
          toast: true,
          position: "center",
          icon: "success",
          title: "Saida efetuada com sucesso!",
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
        });
      });
    }
  });
}

// Função esqueci senha
function forgotPassword() {
  swal
    .fire({
      title: "<i class='fas fa-key'></i> Recuperar senha",
      html: `
        <form>
          <div class="container-form">
            <label class="form-label" for="email">Email:</label>
            <input type="email" name="email" id="emailRecuperar" class="swal2-input" placeholder="Digite seu email" required autocomplete="username">
          </div>
        </form>
        `,
      showCloseButton: true,
      confirmButtonText: `<i class="fas fa-key"></i> Recuperar senha`,
      customClass: {
        confirmButton: "btn btn-primary",
      },
      preConfirm: () => {
        const email = $("#emailRecuperar").val().trim();
        if (!email) {
          Swal.showValidationMessage("Por favor, preencha o campo email!");
          return false;
        }

        if (!emailPattern.test(email)) {
          Swal.showValidationMessage("Por favor, digite um email válido!");
          return false;
        }

        return { email };
      },
    })
    .then((result) => {
      if (result.isConfirmed) {
        const { email } = result.value;
        auth.sendPasswordResetEmail(email).then(() => {
          Swal.fire({
            toast: true,
            position: "center",
            icon: "success",
            title:
              "Um link de redefinição de senha foi enviado para o seu email. Se não tiver recebido, verifique sua caixa de spam.",
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
          });
        });
      }
    });
}

// Chamadas funções ao carregar arquivo
verificarAutenticacao();
