/*
 * scripts.js - VERSÃO COMPLETA CORRIGIDA
 * Sistema de Gestão de EPIs com verificação de autenticação
 */

// ====================================================================================
// CONFIGURAÇÃO DO SUPABASE
// ====================================================================================
const SUPABASE_URL = 'https://usojesvtabxybzbigpzn.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb2plc3Z0YWJ4eWJ6YmlncHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjM0NTEsImV4cCI6MjA3Njg5OTQ1MX0.kaR3WyHGMgz-JBSZocRaxyB0OAcGOJWv2m2_Ac7BeTg'; 

let supabase;
let editingEpiId = null;
let epis = [];
let entregas = [];
let currentUser = null;

// Mapeamento de impacto ambiental
const IMPACTO_EPI_PADRAO = {
    peso_residuo_kg: 0.2,
    emissao_co2_kg: 1.0
};

const IMPACTO_POR_CATEGORIA = {
    'Capacete': { peso_residuo_kg: 0.35, emissao_co2_kg: 1.5 },
    'Luva': { peso_residuo_kg: 0.1, emissao_co2_kg: 0.4 },
    'Bota': { peso_residuo_kg: 1.2, emissao_co2_kg: 2.0 },
    'Óculos': { peso_residuo_kg: 0.15, emissao_co2_kg: 0.6 },
};

let sustentavelChart = null;

// ====================================================================================
// DADOS DOS POSTOS DE COLETA
// ====================================================================================

const postosColeta = [
    {
        id: 1,
        nome: "Primare Gestão Ambiental",
        endereco: "Av. Santos Dumont, 5150 - Zona Industrial Norte, Joinville-SC",
        telefone: "(47) 99232-7172",
        email: "comercial@primareambiental.com.br",
        categoria: "Gestão de resíduos industriais",
        observacoes: "Aceita resíduos industriais; verificar EPIs",
        prioridade: "Alta",
        coordenadas: "-26.2678,-48.8453"
    },
    {
        id: 2,
        nome: "Belliville Sucatas e Transporte de Resíduos Industriais",
        endereco: "R. Severino Greter, 800 - Espinheiros, Joinville-SC",
        telefone: "(47) 3804-9585",
        email: "byanca@belliville.com.br",
        categoria: "Gestão de resíduos industriais",
        observacoes: "Aceita resíduos industriais; confirmar EPIs",
        prioridade: "Alta",
        coordenadas: "-26.2891,-48.8194"
    },
    {
        id: 3,
        nome: "Reciclagem Joinville LTDA",
        endereco: "Rua Dona Francisca, 9215 Sala 02 - Zona Industrial Norte, Joinville-SC",
        telefone: "(47) 3433-0000",
        email: "contato@reciclagemjoinville.com.br",
        categoria: "Reciclagem industrial",
        observacoes: "Aceita tecidos/EPIs limpos",
        prioridade: "Média",
        coordenadas: "-26.2745,-48.8382"
    },
    {
        id: 4,
        nome: "Cooperativa Recicla Joinville",
        endereco: "Rua Imarui, 140 - Jarivatuba, Joinville-SC",
        telefone: "(47) 3433-1020",
        email: "reciclajoinville@cooperativa.com",
        categoria: "Cooperativa de reciclagem",
        observacoes: "Aceita tecidos limpos; não contaminados",
        prioridade: "Média",
        coordenadas: "-26.3205,-48.8412"
    },
    {
        id: 5,
        nome: "Ambiental Limpeza Urbana",
        endereco: "Rua Dona Francisca, 9000 - Distrito Industrial, Joinville-SC",
        telefone: "(47) 3028-4000",
        email: "contato@ambientaljoinville.com.br",
        categoria: "Coleta de resíduos urbanos e industriais",
        observacoes: "Gestão pública e privada; confirmar EPIs",
        prioridade: "Alta",
        coordenadas: "-26.2723,-48.8367"
    },
    {
        id: 6,
        nome: "Fórmula Ambiental Joinville",
        endereco: "Rodovia BR-101, km 52, Joinville-SC",
        telefone: "(47) 3451-1400",
        email: "joinville@formulaambiental.com.br",
        categoria: "Gestão de resíduos industriais",
        observacoes: "Aceita resíduos diversos; verificar EPIs",
        prioridade: "Alta",
        coordenadas: "-26.2554,-48.7923"
    },
    {
        id: 7,
        nome: "Essencis Catarinense (UVS Joinville)",
        endereco: "Rua Quinze de Novembro, 5000 - Glória, Joinville-SC",
        telefone: "(47) 3451-2500",
        email: "atendimento@essencis.com.br",
        categoria: "Central de tratamento de resíduos industriais",
        observacoes: "Aceita resíduos perigosos; verificar EPIs",
        prioridade: "Alta",
        coordenadas: "-26.2923,-48.7891"
    },
    {
        id: 8,
        nome: "Cooperativa de Reciclagem ReciclaMais",
        endereco: "Rua Boehmerwald, 233 - Boehmerwald, Joinville-SC",
        telefone: "(47) 3436-7890",
        email: "reciclamais@cooperativa.com",
        categoria: "Cooperativa de reciclagem",
        observacoes: "Aceita têxteis limpos",
        prioridade: "Média",
        coordenadas: "-26.3356,-48.8567"
    },
    {
        id: 9,
        nome: "PEV Norte - Prefeitura de Joinville",
        endereco: "Rua Minas Gerais, 295 - Anita Garibaldi, Joinville-SC",
        telefone: "(47) 3431-3232",
        email: "meioambiente@joinville.sc.gov.br",
        categoria: "Ponto de Entrega Voluntária (Prefeitura)",
        observacoes: "Aceita eletroeletrônicos e pode incluir EPIs",
        prioridade: "Média",
        coordenadas: "-26.2814,-48.8321"
    },
    {
        id: 10,
        nome: "C&A Joinville Garten Shopping",
        endereco: "R. Rolf Wiest, 333 - Bom Retiro, Joinville-SC",
        telefone: "(47) 3027-8000",
        email: "sac@cea.com.br",
        categoria: "Varejo / Logística reversa têxtil",
        observacoes: "Programa ReCiclo; aceita roupas e tecidos",
        prioridade: "Média",
        coordenadas: "-26.3054,-48.8467"
    }
];

