/*
 * scripts.js - VERSÃO COM MÓDULO DE SUSTENTABILIDADE E DESCARTE
 * Lógica de Autenticação e Gerenciamento de EPIs com Supabase
 */

// ====================================================================================
// CONFIGURAÇÃO DO SUPABASE
// ====================================================================================
// ATUALIZE COM SUAS CHAVES DO SUPABASE
const SUPABASE_URL = 'https://usojesvtabxybzbigpzn.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb2plc3Z0YWJ4eWJ6YmlncHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjM0NTEsImV4cCI6MjA3Njg5OTQ1MX0.kaR3WyHGMgz-JBSZocRaxyB0OAcGOJWv2m2_Ac7BeTg'; 

let supabase;
let editingEpiId = null;
let epis = []; // Armazena todos os EPIs para uso em cache
let entregas = []; // Armazena todas as entregas

// Mapeamento de impacto ambiental por tipo de EPI (estimativa)
const IMPACTO_EPI_PADRAO = {
    peso_residuo_kg: 0.2, // Padrão
    emissao_co2_kg: 1.0   // Padrão
};

// Dados estimados para alguns tipos de EPIs
const IMPACTO_POR_CATEGORIA = {
    'Capacete': { peso_residuo_kg: 0.35, emissao_co2_kg: 1.5 },
    'Luva': { peso_residuo_kg: 0.1, emissao_co2_kg: 0.4 },
    'Bota': { peso_residuo_kg: 1.2, emissao_co2_kg: 2.0 },
    'Óculos': { peso_residuo_kg: 0.15, emissao_co2_kg: 0.6 },
    // Adicione mais categorias se necessário
};

let sustentavelChart = null; // Variável para armazenar a instância do gráfico

// ====================================================================================
// INICIALIZAÇÃO
// ====================================================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializa Supabase
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase conectado.');

        // 1. Verificar Autenticação
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = 'login.html'; // Redireciona para o login se não houver sessão
            return;
        }

        // 2. Definir Event Listeners e Carregar Dados
        document.getElementById('epi-form').addEventListener('submit', handleEpiFormSubmit);
        document.getElementById('entrega-form').addEventListener('submit', handleEntregaFormSubmit);

        // Carregar dados iniciais para a aba padrão ('epis')
        await loadEPIs();
        await loadEPIsForSelect();
        await loadEntregas();
        await loadRelatorios(); // Carrega os relatórios na inicialização

        // Definir a data atual como padrão no formulário de entrega
        document.getElementById('data-entrega').value = new Date().toISOString().split('T')[0];

    } catch (error) {
        console.error('Erro na inicialização:', error);
        showMessage('Erro ao inicializar o sistema. Verifique a console.', 'error');
    }
});

// ====================================================================================
// FUNÇÕES DE UI
// ====================================================================================

function showMessage(message, type = 'error') {
    const messageArea = document.getElementById('message-area');
    messageArea.textContent = message;
    messageArea.className = `alert alert-${type}`; // Assumindo classes de estilo CSS para alertas
    messageArea.style.display = 'block';
    // Esconde a mensagem após 5 segundos
    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 5000);
}

function setActiveTab(tabName) {
    document.querySelectorAll('.tab').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`.tab[onclick="setActiveTab('${tabName}')"]`).classList.add('active');

    document.getElementById('epis-section').style.display = 'none';
    document.getElementById('entregas-section').style.display = 'none';
    document.getElementById('relatorios-section').style.display = 'none';

    document.getElementById(`${tabName}-section`).style.display = 'block';

    // Recarrega dados relevantes ao mudar de aba
    if (tabName === 'epis') {
        loadEPIs();
    } else if (tabName === 'entregas') {
        loadEPIsForSelect(); // Atualiza a lista de seleção
        loadEntregas(); // Recarrega o histórico
    } else if (tabName === 'relatorios') {
        loadRelatorios();
    }
}

async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showMessage('Erro ao sair: ' + error.message, 'error');
    } else {
        window.location.href = 'login.html';
    }
}

