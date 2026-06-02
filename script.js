// LOGIN PERSISTENTE
const senhaCorreta = "1212";

// IDENTIFICADOR DA SENHA
const VERSAO_LOGIN = "1212";

// VERIFICA LOGIN
if (localStorage.getItem("logado") !== VERSAO_LOGIN) {

    let acessoPermitido = false;

    while (!acessoPermitido) {

        const senhaDigitada = prompt("Por favor, digite a senha para acessar o mapa:");

        // CANCELAR
        if (senhaDigitada === null) {
            location.reload();
            break;
        }

        // SENHA CORRETA
        if (senhaDigitada === senhaCorreta) {

            acessoPermitido = true;

            // SALVA LOGIN
            localStorage.setItem("logado", VERSAO_LOGIN);

            alert("Acesso concedido!");

        } else {

            alert("Senha incorreta. Tente novamente.");

        }
    }
}

function gerarCodigoReserva(mesaNumero){

    const aleatorio =
        Math.random()
        .toString(36)
        .substring(2,8)
        .toUpperCase();

    return `LB-${mesaNumero}-${aleatorio}`;
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Seletores
    const mesas = document.querySelectorAll('.mesa');
    const modalOverlay = document.getElementById('modal-mesa');
    const modalDisplayId = document.getElementById('mesa-id-display');
    const formOcupacao = document.getElementById('form-ocupacao');
    const botoesFechar = document.querySelectorAll('.btn-fechar');
    const btnLiberar = document.querySelector('.btn-liberar');
    const btnExportar = document.getElementById('btn-exportar');
    const btnEmitirVale = document.getElementById('btn-emitir-vale');
    const btnBaixarVale = document.getElementById('btn-baixar-vale');
    
    // Seletores dos Contadores e Inputs
    const contadorMesas = document.getElementById('contador-mesas'); 
    const contadorPessoas = document.getElementById('contador-pessoas'); 
    const inputPessoas = document.getElementById('qtd-pessoas'); 
    
    // Seletor para o Botão de Reset
    const btnResetGeral = document.getElementById('btn-reset-geral');

    // Senha específica para o reset geral
    const SENHA_RESET_GERAL = "120805"; 

    // Seletores para a Lista
    const listaMesasOcupadas = document.getElementById('lista-mesas-ocupadas');
    
    let mesaSelecionada = null;

    // 2. ☁️ CARREGAR DADOS DO FIREBASE EM TEMPO REAL
    const carregarStatusMesas = () => {
        if (typeof refMesas === 'undefined') {
            console.error("Firebase 'refMesas' não está definido.");
            return;
        }

        refMesas.on('value', (snapshot) => {
            const statusAtualizado = snapshot.val();
            let listaHTML = '';
            let contadorM = 0; // Contador de Mesas
            let totalP = 0;   // Contador de Pessoas

            mesas.forEach(mesa => {
                const mesaId = mesa.id;
                const mesaNome = mesa.dataset.nome;
                const statusMesa = statusAtualizado && statusAtualizado[mesaId] ? statusAtualizado[mesaId] : null;

                if (statusMesa && statusMesa.status === 'ocupada') {
                    mesa.classList.add('ocupada');
                    
                    // Somando totais
                    contadorM++;
                    const qtdPessoasNaMesa = parseInt(statusMesa.qtd || 1);
                    totalP += qtdPessoasNaMesa;
                    
                    // Salva os dados no elemento DOM
                    mesa.dataset.dados = JSON.stringify({ 
    nome: statusMesa.nome, 
    obs: statusMesa.obs,
    pagamento: statusMesa.pagamento,
    valor: statusMesa.valor,
    qtd: qtdPessoasNaMesa,

    codigoReserva:
    statusMesa.codigoReserva || null,

    valeEmitido:
    statusMesa.valeEmitido || false
});
                    
                    // CONSTRUÇÃO DO ITEM DA LISTA (Conforme seu print)
                    const nome = statusMesa.nome || 'Não Informado';
                    
                    listaHTML += `
                        <li>
                            <strong>M:</strong> ${mesaNome} | <strong>QT.:</strong> ${qtdPessoasNaMesa} | <strong>N:</strong> ${nome}
                        </li>
                    `;
                    
                } else {
                    mesa.classList.remove('ocupada');
                    delete mesa.dataset.dados;
                }
            });

            // ATUALIZAÇÃO DA INTERFACE
            if (contadorM > 0) {
                listaMesasOcupadas.innerHTML = listaHTML;
            } else {
                listaMesasOcupadas.innerHTML = '<li>Nenhuma mesa ocupada no momento.</li>';
            }
            
            // Atualiza os números nos contadores lá embaixo
            if(contadorMesas) contadorMesas.textContent = contadorM;
            if(contadorPessoas) contadorPessoas.textContent = totalP;
        });
    };

    // 3. 🖱️ Abrir Modal ao clicar na mesa
    mesas.forEach(mesa => {
        mesa.addEventListener('click', () => {
            mesaSelecionada = mesa;
            const mesaNome = mesa.dataset.nome;
            const isOcupada = mesa.classList.contains('ocupada');
            
            modalDisplayId.textContent = mesaNome;
            btnLiberar.dataset.mesaId = mesa.id;

            if (isOcupada && mesa.dataset.dados) {
                const dados = JSON.parse(mesa.dataset.dados);
                document.getElementById('nome-ocupante').value = dados.nome || '';
                document.getElementById('observacoes').value = dados.obs || '';
                document.getElementById('qtd-pessoas').value = dados.qtd || '1';
                document.getElementById('status-pagamento').value = dados.pagamento || 'nao-informado';
                document.getElementById('valor-mesa').value = dados.valor || '0.00'; 
                
                btnLiberar.style.display = 'block';
                document.querySelector('.btn-ocupar').textContent = 'Atualizar Ocupação';
            } else {
                formOcupacao.reset();
                document.getElementById('valor-mesa').value = '0.00'; 
                document.getElementById('qtd-pessoas').value = '1';
                
                btnLiberar.style.display = 'none';
                document.querySelector('.btn-ocupar').textContent = 'Confirmar Ocupação';
            }
            modalOverlay.style.display = 'flex';
        });
    });

    // 4. ☁️ Lógica de Salvar (Ocupar/Atualizar)
    formOcupacao.addEventListener('submit', (e) => {
        e.preventDefault();
        if (mesaSelecionada) {
            const dadosParaFirebase = {
                status: 'ocupada',
                nome: document.getElementById('nome-ocupante').value,
                qtd: document.getElementById('qtd-pessoas').value,
                obs: document.getElementById('observacoes').value,
                pagamento: document.getElementById('status-pagamento').value,
                valor: document.getElementById('valor-mesa').value,
                timestamp: new Date().toISOString()
            };

           // PRESERVA codigoReserva E valeEmitido
const dadosExistentes =
    mesaSelecionada.dataset.dados
    ? JSON.parse(mesaSelecionada.dataset.dados)
    : {};

refMesas.child(mesaSelecionada.id).set({
    ...dadosParaFirebase,

    codigoReserva:
    dadosExistentes.codigoReserva || null,

    valeEmitido:
    dadosExistentes.valeEmitido || false
})
.then(() => {
    modalOverlay.style.display = 'none';
})
.catch(error =>
    alert(
    "Erro ao salvar: " +
    error.message
));
        }
    });

    // 5. ☁️ Lógica de Liberar
   btnLiberar.addEventListener(
'click',
async () => {

    if(
        !mesaSelecionada ||
        !confirm(
        `Liberar a mesa ${mesaSelecionada.dataset.nome}?`
        )
    ){
        return;
    }

    try{

        const dadosMesa =
        mesaSelecionada.dataset.dados
        ? JSON.parse(
            mesaSelecionada.dataset.dados
          )
        : null;

        // APAGA QR/VIP
        if(
            dadosMesa &&
            dadosMesa.codigoReserva
        ){

            await refReservas
            .child(
                dadosMesa.codigoReserva
            )
            .remove();
        }

        // APAGA MESA
        await refMesas
        .child(
            mesaSelecionada.id
        )
        .remove();

        modalOverlay.style.display =
        'none';

        alert(
        "✅ Mesa liberada e vales removidos."
        );

    }catch(error){

        alert(
        "Erro: " +
        error.message
        );
    }
});
    
    // 💡 LÓGICA DE RESET GERAL
    btnResetGeral.addEventListener('click', () => {
        if (!confirm("LIMPAR TODAS AS MESAS?")) return;
        if (prompt("Digite a senha de reset:") === SENHA_RESET_GERAL) {
            refMesas.remove().then(() => alert("✅ Tudo liberado."));
        } else {
            alert("Senha incorreta!");
        }
    });

    // 6. Fechar Modal 
    botoesFechar.forEach(btn => { 
        btn.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
    });
    
    // 7. 📊 Exportação CSV
    btnExportar.addEventListener('click', () => {
        refMesas.once('value').then((snapshot) => {
            const statusFirebase = snapshot.val() || {};
            let dadosCSV = "Mesa;Status;Nome;Pessoas;Pagamento;Valor;Observacoes\n";

            mesas.forEach(mesa => {
                const status = statusFirebase[mesa.id];
                if (status && status.status === 'ocupada') {
                    dadosCSV += `${mesa.dataset.nome};OCUPADA;${status.nome};${status.qtd};${status.pagamento};${status.valor};${status.obs}\n`;
                } else {
                    dadosCSV += `${mesa.dataset.nome};LIVRE;;0;;0.00;\n`;
                }
            });

            const blob = new Blob(['\ufeff', dadosCSV], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Relatorio_LeBeef_${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();
        });
    });

btnEmitirVale.addEventListener('click', async () => {

    if(!mesaSelecionada){
        alert("Selecione uma mesa.");
        return;
    }

    const dadosMesa =
    mesaSelecionada.dataset.dados
    ? JSON.parse(
        mesaSelecionada.dataset.dados
    )
    : null;

    // BLOQUEIA NOVA EMISSÃO
    if(
        dadosMesa &&
        dadosMesa.codigoReserva
    ){

        alert(
`⚠️ O vale desta mesa já foi emitido.

Código:
${dadosMesa.codigoReserva}

Libere a mesa para gerar outro.`
        );

        return;
    }

    const nome =
    document.getElementById(
    'nome-ocupante'
    ).value;

    const qtd =
    parseInt(
        document.getElementById(
        'qtd-pessoas'
        ).value
    );

    const valor =
    document.getElementById(
    'valor-mesa'
    ).value;

    const pagamento =
    document.getElementById(
    'status-pagamento'
    ).value;

    if(!nome){

        alert("Informe o nome.");

        return;
    }

    const numeroMesa =
    mesaSelecionada.dataset.nome
    .split(" ")[0];

    const codigoReserva =
    gerarCodigoReserva(
        numeroMesa
    );

    const convidados = {};

    for(let i=1;i<=qtd;i++){

        const codigoPessoa =
        `${codigoReserva}-${String(i)
        .padStart(2,'0')}`;

        convidados[i] = {

            codigo:
            codigoPessoa,

            usado:false
        };
    }

    const dadosReserva = {

        mesa:
        mesaSelecionada.dataset.nome,

        responsavel:
        nome,

        qtd:
        qtd,

        valor:
        valor,

        pagamento:
        pagamento,

        eventoNome:
        document.getElementById(
        'evento-nome'
        ).innerText,

        eventoData:
        document.getElementById(
        'evento-data'
        ).innerText,

        codigoPrincipal:
        codigoReserva,

        usado:false,

        convidados,

        criadoEm:
        new Date()
        .toISOString()
    };

    try{

        // SALVA RESERVA VIP
        await refReservas
        .child(codigoReserva)
        .set(dadosReserva);

        // SALVA REFERÊNCIA DA MESA
        await refMesas
        .child(mesaSelecionada.id)
        .update({

            codigoReserva:
            codigoReserva,

            valeEmitido:true
        });

        // ATUALIZA LOCALMENTE
        mesaSelecionada.dataset.dados =
        JSON.stringify({

            ...(dadosMesa || {}),

            codigoReserva:
            codigoReserva,

            valeEmitido:true
        });

// GERA PDF
await gerarPDFVale(
    codigoReserva,
    dadosReserva
);

}catch(error){

    alert(
    "Erro ao emitir vale:\n" +
    error.message
    );
}
});

// BAIXAR VALE NOVAMENTE
btnBaixarVale.addEventListener(
'click',
async () => {

    if(!mesaSelecionada){

        alert(
        "Selecione uma mesa."
        );

        return;
    }

    const dadosMesa =
    mesaSelecionada.dataset.dados
    ? JSON.parse(
        mesaSelecionada.dataset.dados
    )
    : null;

    if(
        !dadosMesa ||
        !dadosMesa.codigoReserva
    ){

        alert(
        "Nenhum vale emitido para esta mesa."
        );

        return;
    }

    try{

        const snapshot =
        await refReservas
        .child(
            dadosMesa.codigoReserva
        )
        .once('value');

        const dadosReserva =
        snapshot.val();

        if(!dadosReserva){

            alert(
            "Reserva não encontrada."
            );

            return;
        }

        await gerarPDFVale(
            dadosMesa.codigoReserva,
            dadosReserva
        );

    }catch(error){

        alert(
        "Erro ao baixar:\n" +
        error.message
        );
    }
});
    
async function gerarPDFVale(codigo, dados){

    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    for(let i = 1; i <= dados.qtd; i++){

        if(i > 1){
            pdf.addPage();
        }

        const cod = dados.convidados[i].codigo;

        // AQUI FOI CORRIGIDO: Agora ele usa a variável 'cod' no lugar de 'urlQR'
        const qrBase64 = await QRCode.toDataURL(cod, {
            width: 500,
            margin: 1
        });

        // ===== TAMANHO DO INGRESSO =====
        const largura = 90;
        const altura = 140;

        // CENTRALIZADO
        const x = (210 - largura) / 2;
        const y = 35;

        // FUNDO PRETO
        pdf.setFillColor(8,8,8);
        pdf.roundedRect(
            x,
            y,
            largura,
            altura,
            5,
            5,
            'F'
        );

        // BORDA DOURADA
        pdf.setDrawColor(212,175,55);
        pdf.setLineWidth(0.8);

        pdf.roundedRect(
            x + 2,
            y + 2,
            largura - 4,
            altura - 4,
            4,
            4
        );

        // TOPO
        pdf.setTextColor(212,175,55);

        pdf.setFont(
            "helvetica",
            "bold"
        );

        pdf.setFontSize(20);

        pdf.text(
            "LE BEEF",
            105,
            y + 16,
            { align:'center' }
        );

        pdf.setFontSize(10);

        pdf.text(
            " INGRESSO ",
            105,
            y + 23,
            { align:'center' }
        );

        // LINHA
        pdf.setDrawColor(212,175,55);

        pdf.line(
            x + 10,
            y + 28,
            x + largura - 10,
            y + 28
        );

        // EVENTO
        pdf.setFontSize(14);

       pdf.text(
    dados.eventoNome,
    105,
    y + 38,
    { align:'center' }
);

pdf.setFontSize(9);

pdf.text(
    dados.eventoData,
    105,
    y + 45,
    { align:'center' }
);

        // DADOS
        pdf.setTextColor(255,255,255);

        pdf.setFontSize(10);

        pdf.text(
            dados.responsavel,
            105,
            y + 58,
            { align:'center' }
        );

        pdf.text(
            `Mesa ${dados.mesa}`,
            105,
            y + 66,
            { align:'center' }
        );

        pdf.setTextColor(212,175,55);

pdf.setFont(
    "helvetica",
    "bold"
);

pdf.setFontSize(14);

pdf.text(
    `INGRESSO ${i} DE ${dados.qtd}`,
    105,
    y + 74,
    { align:'center' }
);

        // QR CODE GRANDE
        pdf.addImage(
            qrBase64,
            'PNG',
            x + 20,
            y + 80,
            50,
            50
        );

        // CÓDIGO
        pdf.setTextColor(212,175,55);

        pdf.setFontSize(9);

        pdf.text(
            cod,
            105,
            y + 136,
            { align:'center' }
        );

        // RODAPÉ
        pdf.setTextColor(160,160,160);

        pdf.setFontSize(7);

        pdf.text(
            "Apresente este QR na entrada",
            105,
            y + 145,
            { align:'center' }
        );
    }

    pdf.save(
        `LEBEEF_VIP_${codigo}.pdf`
    );
}

    carregarStatusMesas();
});