// ====================================================================================
// INICIALIZAÇÃO COM VERIFICAÇÃO DE LOGIN
// ====================================================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando sistema...');
    
    try {
        // 1. Inicializar Supabase
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase conectado');

        // 2. VERIFICAÇÃO CRÍTICA DE AUTENTICAÇÃO
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('❌ Erro ao verificar sessão:', sessionError);
            redirectToLogin();
            return;
        }

        if (!session) {
            console.log('❌ Usuário não autenticado');
            redirectToLogin();
            return;
        }

        console.log('✅ Usuário autenticado:', session.user.email);
        currentUser = session.user;

        // 3. Carregar dados do usuário
        await loadUserData();

        // 4. Configurar event listeners
        setupEventListeners();

        // 5. Carregar dados iniciais
        await loadInitialData();

        console.log('✅ Sistema inicializado com sucesso');

    } catch (error) {
        console.error('💥 Erro crítico na inicialização:', error);
        showMessage('Erro ao inicializar o sistema', 'error');
        redirectToLogin();
    }
});

function redirectToLogin() {
    console.log('🔀 Redirecionando para login...');
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1000);
}

function setupEventListeners() {
    document.getElementById('epi-form').addEventListener('submit', handleEpiFormSubmit);
    document.getElementById('entrega-form').addEventListener('submit', handleEntregaFormSubmit);
}

async function loadInitialData() {
    try {
        await loadEPIs();
        await loadEPIsForSelect();
        await loadEntregas();
        await loadRelatorios();
        carregarPostosColeta();

        // Definir data atual no formulário de entrega
        document.getElementById('data-entrega').value = new Date().toISOString().split('T')[0];

    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        throw error;
    }
}