// ====================================================================================
// FUNÇÕES DE STATUS (EPI)
// ====================================================================================

/**
 * Determina o status de estoque e validade de um EPI.
 * @param {Object} epi O objeto EPI.
 * @returns {Object} Um objeto com status (string) e classe (string para estilo).
 */
function getEPIStatus(epi) {
    const estoque = parseInt(epi.estoque, 10);
    const minimo = parseInt(epi.minimo, 10);
    const validade = new Date(epi.validade);
    const today = new Date();
    const oneMonthAhead = new Date(today);
    oneMonthAhead.setMonth(today.getMonth() + 1);

    if (validade < today) {
        return { status: 'VENCIDO', class: 'vencido' };
    }
    if (estoque <= 0) {
        return { status: 'FALTA', class: 'falta' };
    }
    if (estoque < minimo) {
        return { status: 'CRÍTICO', class: 'critico' };
    }
    if (validade <= oneMonthAhead) {
        return { status: 'ATENÇÃO (Validade)', class: 'atencao' };
    }
    if (estoque < (minimo * 2) && estoque > minimo) {
        return { status: 'ATENÇÃO (Estoque Baixo)', class: 'atencao' };
    }
    
    return { status: 'OK', class: 'ok' };
}

// ====================================================================================
// FUNÇÕES DE CRUD (EPI)
// ====================================================================================

async function loadEPIs() {
    document.getElementById('loading').style.display = 'block';
    
    const { data, error } = await supabase
        .from('epis')
        .select('*')
        .order('nome', { ascending: true });

    document.getElementById('loading').style.display = 'none';

    if (error) {
        console.error('Erro ao carregar EPIs:', error);
        showMessage('Erro ao carregar lista de EPIs.', 'error');
        return;
    }

    epis = data; // Atualiza o cache global
    renderEPIs(data);
    loadEPIsForSelect(); // Atualiza o seletor de entregas
}

function renderEPIs(episData) {
    const container = document.getElementById('epis-container');
    container.innerHTML = '';

    if (episData.length === 0) {
        container.innerHTML = '<p class="info">Nenhum EPI cadastrado. Use o formulário acima para começar!</p>';
        return;
    }

    episData.forEach(epi => {
        const { status, class: statusClass } = getEPIStatus(epi);
        const card = document.createElement('div');
        card.className = `epi-card ${statusClass}`;
        
        card.innerHTML = `
            <h4>${epi.nome}</h4>
            <p><strong>CA:</strong> ${epi.ca}</p>
            <p><strong>Categoria:</strong> ${epi.categoria}</p>
            <p><strong>Estoque:</strong> <span class="badge">${epi.estoque}</span> (Mín: ${epi.minimo})</p>
            <p><strong>Validade:</strong> ${new Date(epi.validade).toLocaleDateString()}</p>
            <div class="status-label">${status}</div>
            <div class="card-actions">
                <button class="btn btn-warning btn-sm" onclick="editEPI('${epi.id}')"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn btn-danger btn-sm" onclick="deleteEPI('${epi.id}')"><i class="fas fa-trash-alt"></i> Excluir</button>
            </div>
        `;
        container.appendChild(card);
    });
}

async function handleEpiFormSubmit(event) {
    event.preventDefault();
    
    const epiData = {
        nome: document.getElementById('nome').value,
        categoria: document.getElementById('categoria').value,
        ca: document.getElementById('ca').value,
        estoque: parseInt(document.getElementById('estoque').value, 10),
        minimo: parseInt(document.getElementById('minimo').value, 10),
        validade: document.getElementById('validade').value,
        fornecedor: document.getElementById('fornecedor').value || null,
        localizacao: document.getElementById('localizacao').value || null,
        observacoes: document.getElementById('observacoes').value || null,
    };

    if (editingEpiId) {
        await updateEPI(editingEpiId, epiData);
    } else {
        await createEPI(epiData);
    }
    
    resetForm();
    await loadEPIs();
    await loadRelatorios(); // Recarrega relatórios
}

