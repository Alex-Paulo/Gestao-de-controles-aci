// 1. CONEXÃO COM O SUPABASE
const SUPABASE_URL = 'https://dshwyroaucbriwnptfmy.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_-AVQqp-pCUdb6HFDQRBWqA_e8YmKZAZ';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let ressarcimentos = [];
let paginaAtual = 1;
const itensPorPagina = 10;
let listaFiltradaAtual = [];

const formRes = document.getElementById('formRessarcimento');
const tabelaCorpo = document.getElementById('tabelaCorpo');
const inputIndex = document.getElementById('ressarcimentoIndex');
const btnCancelar = document.getElementById('btnCancelar');
const tituloFormulario = document.getElementById('tituloFormulario');
const btnSalvar = document.getElementById('btnSalvar');

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

function formatarData(dataISO) {
    if(!dataISO) return '';
    const dataPartes = dataISO.split('-');
    return `${dataPartes[2]}/${dataPartes[1]}/${dataPartes[0]}`;
}

function atualizarDashboard(listaExibida) {
    let qtdConferida = 0, qtdRetornada = 0;
    listaExibida.forEach(item => {
        if (item.status === 'Conferida') qtdConferida++; 
        else if (item.status === 'Retornada') qtdRetornada++;
    });
    document.getElementById('qtdConferida').innerText = qtdConferida;
    document.getElementById('qtdRetornada').innerText = qtdRetornada;
}

// --- CARREGAR DADOS DO SUPABASE ---
async function carregarRessarcimentos() {
    tabelaCorpo.innerHTML = '<tr><td colspan="5" style="text-align: center;">Carregando dados da nuvem... <i class="fa-solid fa-spinner fa-spin"></i></td></tr>';
    
    const { data, error } = await supabaseClient.from('ressarcimentos').select('*').order('id', { ascending: false });
    
    if (error) { mostrarToast("Erro ao carregar banco.", "error"); console.error(error); return; }
    
    ressarcimentos = data;
    listaFiltradaAtual = [...ressarcimentos];
    renderizarTabela();
}

// --- SALVAR OU EDITAR ---
formRes.addEventListener('submit', async function(e) {
    e.preventDefault();
    btnSalvar.innerText = "Salvando na nuvem..."; btnSalvar.disabled = true;

    const idBanco = inputIndex.value;
    const novoDado = {
        subprocesso: document.getElementById('subprocesso').value.trim(),
        opcao: document.getElementById('opcao').value.trim(),
        data_conferencia: document.getElementById('dataConferencia').value, 
        status: document.getElementById('status').value
    };
    
    if (idBanco === '-1') { 
        const { error } = await supabaseClient.from('ressarcimentos').insert([novoDado]);
        if(error) { mostrarToast("Erro ao salvar", "error"); console.error(error); }
        else { mostrarToast("Salvo na nuvem com sucesso!"); formRes.reset(); }
    } else { 
        const { error } = await supabaseClient.from('ressarcimentos').update(novoDado).eq('id', idBanco);
        if(error) { mostrarToast("Erro ao atualizar", "error"); console.error(error); }
        else { mostrarToast("Atualizado na nuvem!"); cancelarEdicao(); }
    }
    
    btnSalvar.disabled = false;
    btnSalvar.innerText = idBanco === '-1' ? "Salvar Registro" : "Atualizar Registro";
    carregarRessarcimentos();
});

