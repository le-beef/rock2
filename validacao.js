// =========================
// BLOQUEIO DE TELA (SENHA DA PORTARIA)
// =========================
const senhaPortaria = "120805"; // Mude para a senha que a sua equipe da portaria vai usar
const VERSAO_VALIDACAO = "v1";

if (localStorage.getItem("logado_portaria") !== VERSAO_VALIDACAO) {
    let acessoPermitido = false;
    
    while (!acessoPermitido) {
        const senhaDigitada = prompt("🛑 ÁREA RESTRITA DA PORTARIA\nDigite a senha de acesso para validar ingressos:");
        
        // Se a pessoa clicar em "Cancelar", a página fica em branco
        if (senhaDigitada === null) {
            document.body.innerHTML = "<h1 style='color:#d4af37; text-align:center; margin-top:50px;'>Acesso Negado.</h1>";
            break;
        }
        
        // Se a senha estiver correta
        if (senhaDigitada === senhaPortaria) {
            acessoPermitido = true;
            localStorage.setItem("logado_portaria", VERSAO_VALIDACAO);
            alert("✅ Acesso liberado!");
        } else {
            alert("❌ Senha incorreta.");
        }
    }
}

// =========================================================================
// PARTE DA VALIDAÇÃO (Substitua tudo do 'const codigoInput' até o final)
// =========================================================================

const codigoInput = document.getElementById("codigo");
const btnValidar = document.getElementById("btn-validar");
const resultado = document.getElementById("resultado");
const pesquisaInput = document.getElementById("pesquisa");
const btnPesquisar = document.getElementById("btn-pesquisar");
const btnListar = document.getElementById("btn-listar");

const btnCamera = document.getElementById("btn-camera");
const leitorDiv = document.getElementById("leitor");
let html5QrCode; // Variável para guardar o leitor

codigoInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        btnValidar.click();
        
        setTimeout(() => {
            codigoInput.value = '';
            codigoInput.focus();
        }, 500);
    }
});

// =========================
// VALIDAR QR/CÓDIGO
// =========================
btnValidar.addEventListener('click', async () => {
    let codigo = codigoInput.value.trim();

    if(!codigo){
        alert("Digite um código.");
        return;
    }

    // 🔥 CORREÇÃO CRÍTICA: Se o texto escaneado for a URL completa do QR Code, extrai apenas o código após 'cod='
    if (codigo.includes("cod=")) {
        codigo = codigo.split("cod=")[1].split("&")[0];
    }
    
    // Garante letras maiúsculas para bater 100% com o banco de dados
    codigo = codigo.toUpperCase();

    // Limpa o campo e coloca o foco nele para o próximo ingresso
    codigoInput.value = "";
    codigoInput.focus();

    try {
        const snapshot = await refReservas.once("value");
        const reservas = snapshot.val();
	
        if(!reservas){
            resultado.innerHTML = `
            <div style="color:red; font-weight:bold; font-size:1.2rem;">
            ❌ Nenhuma reserva encontrada no sistema.
            </div>
            `;
            return;
        }

        let encontrado = false;

        for(const reservaId in reservas){
            const reserva = reservas[reservaId];

            if(!reserva.convidados){
                continue;
            }

            for(const key in reserva.convidados){
                const convidado = reserva.convidados[key];

                // Compara garantindo caixa alta em ambos os lados
                if(convidado.codigo && convidado.codigo.toUpperCase() === codigo){
                    encontrado = true;

                    // JÁ ENTROU
                    if(convidado.usado){
                        resultado.innerHTML = `
                        <div style="color:red; border: 2px solid red; padding: 15px; border-radius: 10px; background: #fff5f5; font-size:1.1rem;">
                        ❌ ESTE INGRESSO JÁ FOI UTILIZADO!
                        <br><br>
                        <strong>Mesa:</strong> ${reserva.mesa}<br>
                        <strong>Responsável:</strong> ${reserva.responsavel}<br>
                        <strong>Entrada em:</strong> ${convidado.entradaEm || "-"}
                        </div>
                        `;
                        return;
                    }

                    // LIBERA ENTRADA
                    await refReservas
                    .child(reservaId)
                    .child("convidados")
                    .child(key)
                    .update({
                        usado: true,
                        entradaEm: new Date().toLocaleString('pt-BR')
                    });

                    resultado.innerHTML = `
                    <div style="color:green; border: 2px solid green; padding: 15px; border-radius: 10px; background: #f5fff5; font-size:1.1rem;">
                    ✅ ENTRADA LIBERADA!
                    <br><br>
                    <strong>Mesa:</strong> ${reserva.mesa}<br>
                    <strong>Responsável:</strong> ${reserva.responsavel}<br>
                    <strong>Convidado:</strong> Pessoa ${key} de ${reserva.qtd || 1}
                    </div>
                    `;
                    return;
                }
            }
        }

        if(!encontrado){
            resultado.innerHTML = `
            <div style="color:red; border: 2px solid red; padding: 15px; border-radius: 10px; background: #fff5f5;">
            ❌ CÓDIGO INVÁLIDO OU NÃO ENCONTRADO
            <br><small style="color: #666;">Texto processado: ${codigo}</small>
            </div>
            `;
        }

    } catch(error) {
        alert("Erro na validação: " + error.message);
    }
});


