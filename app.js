// 1. CONEXÃO COM O SUPABASE
const SUPABASE_URL = 'https://dshwyroaucbriwnptfmy.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_-AVQqp-pCUdb6HFDQRBWqA_e8YmKZAZ';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variáveis Globais
let notas = []; 
let paginaAtual = 1;
const itensPorPagina = 10;
let notasFiltradasAtual = []; 

const formNota = document.getElementById('formNota');
const tabelaCorpo = document.getElementById('tabelaCorpo');
const inputIndex = document.getElementById('notaIndex'); 
const btnCancelar = document.getElementById('btnCancelar');
const tituloFormulario = document.getElementById('tituloFormulario');
const btnSalvar = document.getElementById('btnSalvar');
const inputValor = document.getElementById('valor');

// --- SISTEMA DE TOAST ---
function mostrarToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    const icone = tipo === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    toast.innerHTML = `<i class="fa-solid ${icone}"></i> <span>${mensagem}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// --- MÁSCARA DE MOEDA ---
inputValor.addEventListener('input', function(e) {
    let valor = e.target.value.replace(/\D/g, ""); 
    if(valor === "") { e.target.value = ""; return; }
    valor = (parseInt(valor) / 100).toFixed(2) + "";
    valor = valor.replace(".", ",");
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    e.target.value = "R$ " + valor;
});

function desformatarMoeda(valorFormatado) {
    if(!valorFormatado) return 0;
    if(typeof valorFormatado === 'number' || !valorFormatado.includes('R$')) return Number(valorFormatado);
    let numero = valorFormatado.replace("R$ ", "").replace(/\./g, "").replace(",", ".");
    return parseFloat(numero);
}

function formatarMoeda(valor) { return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function formatarData(dataISO) {
    if(!dataISO) return ''; const dataPartes = dataISO.split('-'); return `${dataPartes[2]}/${dataPartes[1]}/${dataPartes[0]}`;
}

function atualizarDashboard(notasExibidas) {
    let qtdConferida = 0; let valorConferido = 0; let qtdRetornada = 0;
    notasExibidas.forEach(nota => {
        if (nota.status === 'Conferida') { qtdConferida++; valorConferido += Number(nota.valor); } 
        else if (nota.status === 'Retornada') { qtdRetornada++; }
    });
    document.getElementById('qtdConferida').innerText = qtdConferida;
    document.getElementById('valorConferido').innerText = formatarMoeda(valorConferido);
    document.getElementById('qtdRetornada').innerText = qtdRetornada;
}

// --- FUNÇÕES DO SUPABASE (CRUD) ---

// CARREGAR (Read)
async function carregarNotas() {
    tabelaCorpo.innerHTML = '<tr><td colspan="7" style="text-align: center;">Carregando dados da nuvem... <i class="fa-solid fa-spinner fa-spin"></i></td></tr>';
    
    const { data, error } = await supabaseClient.from('notas_fiscais').select('*').order('id', { ascending: false });
    
    if (error) { mostrarToast("Erro ao carregar banco de dados.", "error"); console.error(error); return; }
    
    notas = data;
    notasFiltradasAtual = [...notas];
    renderizarTabela();
}

// SALVAR OU EDITAR (Create / Update)
formNota.addEventListener('submit', async function(e) {
    e.preventDefault();
    btnSalvar.innerText = "Salvando na nuvem..."; btnSalvar.disabled = true;

    const idBanco = inputIndex.value;
    const valorPuro = desformatarMoeda(document.getElementById('valor').value);

    const notaData = {
        numero: document.getElementById('numeroNota').value.trim(),
        fornecedor: document.getElementById('fornecedor').value.trim(),
        centro_custo: document.getElementById('centroCusto').value,
        vencimento: document.getElementById('vencimento').value,
        valor: valorPuro, 
        status: document.getElementById('status').value
    };

    if (idBanco === '-1') {
        const { error } = await supabaseClient.from('notas_fiscais').insert([notaData]);
        if (error) { mostrarToast("Erro ao salvar nota.", "error"); console.error(error); } 
        else { mostrarToast("Nota cadastrada na nuvem!"); formNota.reset(); }
    } else {
        const { error } = await supabaseClient.from('notas_fiscais').update(notaData).eq('id', idBanco);
        if (error) { mostrarToast("Erro ao atualizar.", "error"); console.error(error); } 
        else { mostrarToast("Nota atualizada na nuvem!"); cancelarEdicao(); }
    }

    btnSalvar.disabled = false;
    btnSalvar.innerText = idBanco === '-1' ? "Salvar Nota" : "Atualizar Nota";
    carregarNotas(); 
});

// PREPARAR EDIÇÃO
function prepararEdicao(idBanco) {
    const nota = notas.find(n => n.id === idBanco); 
    
    document.getElementById('numeroNota').value = nota.numero;
    document.getElementById('fornecedor').value = nota.fornecedor;
    document.getElementById('centroCusto').value = nota.centro_custo || ''; 
    document.getElementById('vencimento').value = nota.vencimento;
    document.getElementById('valor').value = "R$ " + Number(nota.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2});
    document.getElementById('status').value = nota.status;
    
    inputIndex.value = nota.id; 
    tituloFormulario.innerHTML = `<i class="fa-solid fa-pen"></i> Editar Nota`;
    btnSalvar.innerText = "Atualizar Nota";
    btnCancelar.style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicao() {
    formNota.reset();
    inputIndex.value = '-1';
    tituloFormulario.innerHTML = `<i class="fa-solid fa-plus"></i> Adicionar Nova Nota`;
    btnSalvar.innerText = "Salvar Nota";
    btnCancelar.style.display = "none";
}
btnCancelar.addEventListener('click', cancelarEdicao);

// EXCLUIR (Delete)
async function excluirNota(idBanco) {
    if (confirm("Tem certeza que deseja excluir esta nota definitivamente da nuvem?")) {
        const { error } = await supabaseClient.from('notas_fiscais').delete().eq('id', idBanco);
        
        if (error) { mostrarToast("Erro ao excluir.", "error"); console.error(error); } 
        else { mostrarToast("Nota excluída com sucesso.", "success"); carregarNotas(); }
    }
}

// --- RENDERIZAR TABELA ---
function renderizarTabela() {
    tabelaCorpo.innerHTML = ''; 
    const totalPaginas = Math.ceil(notasFiltradasAtual.length / itensPorPagina);
    if(paginaAtual > totalPaginas && totalPaginas > 0) paginaAtual = totalPaginas;
    
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const notasPagina = notasFiltradasAtual.slice(inicio, fim);

    notasPagina.forEach((nota) => {
        const tr = document.createElement('tr');
        const badgeClass = nota.status === 'Conferida' ? 'badge conferida' : 'badge retornada';
        const centroCustoExibicao = nota.centro_custo ? nota.centro_custo : 'Não definido';

        tr.innerHTML = `
            <td>${nota.numero}</td>
            <td>${nota.fornecedor}</td>
            <td>${centroCustoExibicao}</td>
            <td>${formatarData(nota.vencimento)}</td>
            <td>${formatarMoeda(nota.valor)}</td>
            <td><span class="${badgeClass}">${nota.status}</span></td>
            <td>
                <button class="btn-editar" onclick="prepararEdicao(${nota.id})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-excluir" onclick="excluirNota(${nota.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabelaCorpo.appendChild(tr);
    });

    atualizarDashboard(notasFiltradasAtual);
    renderizarPaginacao(notasFiltradasAtual.length, totalPaginas);
}