async function createEPI(epiData) {
    const { error } = await supabase
        .from('epis')
        .insert([epiData]);

    if (error) {
        console.error('Erro ao cadastrar EPI:', error);
        showMessage('Erro ao cadastrar EPI: ' + error.message, 'error');
    } else {
        showMessage('EPI cadastrado com sucesso!', 'success');
    }
}

function editEPI(epiId) {
    const epi = epis.find(e => e.id === epiId);
    if (!epi) {
        showMessage('EPI não encontrado para edição.', 'error');
        return;
    }
    
    editingEpiId = epiId;
    document.getElementById('epi-id').value = epi.id;
    document.getElementById('nome').value = epi.nome;
    document.getElementById('categoria').value = epi.categoria;
    document.getElementById('ca').value = epi.ca;
    document.getElementById('estoque').value = epi.estoque;
    document.getElementById('minimo').value = epi.minimo;
    document.getElementById('validade').value = epi.validade;
    document.getElementById('fornecedor').value = epi.fornecedor || '';
    document.getElementById('localizacao').value = epi.localizacao || '';
    document.getElementById('observacoes').value = epi.observacoes || '';

    document.getElementById('epi-submit-btn').innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar EPI';
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function updateEPI(epiId, epiData) {
    const { error } = await supabase
        .from('epis')
        .update(epiData)
        .eq('id', epiId);

    if (error) {
        console.error('Erro ao atualizar EPI:', error);
        showMessage('Erro ao atualizar EPI: ' + error.message, 'error');
    } else {
        showMessage('EPI atualizado com sucesso!', 'success');
    }
}

async function deleteEPI(epiId) {
    if (!confirm('Tem certeza que deseja excluir este EPI? Esta ação não pode ser desfeita.')) {
        return;
    }

    const { error } = await supabase
        .from('epis')
        .delete()
        .eq('id', epiId);

    if (error) {
        console.error('Erro ao excluir EPI:', error);
        showMessage('Erro ao excluir EPI: ' + error.message, 'error');
    } else {
        showMessage('EPI excluído com sucesso!', 'success');
        await loadEPIs();
        await loadRelatorios();
    }
}

function resetForm() {
    editingEpiId = null;
    document.getElementById('epi-form').reset();
    document.getElementById('epi-submit-btn').innerHTML = '<i class="fas fa-save"></i> Salvar EPI';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    document.getElementById('epi-id').value = '';
}

// ====================================================================================
// FUNÇÕES DE ENTREGA
// ====================================================================================

async function loadEPIsForSelect() {
    const select = document.getElementById('epi-select');
    select.innerHTML = '<option value="">Selecione um EPI (com estoque disponível)</option>';

    // Usa o cache global 'epis'
    const disponiveis = epis.filter(e => parseInt(e.estoque, 10) > 0);

    disponiveis.forEach(epi => {
        const option = document.createElement('option');
        option.value = epi.id;
        option.textContent = `${epi.nome} (Estoque: ${epi.estoque}, CA: ${epi.ca})`;
        select.appendChild(option);
    });
}

async function handleEntregaFormSubmit(event) {
    event.preventDefault();
    
    const epiId = document.getElementById('epi-select').value;
    const quantidade = parseInt(document.getElementById('quantidade-entrega').value, 10);
    const colaborador = document.getElementById('colaborador').value;
    const dataEntrega = document.getElementById('data-entrega').value;
    const observacoes = document.getElementById('observacoes-entrega').value || null;

    if (!epiId || quantidade <= 0) {
        showMessage('Selecione um EPI válido e uma quantidade maior que zero.', 'warning');
        return;
    }

    const epi = epis.find(e => e.id === epiId);
    if (!epi || epi.estoque < quantidade) {
        showMessage('Estoque insuficiente para a quantidade solicitada.', 'error');
        return;
    }

    try {
        // 1. Registrar a Entrega
        const { error: entregaError } = await supabase
            .from('entregas')
            .insert([{
                epi_id: epiId,
                colaborador,
                quantidade,
                data_entrega: dataEntrega,
                observacoes,
            }]);

        if (entregaError) throw entregaError;

        // 2. Atualizar o Estoque do EPI
        const novoEstoque = epi.estoque - quantidade;
        const { error: estoqueError } = await supabase
            .from('epis')
            .update({ estoque: novoEstoque })
            .eq('id', epiId);

        if (estoqueError) throw estoqueError;

        showMessage('Entrega registrada e estoque atualizado com sucesso!', 'success');
        document.getElementById('entrega-form').reset();
        document.getElementById('data-entrega').value = new Date().toISOString().split('T')[0];

        // Recarregar tudo
        await loadEPIs();
        await loadEntregas();
        await loadRelatorios();

    } catch (error) {
        console.error('Erro ao registrar entrega:', error);
        showMessage('Erro ao registrar entrega: ' + error.message, 'error');
    }
}

async function loadEntregas() {
    const { data, error } = await supabase
        .from('entregas')
        .select(`
            *,
            epis (nome, ca)
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao carregar entregas:', error);
        showMessage('Erro ao carregar histórico de entregas.', 'error');
        return;
    }

    entregas = data; // Atualiza o cache global
    renderEntregas(data);
}

function renderEntregas(entregasData) {
    const container = document.getElementById('entregas-container');
    container.innerHTML = '';

    if (entregasData.length === 0) {
        container.innerHTML = '<p class="info">Nenhum registro de entrega encontrado.</p>';
        return;
    }

    entregasData.forEach(entrega => {
        const epiNome = entrega.epis ? entrega.epis.nome : 'EPI Removido';
        const epiCA = entrega.epis ? entrega.epis.ca : 'N/A';
        const item = document.createElement('div');
        item.className = 'entrega-item';
        
        item.innerHTML = `
            <h4><i class="fas fa-user-check"></i> ${entrega.colaborador}</h4>
            <p><strong>EPI:</strong> ${epiNome} (CA: ${epiCA})</p>
            <p><strong>Quantidade:</strong> <span class="badge">${entrega.quantidade}</span></p>
            <p><strong>Data da Entrega:</strong> ${new Date(entrega.data_entrega).toLocaleDateString()}</p>
            <p class="obs-text"><strong>Obs:</strong> ${entrega.observacoes || 'N/A'}</p>
            <div class="card-actions">
                <button class="btn btn-secondary btn-sm" onclick="revertEntrega('${entrega.id}', '${entrega.epi_id}', ${entrega.quantidade})"><i class="fas fa-undo"></i> Reverter Entrega</button>
            </div>
        `;
        container.appendChild(item);
    });
}

async function revertEntrega(entregaId, epiId, quantidade) {
    if (!confirm(`Tem certeza que deseja reverter esta entrega? Isso irá deletar o registro e adicionar ${quantidade} unidades de volta ao estoque do EPI.`)) {
        return;
    }

    try {
        // 1. Buscar o EPI atual para saber o estoque
        const { data: epiData, error: epiError } = await supabase
            .from('epis')
            .select('estoque')
            .eq('id', epiId)
            .single();

        if (epiError) throw epiError;
        if (!epiData) throw new Error('EPI não encontrado.');

        // 2. Atualizar o Estoque (Adicionar a quantidade de volta)
        const novoEstoque = epiData.estoque + quantidade;
        const { error: updateError } = await supabase
            .from('epis')
            .update({ estoque: novoEstoque })
            .eq('id', epiId);

        if (updateError) throw updateError;

        // 3. Deletar o Registro de Entrega
        const { error: deleteError } = await supabase
            .from('entregas')
            .delete()
            .eq('id', entregaId);

        if (deleteError) throw deleteError;

        showMessage('Entrega revertida e estoque restaurado com sucesso!', 'success');
        
        // Recarregar tudo
        await loadEPIs();
        await loadEntregas();
        await loadRelatorios();

    } catch (error) {
        console.error('Erro ao reverter entrega:', error);
        showMessage('Erro ao reverter entrega: ' + error.message, 'error');
    }
}

// ====================================================================================
// FUNÇÕES DE RELATÓRIO E SUSTENTABILIDADE (MÓDULO NOVO)
// ====================================================================================

/**
 * Calcula o impacto ambiental baseado no total de unidades de EPIs distribuídas (uso eficiente).
 */
function calcularImpactoSustentavel(entregasData, episData) {
    let totalResiduosEvitados = 0;
    let totalCo2Evitado = 0;

    // Criar um mapa de EPIs para acesso rápido por ID
    const epiMap = episData.reduce((map, epi) => {
        map[epi.id] = epi;
        return map;
    }, {});

    entregasData.forEach(entrega => {
        const epiInfo = epiMap[entrega.epi_id];
        
        if (epiInfo) {
            // Tenta obter o impacto pela categoria, senão usa o padrão
            const categoria = epiInfo.categoria;
            const impacto = IMPACTO_POR_CATEGORIA[categoria] || IMPACTO_EPI_PADRAO;
            
            const quantidade = entrega.quantidade;

            totalResiduosEvitados += quantidade * impacto.peso_residuo_kg;
            totalCo2Evitado += quantidade * impacto.emissao_co2_kg;
        }
    });

    return {
        residuos: totalResiduosEvitados.toFixed(2), // 2 casas decimais
        co2: totalCo2Evitado.toFixed(2)
    };
}


/**
 * Verifica EPIs vencidos ou próximos do vencimento para descarte e sugere parceiros.
 * Esta função simula a lógica de conexão com empresas de reciclagem.
 * @param {Array} episData Lista de EPIs.
 * @returns {Object} Contendo o status do alerta e a lista de parceiros/EPIs para descarte.
 */
function checkEPIsForDisposal(episData) {
    const today = new Date();
    // Considera EPIs que vencem nos próximos 6 meses como "em fase de descarte"
    const sixMonthsAhead = new Date();
    sixMonthsAhead.setMonth(today.getMonth() + 6);

    const episParaDescarte = episData.filter(epi => {
        const validade = new Date(epi.validade);
        // Filtra EPIs vencidos ou que vencem nos próximos 6 meses
        return validade < sixMonthsAhead;
    });

    if (episParaDescarte.length === 0) {
        return {
            status: 'success',
            message: 'Ótimo! Nenhum EPI está em fase crítica ou próximo do descarte (vencimento em 6 meses).',
            parceiros: []
        };
    }

    // Mapeamento simulado de categorias de EPI para tipo de parceiro de reciclagem
    const parceirosMap = {
        'Capacete': 'Plásticos Rígidos S.A. (Polietileno)',
        'Luva': 'Recicla Borracha/Têxtil Sustentável',
        'Bota': 'Couro & Solado Sustentável',
        'Óculos': 'Plásticos Leves Reciclagem (Policarbonato)',
        'Máscara': 'Resíduos Especiais Química/Filtros',
        'Cinto de Segurança': 'Fibras e Têxteis Industriais Reciclagem',
        // Padrão para outros
        'Outro': 'Coleta Seletiva Municipal Especializada'
    };
    
    // Agrupa EPIs por Parceiro/Material
    const descartePorParceiro = episParaDescarte.reduce((acc, epi) => {
        const categoria = epi.categoria;
        // Use a categoria para encontrar o parceiro, ou use 'Outro'
        const parceiroNome = parceirosMap[categoria] || parceirosMap['Outro'];
        
        if (!acc[parceiroNome]) {
            acc[parceiroNome] = {
                parceiro: parceiroNome,
                epis: []
            };
        }
        acc[parceiroNome].epis.push(epi);
        return acc;
    }, {});

    const totalEpis = episParaDescarte.length;
    // Define o tipo de alerta: erro se houver vencido, warning se houver em breve
    const alertType = episParaDescarte.some(e => new Date(e.validade) < today) ? 'error' : 'warning';
    
    const vencidosCount = episParaDescarte.filter(e => new Date(e.validade) < today).length;
    let alertMessage = '';

    if (vencidosCount > 0) {
        alertMessage += `ALERTA CRÍTICO: ${vencidosCount} EPI(s) estão **vencidos** e precisam de descarte IMEDIATO. `;
    }

    const proximosCount = totalEpis - vencidosCount;
    if (proximosCount > 0) {
        alertMessage += `${proximosCount} EPI(s) estão próximos de vencer (próximos 6 meses). Planeje o descarte!`;
    }


    return {
        status: alertType,
        message: alertMessage.trim(),
        parceiros: Object.values(descartePorParceiro)
    };
}


function renderGraficoSustentavel(residuos, co2) {
    const ctx = document.getElementById('graficoSustentavel').getContext('2d');

    // Destruir instância anterior se existir
    if (sustentavelChart) {
        sustentavelChart.destroy();
    }

    sustentavelChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Resíduos Evitados (kg)', 'CO₂ Evitado (kg)'],
            datasets: [{
                data: [parseFloat(residuos), parseFloat(co2)],
                backgroundColor: [
                    '#4CAF50', // Verde para Resíduos
                    '#03A9F4'  // Azul para CO2
                ],
                hoverBackgroundColor: [
                    '#388E3C',
                    '#0288D1'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: 'Impacto Ambiental Positivo (Total de Entregas)',
                    font: {
                        size: 16
                    },
                    color: '#333'
                }
            }
        }
    });
}


async function loadRelatorios() {
    try {
        // 1. Contadores de EPIs
        const totalEPIs = epis.length;
        
        const criticos = epis.filter(epi => {
            const estoque = parseInt(epi.estoque, 10);
            const minimo = parseInt(epi.minimo, 10);
            return estoque <= 0 || estoque < minimo;
        }).length;

        const vencidos = epis.filter(epi => {
            const validade = new Date(epi.validade);
            return validade < new Date();
        }).length;

        // 2. Contadores de Entregas
        const { count: totalEntregas, error: countEntregasError } = await supabase
            .from('entregas')
            .select('*', { count: 'exact', head: true });
        
        if (countEntregasError) throw countEntregasError;

        // 3. Total de Unidades Entregues e Colaboradores
        const { data: entregasData, error: entregasDataError } = await supabase
            .from('entregas')
            .select('quantidade, colaborador, epi_id');

        if (entregasDataError) throw entregasDataError;

        const totalUnidadesEntregues = entregasData.reduce((sum, item) => sum + item.quantidade, 0);
        
        const colaboradoresUnicos = new Set(entregasData.map(item => item.colaborador.toLowerCase().trim()));
        const totalColaboradores = colaboradoresUnicos.size;

        // 4. CÁLCULO DO IMPACTO SUSTENTÁVEL E ALERTA DE DESCARTE
        const { residuos, co2 } = calcularImpactoSustentavel(entregasData, epis);
        const { status: descarteStatus, message: descarteMessage, parceiros: parceirosList } = checkEPIsForDisposal(epis);
        
        const alertaDescarteDiv = document.getElementById('alerta-descarte');
        const parceirosDescarteList = document.getElementById('parceiros-descarte-list');


        // Atualizar a UI (Stats Grid)
        document.getElementById('total-epis-count').textContent = totalEPIs;
        document.getElementById('criticos-count').textContent = criticos;
        document.getElementById('vencidos-count').textContent = vencidos;
        document.getElementById('entregas-count').textContent = totalEntregas;
        document.getElementById('unidades-entregues-count').textContent = totalUnidadesEntregues;
        document.getElementById('colaboradores-count').textContent = totalColaboradores;

        // Atualizar Módulo de Sustentabilidade (Impacto)
        document.getElementById('impacto-residuos').textContent = `${residuos} kg`;
        document.getElementById('impacto-co2').textContent = `${co2} kg`;

        // Renderizar o gráfico
        renderGraficoSustentavel(residuos, co2);

        // Atualizar Módulo de Sustentabilidade (Descarte)
        alertaDescarteDiv.style.display = 'block';
        alertaDescarteDiv.className = `alert alert-${descarteStatus}`;
        alertaDescarteDiv.innerHTML = descarteMessage;
        
        parceirosDescarteList.innerHTML = '';
        if (parceirosList.length > 0) {
             parceirosList.forEach(item => {
                const li = document.createElement('li');
                li.className = 'entrega-item'; // Reutilizando um estilo de item
                li.style.borderLeftColor = '#FF6300';
                li.innerHTML = `
                    <h5 style="color: #FF6300;"><i class="fas fa-handshake"></i> ${item.parceiro}</h5>
                    <p style="font-size: 0.85rem; margin-top: 5px;">
                        <strong>Materiais:</strong> 
                        ${item.epis.map(e => `
                            ${e.nome} (CA: ${e.ca}) - 
                            <span style="color: ${new Date(e.validade) < new Date() ? 'red' : '#FF6300'}; font-weight: bold;">
                                Vence em: ${new Date(e.validade).toLocaleDateString()}
                            </span>
                        `).join(' | ')}
                    </p>
                    <p style="margin-top: 5px; font-style: italic; font-size: 0.8rem;">
                        <i class="fas fa-info-circle"></i> Contato/Documentação enviada para o e-mail cadastrado.
                    </p>
                `;
                parceirosDescarteList.appendChild(li);
            });
        } else {
            parceirosDescarteList.innerHTML = '<li><p class="info">Nenhum EPI em fase de descarte (próximos 6 meses). O sistema está limpo.</p></li>';
        }

        // 5. Resumo Executivo (Texto)
        const relatoriosContainer = document.getElementById('relatorios-container');
        relatoriosContainer.innerHTML = `
            <div class="card" style="border-left: 5px solid #667eea; margin-top: 30px;">
                <h4 style="color: #667eea; margin-bottom: 10px;">Resumo Executivo</h4>
                <p style="color: #333;">
                    O sistema gerencia <strong>${totalEPIs || 0} tipos de EPIs</strong>, com <strong>${totalColaboradores} colaboradores únicos</strong> que receberam um total de <strong>${totalUnidadesEntregues} unidades</strong> de EPIs em <strong>${totalEntregas || 0} registros</strong> de entrega. 
                    Atualmente, <strong>${criticos} tipos de EPIs</strong> estão em estoque crítico e <strong>${vencidos}</strong> estão com a validade expirada.
                </p>
                <p style="color: #4CAF50; font-weight: 600; margin-top: 15px;">
                    🌿 **Impacto Ambiental:** Com a gestão eficiente, estima-se que foram evitados **${residuos} kg de resíduos sólidos** e **${co2} kg de emissão de CO₂** na atmosfera.
                </p>
                <p style="margin-top: 10px; font-size: 0.9rem; color: #666;">
                    *Cálculo baseado no total de unidades de EPIs distribuídas (uso eficiente até o fim da vida útil) e estimativas de impacto de produção por categoria.*
                </p>
            </div>
        `;

    } catch (error) {
        console.error('Erro ao gerar relatórios:', error);
        const relatoriosContainer = document.getElementById('relatorios-container');
        relatoriosContainer.innerHTML = `
            <p class="alert alert-error">Erro ao carregar relatórios: ${error.message}</p>
            <p style="color: #666; margin-top: 10px;">Verifique sua conexão com o Supabase e as permissões de leitura.</p>
        `;
    }
}

// ====================================================================================
// FUNÇÕES DE EXPORTAÇÃO DE DADOS PARA CSV
// ====================================================================================

/**
 * Converte um array de objetos para o formato CSV e inicia o download.
 * @param {Array<Object>} data O array de objetos a ser exportado.
 * @param {string} filename O nome do arquivo (ex: 'epis.csv').
 * @param {Array<string>} headers O cabeçalho desejado.
 * @param {Array<string>} keys As chaves dos objetos que correspondem à ordem do cabeçalho.
 */
function exportToCSV(data, filename, headers, keys) {
    if (!data || data.length === 0) {
        showMessage('Nenhum dado para exportar.', 'warning');
        return;
    }

    // Usa o separador de ponto e vírgula (;) para melhor compatibilidade com Excel em PT-BR
    const separator = ';';
    
    // Constrói o cabeçalho
    let csvContent = headers.join(separator) + '\n';

    // Itera sobre os dados e constrói as linhas
    data.forEach(item => {
        let row = keys.map(key => {
            let value = item[key] !== null && item[key] !== undefined ? String(item[key]) : '';
            // Substitui quebras de linha e aspas duplas, para evitar problemas na célula
            value = value.replace(/"/g, '""').replace(/\n/g, ' ');
            // Assegura que o valor esteja entre aspas se contiver o separador (;) ou outros caracteres especiais
            if (value.includes(separator) || value.includes('\n')) {
                value = `"${value}"`;
            }
            return value;
        }).join(separator);
        csvContent += row + '\n';
    });

    // Adiciona o cabeçalho BOM para caracteres especiais em CSV
    const finalCsvContent = "\ufeff" + csvContent; 
    
    // Cria o Blob (Binary Large Object) para o arquivo
    const blob = new Blob([finalCsvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Define o nome do arquivo com a data
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    link.download = filename.replace('.csv', `_${dateStr}.csv`);
    
    // Cria um link temporário para o download
    if (link.download) {
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showMessage(`Exportação de ${data.length} registros concluída!`, 'success');
    } else {
        showMessage('Seu navegador não suporta downloads de Blob diretamente.', 'error');
    }
}

/**
 * Exporta a lista global de EPIs (epis).
 */
function exportEPIsToCSV() {
    // A variável global 'epis' é carregada em loadEPIs()
    const headers = [
        "ID", "Nome", "CA", "Categoria", "Estoque Atual", "Estoque Mínimo", 
        "Validade", "Fornecedor", "Localização", "Observações", "Criado em", "Atualizado em"
    ];
    const keys = [
        "id", "nome", "ca", "categoria", "estoque", "minimo", 
        "validade", "fornecedor", "localizacao", "observacoes", "created_at", "updated_at"
    ];
    
    exportToCSV(epis, 'relatorio_epis', headers, keys);
}
// Torna a função acessível globalmente pelo HTML
window.exportEPIsToCSV = exportEPIsToCSV;

/**
 * Exporta a lista completa de Entregas buscando os dados do Supabase.
 */
async function exportEntregasToCSV() {
    // Buscar todos os dados de entrega com os nomes completos dos EPIs
    try {
        const { data, error } = await supabase
            .from('entregas')
            .select(`
                id, 
                colaborador, 
                quantidade, 
                data_entrega, 
                observacoes, 
                created_at,
                epi_id, 
                epis (nome, ca)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        const entregasFormatadas = data.map(entrega => ({
            id: entrega.id,
            colaborador: entrega.colaborador,
            epi_nome: entrega.epis?.nome || 'EPI Removido/Não Encontrado',
            epi_ca: entrega.epis?.ca || 'N/A',
            quantidade: entrega.quantidade,
            data_entrega: entrega.data_entrega,
            observacoes: entrega.observacoes,
            registro_em: entrega.created_at,
            epi_id: entrega.epi_id // UUID
        }));

        const headers = [
            "ID Entrega", "Colaborador", "EPI Nome", "EPI CA", "Quantidade", 
            "Data Entrega", "Observações", "Data/Hora Registro", "ID EPI"
        ];
        const keys = [
            "id", "colaborador", "epi_nome", "epi_ca", "quantidade", 
            "data_entrega", "observacoes", "registro_em", "epi_id"
        ];
        
        exportToCSV(entregasFormatadas, 'historico_entregas', headers, keys);
        
    } catch (error) {
        console.error('Erro ao buscar dados de Entregas para exportação:', error);
        showMessage('Erro ao buscar histórico de entregas para exportação: ' + error.message, 'error');
    }
}
// Torna a função acessível globalmente pelo HTML
window.exportEntregasToCSV = exportEntregasToCSV;