// =========================
// PESQUISAR RESERVA
// =========================
btnPesquisar.addEventListener('click', async () => {
    const termo = pesquisaInput.value.trim().toLowerCase();

    if(!termo){
        alert("Digite mesa ou nome.");
        return;
    }

    try {
        const snapshot = await refReservas.once("value");
        const reservas = snapshot.val();
        let html = "";

        for(const reservaId in reservas){
            const reserva = reservas[reservaId];
            const mesa = String(reserva.mesa).toLowerCase();
            const nome = String(reserva.responsavel).toLowerCase();

            if(mesa.includes(termo) || nome.includes(termo)){
                html += `
                <div style="border:1px solid #ccc; padding:15px; margin:15px 0; border-radius:10px; background:#fff; color:black; text-align:left;">
                <h3>Mesa: ${reserva.mesa}</h3>
                <p><strong>Responsável:</strong> ${reserva.responsavel}</p>
                `;

                if(reserva.convidados){
                    for(const key in reserva.convidados){
                        const convidado = reserva.convidados[key];
                        html += `
                        <div style="border-top:1px solid #eee; padding:10px 0; margin-top:5px;">
                        <strong>Convidado ${key}</strong><br>
                        Código: ${convidado.codigo || "-"}<br>
                        Status: ${convidado.usado ? "✅ ENTROU" : "⛔ NÃO ENTROU"}<br>
                        ${convidado.entradaEm ? `Entrada: ${convidado.entradaEm}<br>` : ""}
                        <br>
                        ${!convidado.usado ? 
                        `<button style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;" onclick="marcarEntrada('${reservaId}', '${key}')">MARCAR ENTRADA</button>` : 
                        `<button disabled style="padding:5px 10px; border-radius:5px;">JÁ ENTROU</button>`}
                        </div>
                        `;
                    }
                } else {
                    html += `<p>Nenhum convidado encontrado.</p>`;
                }
                html += `</div>`;
            }
        }

        if(!html){
            html = `<div style="color:white;">Nenhuma reserva encontrada para o termo pesquisado.</div>`;
        }
        resultado.innerHTML = html;
    } catch(error) {
        alert(error.message);
    }
});


// =========================
// MARCAR ENTRADA MANUAL
// =========================
async function marcarEntrada(reservaId, key){
    try {
        await refReservas
        .child(reservaId)
        .child("convidados")
        .child(key)
        .update({
            usado: true,
            entradaEm: new Date().toLocaleString('pt-BR')
        });

        alert("Entrada confirmada manualmente!");

        if(pesquisaInput.value.trim()){
            btnPesquisar.click();
        } else {
            btnListar.click();
        }
    } catch(error) {
        alert(error.message);
    }
}

// =========================
// LISTAR TODAS RESERVAS
// =========================
btnListar.addEventListener('click', async () => {
    try {
        resultado.innerHTML = "Carregando reservas...";
        const snapshot = await refReservas.once("value");
        const reservas = snapshot.val();

        if(!reservas || Object.keys(reservas).length === 0){
            resultado.innerHTML = `<div style="color:white;">Nenhuma reserva encontrada no sistema.</div>`;
            return;
        }

        let html = "";
        const reservasArray = Object.entries(reservas).sort((a,b)=>{
            const mesaA = String(a[1]?.mesa || "");
            const mesaB = String(b[1]?.mesa || "");
            return mesaA.localeCompare(mesaB, 'pt-BR', { numeric: true });
        });

        for(const [reservaId, reserva] of reservasArray){
            let entrou = 0;
            let faltam = 0;

            html += `
            <div style="border:1px solid #ccc; padding:15px; margin:15px 0; border-radius:10px; background:#fff; color:black; text-align:left;">
            <h3>🍷 Mesa: ${reserva.mesa || "-"}</h3>
            <p><strong>Responsável:</strong> ${reserva.responsavel || "-"}</p>
            <p><strong>Total de Pessoas:</strong> ${reserva.qtd || 0}</p>
            `;

            if(reserva.convidados && typeof reserva.convidados === "object"){
                Object.entries(reserva.convidados).forEach(([key, convidado]) => {
                    if(convidado.usado){ entrou++; } else { faltam++; }

                    html += `
                    <div style="border-top:1px solid #eee; padding-top:10px; margin-top:10px;">
                    <strong>Convidado ${key}</strong><br>
                    Código: ${convidado.codigo || "-"}<br>
                    Status: ${convidado.usado ? "✅ ENTROU" : "⛔ NÃO ENTROU"}<br>
                    ${convidado.entradaEm ? `Entrada: ${convidado.entradaEm}<br>` : ""}
                    <br>
                    ${!convidado.usado ? 
                    `<button style="background:#28a745; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;" onclick="marcarEntrada('${reservaId}', '${key}')">MARCAR ENTRADA</button>` : 
                    `<button disabled style="padding:5px 10px; border-radius:5px;">JÁ ENTROU</button>`}
                    </div>
                    `;
                });
            }

            html += `
            <hr>
            <strong>✅ Entraram:</strong> ${entrou} | <strong>⛔ Faltam:</strong> ${faltam}
            </div>
            `;
        }
        resultado.innerHTML = html;
    } catch(error) {
        console.error(error);
        resultado.innerHTML = `<div style="color:red;">Erro ao listar: ${error.message}</div>`;
    }
});


// =========================
// LÓGICA DA CÂMERA (SCANNER)
// =========================
function tocarBipe() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        
        gainNode.gain.setValueAtTime(1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.15);
    } catch (e) {
        console.error("Áudio não suportado:", e);
    }
}

btnCamera.addEventListener("click", () => {
    if (leitorDiv.style.display === "block") {
        if (html5QrCode) {
            html5QrCode.stop().then(() => {
                leitorDiv.style.display = "none";
                btnCamera.innerText = "📷 ABRIR CÂMERA";
            }).catch(err => console.error("Erro ao parar câmera:", err));
        }
        return;
    }

    leitorDiv.style.display = "block";
    btnCamera.innerText = "🛑 FECHAR CÂMERA";

    html5QrCode = new Html5Qrcode("leitor");

    html5QrCode.start(
        { facingMode: "environment" }, 
        {
            fps: 10, 
            qrbox: { width: 250, height: 250 }
        },
        (textoDecodificado) => {
            tocarBipe();
            codigoInput.value = textoDecodificado;
            
            html5QrCode.stop().then(() => {
                leitorDiv.style.display = "none";
                btnCamera.innerText = "📷 ABRIR CÂMERA";
                btnValidar.click();
            });
        },
        (mensagemErro) => {}
    ).catch(err => {
        alert("Erro ao acessar a câmera. Verifique se você deu permissão no navegador.");
        console.error(err);
        leitorDiv.style.display = "none";
        btnCamera.innerText = "📷 ABRIR CÂMERA";
    });
});

// 🔥 BÔNUS EXTRA: Executa a validação automática se a página for aberta direto com o parâmetro '?cod=' na URL
// (Se escanearem usando o app nativo de câmera do próprio celular!)
const urlParams = new URLSearchParams(window.location.search);
const codParam = urlParams.get('cod');
if (codParam) {
    codigoInput.value = codParam;
    btnValidar.click();
}

// =========================================================================
// NOVO: CALCULAR TOTAIS GERAIS EM TEMPO REAL (MANTÉM O ESTILO ORIGINAL)
// =========================================================================
(function() {
    // Cria o elemento do rodapé automaticamente via JS para não precisar mexer no HTML
    let totaisGeraisDiv = document.getElementById("totais-gerais");
    if (!totaisGeraisDiv) {
        totaisGeraisDiv = document.createElement("div");
        totaisGeraisDiv.id = "totais-gerais";
        const container = document.querySelector(".container");
        if (container) {
            container.appendChild(totaisGeraisDiv);
        } else {
            document.body.appendChild(totaisGeraisDiv);
        }
    }

    // Escuta o banco de dados em tempo real
    refReservas.on("value", (snapshot) => {
        const reservas = snapshot.val();
        
        let totalEntrou = 0;
        let totalFaltam = 0;

        if (reservas) {
            for (const reservaId in reservas) {
                const reserva = reservas[reservaId];
                
                if (reserva.convidados && typeof reserva.convidados === "object") {
                    for (const key in reserva.convidados) {
                        const convidado = reserva.convidados[key];
                        if (convidado.usado) {
                            totalEntrou++;
                        } else {
                            totalFaltam++;
                        }
                    }
                }
            }
        }

        // Renderiza o painel herdando o fundo escuro e letras brancas originais do seu CSS
        totaisGeraisDiv.innerHTML = `
            <div style="
                margin-top: 35px;
                padding: 20px;
                border: 1px solid #d4af37;
                border-radius: 12px;
                text-align: center;
            ">
                <h3 style="margin-top: 0; color: #d4af37; letter-spacing: 1px;">📊 RESUMO GERAL DO EVENTO</h3>
                
                <div style="display: flex; justify-content: space-around; margin-top: 15px;">
                    <div>
                        <span style="font-size: 1.6em;">✅</span>
                        <br>
                        <strong style="font-size: 1.4em;">${totalEntrou}</strong>
                        <br>
                        <span style="font-size: 0.85em; opacity: 0.7; font-weight: bold;">JÁ ENTRARAM</span>
                    </div>
                    <div>
                        <span style="font-size: 1.6em;">⛔</span>
                        <br>
                        <strong style="font-size: 1.4em;">${totalFaltam}</strong>
                        <br>
                        <span style="font-size: 0.85em; opacity: 0.7; font-weight: bold;">FALTAM ENTRAR</span>
                    </div>
                </div>
                
                <hr style="border: 0; border-top: 1px solid #333; margin: 15px 0;">
                
                <p style="margin: 0; font-size: 1em;">
                    <strong>👥 Total de Convidados na Lista:</strong> ${totalEntrou + totalFaltam}
                </p>
            </div>
        `;
    });
})();