// ====================================================================================
// FUNÇÕES DE USUÁRIO
// ====================================================================================

async function loadUserData() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;

        currentUser = user;
        
        // Atualizar informações do usuário na interface
        updateElementText('user-name', user.user_metadata?.full_name || 'Não informado');
        updateElementText('user-email', user.email || 'Não informado');
        updateElementText('user-id', user.id.substring(0, 8) + '...');
        updateElementText('user-created', new Date(user.created_at).toLocaleDateString('pt-BR'));
        updateElementText('ultimo-acesso', new Date().toLocaleDateString('pt-BR'));

        // Carregar atividades do usuário
        await loadUserActivity();

    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
}

async function loadUserActivity() {
    try {
        // Buscar entregas recentes do usuário
        const { data: entregas, error } = await supabase
            .from('entregas')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;

        const activityContainer = document.getElementById('user-activity');
        if (!activityContainer) return;

        if (entregas.length === 0) {
            activityContainer.innerHTML = '<p class="info">Nenhuma atividade recente.</p>';
            return;
        }

        activityContainer.innerHTML = entregas.map(entrega => `
            <div class="activity-item">
                <i class="fas fa-hand-holding"></i>
                <div>
                    <strong>Entrega registrada</strong>
                    <p>${entrega.quantidade} unidades para ${entrega.colaborador}</p>
                    <small>${new Date(entrega.created_at).toLocaleString('pt-BR')}</small>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Erro ao carregar atividades:', error);
        const activityContainer = document.getElementById('user-activity');
        if (activityContainer) {
            activityContainer.innerHTML = '<p class="info">Erro ao carregar atividades.</p>';
        }
    }
}

function alterarSenha() {
    showMessage('Para alterar sua senha, utilize a função "Esqueci minha senha" na página de login.', 'info');
}

function editarPerfil() {
    showMessage('Funcionalidade de edição de perfil em desenvolvimento.', 'info');
}

// ====================================================================================
// FUNÇÕES DE UI
// ====================================================================================

function showMessage(message, type = 'error') {
    const messageArea = document.getElementById('message-area');
    if (!messageArea) return;
    
    messageArea.textContent = message;
    messageArea.className = `alert alert-${type}`;
    messageArea.style.display = 'block';
    
    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 5000);
}

function setActiveTab(tabName) {
    // Atualizar abas
    document.querySelectorAll('.tab').forEach(button => {
        button.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`.tab[onclick="setActiveTab('${tabName}')"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Ocultar todas as seções
    const sections = ['epis', 'entregas', 'reciclagem', 'relatorios', 'usuarios'];
    sections.forEach(section => {
        const element = document.getElementById(`${section}-section`);
        if (element) element.style.display = 'none';
    });

    // Mostrar seção ativa
    const activeSection = document.getElementById(`${tabName}-section`);
    if (activeSection) {
        activeSection.style.display = 'block';
    }

    // Recarregar dados da aba
    switch(tabName) {
        case 'epis':
            loadEPIs();
            break;
        case 'entregas':
            loadEPIsForSelect();
            loadEntregas();
            break;
        case 'reciclagem':
            carregarPostosColeta();
            break;
        case 'relatorios':
            loadRelatorios();
            break;
        case 'usuarios':
            loadUserData();
            break;
    }
}

async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        showMessage('Saindo do sistema...', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    } catch (error) {
        console.error('Erro ao sair:', error);
        showMessage('Erro ao sair: ' + error.message, 'error');
    }
}

// ====================================================================================
// FUNÇÕES DE EPI
// ====================================================================================

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

async function loadEPIs() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'block';
    
    try {
        const { data, error } = await supabase
            .from('epis')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;

        epis = data;
        renderEPIs(data);
        loadEPIsForSelect();

    } catch (error) {
        console.error('Erro ao carregar EPIs:', error);
        showMessage('Erro ao carregar lista de EPIs.', 'error');
    } finally {
        if (loading) loading.style.display = 'none';
    }
}

function renderEPIs(episData) {
    const container = document.getElementById('epis-container');
    if (!container) return;

    if (episData.length === 0) {
        container.innerHTML = '<p class="info">Nenhum EPI cadastrado.</p>';
        return;
    }

    container.innerHTML = episData.map(epi => {
        const { status, class: statusClass } = getEPIStatus(epi);
        return `
            <div class="epi-card ${statusClass}">
                <h4>${epi.nome}</h4>
                <p><strong>CA:</strong> ${epi.ca}</p>
                <p><strong>Categoria:</strong> ${epi.categoria}</p>
                <p><strong>Estoque:</strong> <span class="badge">${epi.estoque}</span> (Mín: ${epi.minimo})</p>
                <p><strong>Validade:</strong> ${new Date(epi.validade).toLocaleDateString()}</p>
                <div class="status-label">${status}</div>
                <div class="card-actions">
                    <button class="btn btn-warning btn-sm" onclick="editEPI('${epi.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteEPI('${epi.id}')">
                        <i class="fas fa-trash-alt"></i> Excluir
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function handleEpiFormSubmit(event) {
    event.preventDefault();
    
    try {
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
        await loadRelatorios();

    } catch (error) {
        console.error('Erro no formulário EPI:', error);
        showMessage('Erro ao processar formulário: ' + error.message, 'error');
    }
}

async function createEPI(epiData) {
    const { error } = await supabase.from('epis').insert([epiData]);

    if (error) {
        console.error('Erro ao cadastrar EPI:', error);
        throw new Error('Erro ao cadastrar EPI: ' + error.message);
    } else {
        showMessage('EPI cadastrado com sucesso!', 'success');
    }
}

function editEPI(epiId) {
    const epi = epis.find(e => e.id === epiId);
    if (!epi) {
        showMessage('EPI não encontrado.', 'error');
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
        throw new Error('Erro ao atualizar EPI: ' + error.message);
    } else {
        showMessage('EPI atualizado com sucesso!', 'success');
    }
}

async function deleteEPI(epiId) {
    if (!confirm('Tem certeza que deseja excluir este EPI?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('epis')
            .delete()
            .eq('id', epiId);

        if (error) throw error;

        showMessage('EPI excluído com sucesso!', 'success');
        await loadEPIs();
        await loadRelatorios();

    } catch (error) {
        console.error('Erro ao excluir EPI:', error);
        showMessage('Erro ao excluir EPI: ' + error.message, 'error');
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
    if (!select) return;

    select.innerHTML = '<option value="">Selecione um EPI (com estoque disponível)</option>';

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
    
    try {
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
            showMessage('Estoque insuficiente.', 'error');
            return;
        }

        // Registrar entrega
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

        // Atualizar estoque
        const novoEstoque = epi.estoque - quantidade;
        const { error: estoqueError } = await supabase
            .from('epis')
            .update({ estoque: novoEstoque })
            .eq('id', epiId);

        if (estoqueError) throw estoqueError;

        showMessage('Entrega registrada com sucesso!', 'success');
        document.getElementById('entrega-form').reset();
        document.getElementById('data-entrega').value = new Date().toISOString().split('T')[0];

        await loadEPIs();
        await loadEntregas();
        await loadRelatorios();

    } catch (error) {
        console.error('Erro ao registrar entrega:', error);
        showMessage('Erro ao registrar entrega: ' + error.message, 'error');
    }
}

async function loadEntregas() {
    try {
        const { data, error } = await supabase
            .from('entregas')
            .select(`
                *,
                epis (nome, ca)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        entregas = data;
        renderEntregas(data);

    } catch (error) {
        console.error('Erro ao carregar entregas:', error);
        showMessage('Erro ao carregar histórico.', 'error');
    }
}

function renderEntregas(entregasData) {
    const container = document.getElementById('entregas-container');
    if (!container) return;

    if (entregasData.length === 0) {
        container.innerHTML = '<p class="info">Nenhum registro de entrega.</p>';
        return;
    }

    container.innerHTML = entregasData.map(entrega => {
        const epiNome = entrega.epis ? entrega.epis.nome : 'EPI Removido';
        const epiCA = entrega.epis ? entrega.epis.ca : 'N/A';
        
        return `
            <div class="entrega-item">
                <h4><i class="fas fa-user-check"></i> ${entrega.colaborador}</h4>
                <p><strong>EPI:</strong> ${epiNome} (CA: ${epiCA})</p>
                <p><strong>Quantidade:</strong> <span class="badge">${entrega.quantidade}</span></p>
                <p><strong>Data:</strong> ${new Date(entrega.data_entrega).toLocaleDateString()}</p>
                <p class="obs-text"><strong>Obs:</strong> ${entrega.observacoes || 'N/A'}</p>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm" onclick="revertEntrega('${entrega.id}', '${entrega.epi_id}', ${entrega.quantidade})">
                        <i class="fas fa-undo"></i> Reverter
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function revertEntrega(entregaId, epiId, quantidade) {
    if (!confirm(`Reverter esta entrega? ${quantidade} unidades serão devolvidas ao estoque.`)) {
        return;
    }

    try {
        // Buscar estoque atual
        const { data: epiData, error: epiError } = await supabase
            .from('epis')
            .select('estoque')
            .eq('id', epiId)
            .single();

        if (epiError) throw epiError;

        // Atualizar estoque
        const novoEstoque = epiData.estoque + quantidade;
        const { error: updateError } = await supabase
            .from('epis')
            .update({ estoque: novoEstoque })
            .eq('id', epiId);

        if (updateError) throw updateError;

        // Deletar entrega
        const { error: deleteError } = await supabase
            .from('entregas')
            .delete()
            .eq('id', entregaId);

        if (deleteError) throw deleteError;

        showMessage('Entrega revertida!', 'success');
        await loadEPIs();
        await loadEntregas();
        await loadRelatorios();

    } catch (error) {
        console.error('Erro ao reverter:', error);
        showMessage('Erro ao reverter entrega.', 'error');
    }
}

// ====================================================================================
// FUNÇÕES PARA POSTOS DE COLETA (SEM BOTÃO DE EMAIL)
// ====================================================================================

function carregarPostosColeta() {
    const container = document.getElementById('lista-postos');
    if (!container) return;

    const filtroCategoria = document.getElementById('filtro-categoria')?.value || '';
    const filtroPrioridade = document.getElementById('filtro-prioridade')?.value || '';
    const busca = document.getElementById('busca-postos')?.value.toLowerCase() || '';

    let postosFiltrados = postosColeta.filter(posto => {
        const matchCategoria = !filtroCategoria || posto.categoria === filtroCategoria;
        const matchPrioridade = !filtroPrioridade || posto.prioridade === filtroPrioridade;
        const matchBusca = !busca || 
            posto.nome.toLowerCase().includes(busca) ||
            posto.endereco.toLowerCase().includes(busca) ||
            posto.categoria.toLowerCase().includes(busca);

        return matchCategoria && matchPrioridade && matchBusca;
    });

    atualizarEstatisticasPostos(postosFiltrados);

    if (postosFiltrados.length === 0) {
        container.innerHTML = '<p class="info">Nenhum posto encontrado.</p>';
        return;
    }

    container.innerHTML = postosFiltrados.map(posto => `
        <div class="posto-card ${posto.prioridade.toLowerCase()}">
            <div class="posto-header">
                <div class="posto-nome">${posto.nome}</div>
                <div class="posto-prioridade prioridade-${posto.prioridade.toLowerCase()}">
                    ${posto.prioridade}
                </div>
            </div>
            
            <div class="posto-info">
                <p><i class="fas fa-map-marker-alt"></i> ${posto.endereco}</p>
                <p><i class="fas fa-tag"></i> ${posto.categoria}</p>
                <p><i class="fas fa-sticky-note"></i> ${posto.observacoes}</p>
            </div>

            <div class="posto-contato">
                <h4><i class="fas fa-address-book"></i> Contato</h4>
                ${posto.telefone ? `<p><i class="fas fa-phone"></i> ${posto.telefone}</p>` : ''}
                ${posto.email ? `<p><i class="fas fa-envelope"></i> ${posto.email}</p>` : ''}
            </div>

            <div class="posto-acoes">
                <button class="btn-map" onclick="abrirNoMaps('${posto.endereco}')">
                    <i class="fas fa-map"></i> Maps
                </button>
                ${posto.telefone ? `
                <button class="btn-call" onclick="fazerLigacao('${posto.telefone}')">
                    <i class="fas fa-phone"></i> Ligar
                </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function atualizarEstatisticasPostos(postos) {
    const totalPostos = document.getElementById('total-postos');
    const postosIndustriais = document.getElementById('postos-industriais');
    const postosCooperativas = document.getElementById('postos-cooperativas');

    if (totalPostos) totalPostos.textContent = postos.length;
    if (postosIndustriais) postosIndustriais.textContent = 
        postos.filter(p => p.categoria.includes('industrial')).length;
    if (postosCooperativas) postosCooperativas.textContent = 
        postos.filter(p => p.categoria.includes('Cooperativa')).length;
}

function filtrarPostos() {
    carregarPostosColeta();
}

function abrirNoMaps(endereco) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
}

function fazerLigacao(telefone) {
    const numeroLimpo = telefone.replace(/[^\d+]/g, '');
    window.open(`tel:${numeroLimpo}`, '_self');
}

// ====================================================================================
// FUNÇÕES DE RELATÓRIOS
// ====================================================================================

function calcularImpactoSustentavel(entregasData, episData) {
    let totalResiduosEvitados = 0;
    let totalCo2Evitado = 0;

    const epiMap = episData.reduce((map, epi) => {
        map[epi.id] = epi;
        return map;
    }, {});

    entregasData.forEach(entrega => {
        const epiInfo = epiMap[entrega.epi_id];
        
        if (epiInfo) {
            const categoria = epiInfo.categoria;
            const impacto = IMPACTO_POR_CATEGORIA[categoria] || IMPACTO_EPI_PADRAO;
            const quantidade = entrega.quantidade;

            totalResiduosEvitados += quantidade * impacto.peso_residuo_kg;
            totalCo2Evitado += quantidade * impacto.emissao_co2_kg;
        }
    });

    return {
        residuos: totalResiduosEvitados.toFixed(2),
        co2: totalCo2Evitado.toFixed(2)
    };
}

function checkEPIsForDisposal(episData) {
    const today = new Date();
    const sixMonthsAhead = new Date();
    sixMonthsAhead.setMonth(today.getMonth() + 6);

    const episParaDescarte = episData.filter(epi => {
        const validade = new Date(epi.validade);
        return validade < sixMonthsAhead;
    });

    if (episParaDescarte.length === 0) {
        return {
            status: 'success',
            message: 'Nenhum EPI próximo do descarte.',
            parceiros: []
        };
    }

    const parceirosMap = {
        'Capacete': 'Plásticos Rígidos S.A.',
        'Luva': 'Recicla Borracha/Têxtil',
        'Bota': 'Couro & Solado Sustentável',
        'Óculos': 'Plásticos Leves Reciclagem',
        'Máscara': 'Resíduos Especiais Química',
        'Cinto de Segurança': 'Fibras e Têxteis Industriais',
        'Outro': 'Coleta Seletiva Municipal'
    };
    
    const descartePorParceiro = episParaDescarte.reduce((acc, epi) => {
        const categoria = epi.categoria;
        const parceiroNome = parceirosMap[categoria] || parceirosMap['Outro'];
        
        if (!acc[parceiroNome]) {
            acc[parceiroNome] = { parceiro: parceiroNome, epis: [] };
        }
        acc[parceiroNome].epis.push(epi);
        return acc;
    }, {});

    const vencidosCount = episParaDescarte.filter(e => new Date(e.validade) < today).length;
    const alertType = vencidosCount > 0 ? 'error' : 'warning';
    
    let alertMessage = '';
    if (vencidosCount > 0) {
        alertMessage += `ALERTA: ${vencidosCount} EPI(s) vencidos. `;
    }
    if (episParaDescarte.length - vencidosCount > 0) {
        alertMessage += `${episParaDescarte.length - vencidosCount} EPI(s) próximos do vencimento.`;
    }

    return {
        status: alertType,
        message: alertMessage.trim(),
        parceiros: Object.values(descartePorParceiro)
    };
}

function renderGraficoSustentavel(residuos, co2) {
    const ctx = document.getElementById('graficoSustentavel');
    if (!ctx) return;

    if (sustentavelChart) {
        sustentavelChart.destroy();
    }

    sustentavelChart = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Resíduos Evitados (kg)', 'CO₂ Evitado (kg)'],
            datasets: [{
                data: [parseFloat(residuos), parseFloat(co2)],
                backgroundColor: ['#4CAF50', '#03A9F4'],
                hoverBackgroundColor: ['#388E3C', '#0288D1']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                title: {
                    display: true,
                    text: 'Impacto Ambiental Positivo',
                    font: { size: 16 },
                    color: '#333'
                }
            }
        }
    });
}

async function loadRelatorios() {
    try {
        // Contadores de EPIs
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

        // Contadores de Entregas
        const { count: totalEntregas, error: countEntregasError } = await supabase
            .from('entregas')
            .select('*', { count: 'exact', head: true });
        
        if (countEntregasError) throw countEntregasError;

        const { data: entregasData, error: entregasDataError } = await supabase
            .from('entregas')
            .select('quantidade, colaborador, epi_id');

        if (entregasDataError) throw entregasDataError;

        const totalUnidadesEntregues = entregasData.reduce((sum, item) => sum + item.quantidade, 0);
        const colaboradoresUnicos = new Set(entregasData.map(item => item.colaborador.toLowerCase().trim()));
        const totalColaboradores = colaboradoresUnicos.size;

        // Impacto Sustentável
        const { residuos, co2 } = calcularImpactoSustentavel(entregasData, epis);
        const { status: descarteStatus, message: descarteMessage, parceiros: parceirosList } = checkEPIsForDisposal(epis);
        
        // Atualizar UI
        updateElementText('total-epis-count', totalEPIs);
        updateElementText('criticos-count', criticos);
        updateElementText('vencidos-count', vencidos);
        updateElementText('entregas-count', totalEntregas);
        updateElementText('unidades-entregues-count', totalUnidadesEntregues);
        updateElementText('colaboradores-count', totalColaboradores);
        updateElementText('impacto-residuos', `${residuos} kg`);
        updateElementText('impacto-co2', `${co2} kg`);

        renderGraficoSustentavel(residuos, co2);

        // Descarte Sustentável
        const alertaDescarteDiv = document.getElementById('alerta-descarte');
        const parceirosDescarteList = document.getElementById('parceiros-descarte-list');

        if (alertaDescarteDiv) {
            alertaDescarteDiv.style.display = 'block';
            alertaDescarteDiv.className = `alert alert-${descarteStatus}`;
            alertaDescarteDiv.innerHTML = descarteMessage;
        }
        
        if (parceirosDescarteList) {
            parceirosDescarteList.innerHTML = '';
            if (parceirosList.length > 0) {
                parceirosList.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'entrega-item';
                    li.style.borderLeftColor = '#FF6300';
                    li.innerHTML = `
                        <h5 style="color: #FF6300;"><i class="fas fa-handshake"></i> ${item.parceiro}</h5>
                        <p style="font-size: 0.85rem; margin-top: 5px;">
                            <strong>Materiais:</strong> 
                            ${item.epis.map(e => `
                                ${e.nome} (CA: ${e.ca}) - 
                                <span style="color: ${new Date(e.validade) < new Date() ? 'red' : '#FF6300'};">
                                    Vence: ${new Date(e.validade).toLocaleDateString()}
                                </span>
                            `).join(' | ')}
                        </p>
                    `;
                    parceirosDescarteList.appendChild(li);
                });
            } else {
                parceirosDescarteList.innerHTML = '<li><p class="info">Nenhum EPI em fase de descarte.</p></li>';
            }
        }

        // Resumo Executivo
        const relatoriosContainer = document.getElementById('relatorios-container');
        if (relatoriosContainer) {
            relatoriosContainer.innerHTML = `
                <div class="card" style="border-left: 5px solid #667eea; margin-top: 30px;">
                    <h4 style="color: #667eea; margin-bottom: 10px;">Resumo Executivo</h4>
                    <p style="color: #333;">
                        O sistema gerencia <strong>${totalEPIs} tipos de EPIs</strong>, com <strong>${totalColaboradores} colaboradores</strong> que receberam <strong>${totalUnidadesEntregues} unidades</strong> em <strong>${totalEntregas} entregas</strong>.
                    </p>
                    <p style="color: #4CAF50; font-weight: 600; margin-top: 15px;">
                        🌿 <strong>Impacto Ambiental:</strong> ${residuos} kg de resíduos e ${co2} kg de CO₂ evitados.
                    </p>
                </div>
            `;
        }

    } catch (error) {
        console.error('Erro ao gerar relatórios:', error);
        showMessage('Erro ao carregar relatórios.', 'error');
    }
}

function updateElementText(id, text) {
    const element = document.getElementById(id);
    if (element) element.textContent = text;
}

// ====================================================================================
// FUNÇÕES DE EXPORTAÇÃO
// ====================================================================================

function exportToCSV(data, filename, headers, keys) {
    if (!data || data.length === 0) {
        showMessage('Nenhum dado para exportar.', 'warning');
        return;
    }

    const separator = ';';
    let csvContent = headers.join(separator) + '\n';

    data.forEach(item => {
        let row = keys.map(key => {
            let value = item[key] !== null && item[key] !== undefined ? String(item[key]) : '';
            value = value.replace(/"/g, '""').replace(/\n/g, ' ');
            if (value.includes(separator) || value.includes('\n')) {
                value = `"${value}"`;
            }
            return value;
        }).join(separator);
        csvContent += row + '\n';
    });

    const finalCsvContent = "\ufeff" + csvContent; 
    const blob = new Blob([finalCsvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    link.download = filename.replace('.csv', `_${dateStr}.csv`);
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage(`Exportação concluída!`, 'success');
}

function exportEPIsToCSV() {
    const headers = [
        "ID", "Nome", "CA", "Categoria", "Estoque Atual", "Estoque Mínimo", 
        "Validade", "Fornecedor", "Localização", "Observações"
    ];
    const keys = [
        "id", "nome", "ca", "categoria", "estoque", "minimo", 
        "validade", "fornecedor", "localizacao", "observacoes"
    ];
    
    exportToCSV(epis, 'relatorio_epis', headers, keys);
}

async function exportEntregasToCSV() {
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
            epi_nome: entrega.epis?.nome || 'EPI Removido',
            epi_ca: entrega.epis?.ca || 'N/A',
            quantidade: entrega.quantidade,
            data_entrega: entrega.data_entrega,
            observacoes: entrega.observacoes,
            registro_em: entrega.created_at,
            epi_id: entrega.epi_id
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
        console.error('Erro ao exportar entregas:', error);
        showMessage('Erro ao exportar histórico.', 'error');
    }
}

// ====================================================================================
// EXPORTAR FUNÇÕES GLOBAIS
// ====================================================================================

window.setActiveTab = setActiveTab;
window.logout = logout;
window.editEPI = editEPI;
window.deleteEPI = deleteEPI;
window.resetForm = resetForm;
window.revertEntrega = revertEntrega;
window.exportEPIsToCSV = exportEPIsToCSV;
window.exportEntregasToCSV = exportEntregasToCSV;
window.carregarPostosColeta = carregarPostosColeta;
window.filtrarPostos = filtrarPostos;
window.abrirNoMaps = abrirNoMaps;
window.fazerLigacao = fazerLigacao;
window.alterarSenha = alterarSenha;
window.editarPerfil = editarPerfil;