// --- EDITAR E EXCLUIR ---
function prepararEdicao(idBanco) {
    const item = ressarcimentos.find(r => r.id === idBanco);
    document.getElementById('subprocesso').value = item.subprocesso;
    document.getElementById('opcao').value = item.opcao;
    document.getElementById('dataConferencia').value = item.data_conferencia; 
    document.getElementById('status').value = item.status;
    
    inputIndex.value = item.id;
    tituloFormulario.innerHTML = `<i class="fa-solid fa-pen"></i> Editar Registro`;
    btnSalvar.innerText = "Atualizar Registro";
    btnCancelar.style.display = "inline-block";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicao() {
    formRes.reset();
    inputIndex.value = '-1';
    tituloFormulario.innerHTML = `<i class="fa-solid fa-plus"></i> Adicionar Ressarcimento`;
    btnSalvar.innerText = "Salvar Registro";
    btnCancelar.style.display = "none";
}
btnCancelar.addEventListener('click', cancelarEdicao);

async function excluirRegistro(idBanco) {
    if (confirm("Tem certeza que deseja excluir este registro da nuvem?")) {
        const {error} = await supabaseClient.from('ressarcimentos').delete().eq('id', idBanco);
        if(error) { mostrarToast("Erro ao excluir", "error"); console.error(error); }
        else { mostrarToast("Registro excluído.", "success"); carregarRessarcimentos(); }
    }
}

// --- RENDERIZAR E FILTRAR ---
function renderizarTabela() {
    tabelaCorpo.innerHTML = ''; 
    const totalPaginas = Math.ceil(listaFiltradaAtual.length / itensPorPagina);
    if(paginaAtual > totalPaginas && totalPaginas > 0) paginaAtual = totalPaginas;
    
    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const itensPagina = listaFiltradaAtual.slice(inicio, fim);

    itensPagina.forEach((item) => {
        const tr = document.createElement('tr');
        const badgeClass = item.status === 'Conferida' ? 'badge conferida' : 'badge retornada';
        tr.innerHTML = `
            <td>${item.subprocesso}</td>
            <td>${item.opcao}</td>
            <td>${formatarData(item.data_conferencia)}</td>
            <td><span class="${badgeClass}">${item.status}</span></td>
            <td>
                <button class="btn-editar" onclick="prepararEdicao(${item.id})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-excluir" onclick="excluirRegistro(${item.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tabelaCorpo.appendChild(tr);
    });
    
    atualizarDashboard(listaFiltradaAtual);
    renderizarPaginacao(listaFiltradaAtual.length, totalPaginas);
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
    const fSub = document.getElementById('filtroSubprocesso').value.toLowerCase();
    const fStatus = document.getElementById('filtroStatus').value;
    const fMes = document.getElementById('filtroMesSelect').value; 
    const fAno = document.getElementById('filtroAnoSelect').value; 

    listaFiltradaAtual = ressarcimentos.filter(item => {
        const matchSub = item.subprocesso.toLowerCase().includes(fSub);
        const matchStatus = fStatus === "" || item.status === fStatus;
        
        let matchData = true;
        if (item.data_conferencia) {
            if (fAno !== "" && fMes !== "") matchData = item.data_conferencia.startsWith(`${fAno}-${fMes}`);
            else if (fAno !== "") matchData = item.data_conferencia.startsWith(`${fAno}`);
            else if (fMes !== "") matchData = item.data_conferencia.includes(`-${fMes}-`);
        }
        return matchSub && matchStatus && matchData;
    });

    const resumoMesDiv = document.getElementById('resumoMes');
    if (fMes !== "" || fAno !== "") {
        document.getElementById('qtdMes').innerText = listaFiltradaAtual.length;
        let qtdConf = 0, qtdRet = 0;
        listaFiltradaAtual.forEach(n => { if(n.status === 'Conferida') qtdConf++; if(n.status === 'Retornada') qtdRet++; });
        document.getElementById('qtdMesConf').innerText = qtdConf;
        document.getElementById('qtdMesRet').innerText = qtdRet;
        resumoMesDiv.style.display = 'block';
    } else { resumoMesDiv.style.display = 'none'; }
    
    paginaAtual = 1; 
    renderizarTabela();
}

document.getElementById('filtroSubprocesso').addEventListener('input', aplicarFiltros);
document.getElementById('filtroStatus').addEventListener('change', aplicarFiltros);
document.getElementById('filtroMesSelect').addEventListener('change', aplicarFiltros);
document.getElementById('filtroAnoSelect').addEventListener('change', aplicarFiltros);

function exportarExcel() {
    if (listaFiltradaAtual.length === 0) { alert("Não há registros para exportar!"); return; }
    let csv = "Numero do Subprocesso;Opcao de Ressarcimento;Data de Conferencia;Status\n";
    listaFiltradaAtual.forEach(item => {
        let sub = item.subprocesso || ""; let opc = item.opcao || "";
        let data = formatarData(item.data_conferencia) || ""; let stat = item.status || "";
        csv += `${sub};${opc};${data};${stat}\n`;
    });
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' }); 
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.setAttribute("href", url); link.setAttribute("download", "controle_ressarcimentos.csv");
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
carregarRessarcimentos();