function renderizarPaginacao(totalItens, totalPaginas) {
    const container = document.getElementById('paginacao-container');
    if(totalItens === 0) { container.innerHTML = ''; return; }
    let html = `<div class="paginacao-info">Mostrando página ${paginaAtual} de ${totalPaginas} (${totalItens} registros)</div>`;
    html += `<div class="paginacao-botoes">`;
    html += `<button class="btn-pag" onclick="mudarPagina(${paginaAtual - 1})" ${paginaAtual === 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i></button>`;
    for(let i = 1; i <= totalPaginas; i++) { html += `<button class="btn-pag ${i === paginaAtual ? 'ativo' : ''}" onclick="mudarPagina(${i})">${i}</button>`; }
    html += `<button class="btn-pag" onclick="mudarPagina(${paginaAtual + 1})" ${paginaAtual === totalPaginas ? 'disabled' : ''}><i class="fa-solid fa-chevron-right"></i></button></div>`;
    container.innerHTML = html;
}

function mudarPagina(novaPagina) { paginaAtual = novaPagina; renderizarTabela(); }

function aplicarFiltros() {
    const fNumero = document.getElementById('filtroNumero').value.toLowerCase();
    const fEmpresa = document.getElementById('filtroEmpresa').value.toLowerCase();
    const fStatus = document.getElementById('filtroStatus').value;
    const fCentro = document.getElementById('filtroCentro').value;
    const fMes = document.getElementById('filtroMesSelect').value; 
    const fAno = document.getElementById('filtroAnoSelect').value; 

    notasFiltradasAtual = notas.filter(nota => {
        const matchNumero = nota.numero.toLowerCase().includes(fNumero);
        const matchEmpresa = nota.fornecedor.toLowerCase().includes(fEmpresa);
        const matchStatus = fStatus === "" || nota.status === fStatus;
        const notaCentro = nota.centro_custo || '';
        const matchCentro = fCentro === "" || notaCentro === fCentro;
        
        let matchData = true;
        if (nota.vencimento) {
            if (fAno !== "" && fMes !== "") matchData = nota.vencimento.startsWith(`${fAno}-${fMes}`);
            else if (fAno !== "") matchData = nota.vencimento.startsWith(`${fAno}`);
            else if (fMes !== "") matchData = nota.vencimento.includes(`-${fMes}-`);
        }
        return matchNumero && matchEmpresa && matchStatus && matchCentro && matchData;
    });

    const resumoMesDiv = document.getElementById('resumoMes');
    if (fMes !== "" || fAno !== "") {
        document.getElementById('qtdMes').innerText = notasFiltradasAtual.length;
        let qtdConf = 0, qtdRet = 0;
        notasFiltradasAtual.forEach(n => { if(n.status === 'Conferida') qtdConf++; if(n.status === 'Retornada') qtdRet++; });
        document.getElementById('qtdMesConf').innerText = qtdConf;
        document.getElementById('qtdMesRet').innerText = qtdRet;
        resumoMesDiv.style.display = 'block';
    } else { resumoMesDiv.style.display = 'none'; }
    paginaAtual = 1; renderizarTabela();
}

