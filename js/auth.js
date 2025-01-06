const emailPattern = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
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
            categoriaSelect = jogador.categorias 
              ? jogador.categorias
              : "todas";
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
                   console.error(
                     "Erro ao atualizar o nome de exibição:",
                      error
                    );
                  });
                }
              }
          $(".loading").fadeOut(500);
          if (!lastAccess) {
            lastAccess = new Date().toISOString();
            sessionStorage.setItem("lastAccess", lastAccess);
            db.ref(`jogadores/${user.uid}`).update({
              lastAccess: lastAccess
            })
            
          }
        })
        .catch((error) => {
          console.error("Erro ao carregar os dados do jogador:", error);
          $(".loading").fadeOut(500);
        });
    } else {
      pontuacao = parseInt(localStorage.getItem("pontuacao")) || 0;
      pontuacaoMax = localStorage.getItem("pontuacaoMax") || 0;
      acertosTotal = localStorage.getItem("acertosTotal") || 0;
      errosTotal = localStorage.getItem("errosTotal") || 0;
      nivelAtual = localStorage.getItem("nivelAtual") || 1;
      conquistas = JSON.parse(localStorage.getItem("conquistas")) || {};
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

function registrarUsuario(email, senha, nomeJogador) {
  auth
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
        categorias: "todas"
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
      Swal.fire({
        icon: "error",
        title: "Erro ao criar conta",
        text: error.message,
        confirmButtonText: "OK",
        customClass: {
          confirmButton: "btn btn-primary",
        },
      });
    });
}

$btnLogin.on("click", function () {
    showmModalLoginRegister();
});

$btnLogout.on("click", logout);

function showmModalLoginRegister() {
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
        .then((userCredential) => {
          userLogado = userCredential.user;
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
    confirmButtonText: `<i class="fas fa-user-plus"></i> Registrar`,
    customClass: {
      confirmButton: "btn btn-primary",
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

      return { email, senha, nomeJogador };
    },
  }).then((result) => {
    if (result.isConfirmed) {
      const { email, senha, nomeJogador } = result.value;
      registrarUsuario(email, senha, nomeJogador);
    }
  });
}

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

verificarAutenticacao();