document.getElementById('filtroNumero').addEventListener('input', aplicarFiltros);
document.getElementById('filtroEmpresa').addEventListener('input', aplicarFiltros);
document.getElementById('filtroStatus').addEventListener('change', aplicarFiltros);
document.getElementById('filtroCentro').addEventListener('change', aplicarFiltros);
document.getElementById('filtroMesSelect').addEventListener('change', aplicarFiltros);
document.getElementById('filtroAnoSelect').addEventListener('change', aplicarFiltros);

function exportarExcel() {
    if (notasFiltradasAtual.length === 0) { alert("Não há notas para exportar!"); return; }
    let csv = "Numero da Nota;Fornecedor;Centro de Custo;Vencimento;Valor;Status\n";
    notasFiltradasAtual.forEach(nota => {
        let num = nota.numero || ""; let forn = nota.fornecedor || "";
        let centro = nota.centro_custo || "Não definido"; let venc = formatarData(nota.vencimento) || "";
        let val = (nota.valor || 0).toString().replace('.', ','); let stat = nota.status || "";
        csv += `${num};${forn};${centro};${venc};${val};${stat}\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.setAttribute("href", url); link.setAttribute("download", "controle_notas_fiscais.csv");
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

// Verifica se o usuário tem permissão para estar nesta página
async function protegerPagina() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        // Se não tiver sessão (não logou), chuta de volta pro index
        window.location.replace('index.html');
    }
}
protegerPagina();

// INICIALIZAÇÃO
carregarNotas();