/*
 * scripts.js - CORRIGIDO (Versão Final com Correção UUID e Reversão de Entrega)
 * Lógica de Autenticação e Gerenciamento de EPIs com Supabase
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

// ====================================================================================
// INICIALIZAÇÃO
// ====================================================================================

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Inicializa Supabase
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase conectado com sucesso!');
        
        // Configurar políticas RLS primeiro (se necessário)
        await checkAndSetupRLS();
        
        // Carrega dados iniciais
        await loadEPIs();
        await loadEntregas();
        await populateEPISelect();
        
        // Define a data de entrega padrão como a data atual
        const dataEntregaInput = document.getElementById('data_entrega');
        if (dataEntregaInput) {
            // Garante que o fuso horário local seja respeitado
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            dataEntregaInput.value = `${year}-${month}-${day}`;
        }
        
    } catch (error) {
        console.error('❌ Erro ao inicializar:', error);
        showMessage('Erro ao conectar com o banco de dados: ' + error.message, 'error');
    }
    
    // Adiciona Listeners de Evento
    const epiForm = document.getElementById('epiForm');
    const entregaForm = document.getElementById('entregaForm');
    
    if (epiForm) epiForm.addEventListener('submit', handleEPISubmit);
    if (entregaForm) entregaForm.addEventListener('submit', handleEntregaSubmit);
});

// ====================================================================================
// CONFIGURAÇÃO DE POLÍTICAS RLS (Row Level Security)
// ====================================================================================

async function checkAndSetupRLS() {
    try {
        // Testa se podemos acessar as tabelas
        const { error: episError } = await supabase
            .from('epis')
            .select('id')
            .limit(1);
            
        if (episError && episError.code === '42501') {
            console.warn('⚠️ RLS está bloqueando acesso. Configure as políticas no Supabase Dashboard.');
            showMessage('Configuração de segurança detectada. Verifique as políticas RLS no Supabase.', 'error');
        }
        
    } catch (error) {
        console.error('Erro ao verificar RLS:', error);
    }
}

// ====================================================================================
// FUNÇÕES DE UI (INTERFACE DO USUÁRIO)
// ====================================================================================

function showMessage(message, type = 'error') {
    const messageArea = document.getElementById('message-area');
    if (!messageArea) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.innerHTML = `
        <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i>
        ${message}
    `;
    messageArea.innerHTML = '';
    messageArea.appendChild(messageDiv);
    
    setTimeout(() => {
        if (messageArea.contains(messageDiv)) {
            messageArea.removeChild(messageDiv);
        }
    }, 5000);
}

function resetForm() {
    const epiForm = document.getElementById('epiForm');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    
    if (epiForm) epiForm.reset();
    editingEpiId = null;
    
    if (formTitle) formTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Adicionar Novo EPI';
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Salvar EPI';
    if (cancelBtn) cancelBtn.style.display = 'none';
}
window.resetForm = resetForm;

function setActiveTab(tab, event) {
    // Esconder todas as seções
    document.getElementById('epis-section').style.display = 'none';
    document.getElementById('entregas-section').style.display = 'none';
    document.getElementById('relatorios-section').style.display = 'none';
    
    // Remover classe active de todas as abas
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    // Mostrar seção selecionada e ativar aba
    document.getElementById(`${tab}-section`).style.display = 'block';
    
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback para ativação da aba
        document.querySelector(`.tab[onclick="setActiveTab('${tab}', event)"]`)?.classList.add('active');
    }
    
    // Carregar dados específicos se necessário
    if (tab === 'entregas') {
        populateEPISelect();
        loadEntregas();
    } else if (tab === 'relatorios') {
        loadRelatorios();
    }
}
window.setActiveTab = setActiveTab;

// ====================================================================================
// FUNÇÕES DE GERENCIAMENTO DE EPI (CRUD)
// ====================================================================================

async function handleEPISubmit(event) {
    event.preventDefault();
    
    const nome = document.getElementById('nome').value;
    const categoria = document.getElementById('categoria').value;
    const ca = document.getElementById('ca').value;
    const estoque = document.getElementById('estoque').value;
    const minimo = document.getElementById('minimo').value;
    
    if (!nome || !categoria || !ca || !estoque || !minimo) {
        showMessage('Por favor, preencha todos os campos obrigatórios (*).', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('submit-btn');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        
        const epiData = {
            nome,
            categoria,
            ca,
            estoque: parseInt(estoque),
            minimo: parseInt(minimo), 
            validade: document.getElementById('validade').value || null,
            fornecedor: document.getElementById('fornecedor').value || null,
            localizacao: document.getElementById('localizacao').value || null,
            observacoes: document.getElementById('observacoes').value || null,
            updated_at: new Date().toISOString()
        };
        
        let result;
        
        if (editingEpiId) {
            // UPDATE
            result = await supabase
                .from('epis')
                .update(epiData)
                .eq('id', editingEpiId);
                
            if (result.error) throw result.error;
            showMessage('EPI atualizado com sucesso!', 'success');
        } else {
            // CREATE
            // O ID (UUID) é gerado automaticamente pelo Supabase/PostgreSQL
            epiData.created_at = new Date().toISOString();
            result = await supabase
                .from('epis')
                .insert([epiData]);
                
            if (result.error) throw result.error;
            showMessage('EPI cadastrado com sucesso!', 'success');
        }
        
        resetForm();
        await loadEPIs();
        await populateEPISelect();
        
    } catch (error) {
        console.error('Erro ao salvar EPI:', error);
        showMessage('Erro ao salvar EPI: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = editingEpiId ? 
            '<i class="fas fa-save"></i> Atualizar EPI' : 
            '<i class="fas fa-save"></i> Salvar EPI';
    }
}

async function loadEPIs() {
    const loadingDiv = document.getElementById('loading');
    const episContainer = document.getElementById('epis-container');
    
    try {
        if (loadingDiv) loadingDiv.style.display = 'block';
        if (episContainer) episContainer.innerHTML = '';
        
        const { data, error } = await supabase
            .from('epis')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        epis = data || [];
        renderEPIs();
        updateStats();
        
    } catch (error) {
        console.error('Erro ao carregar EPIs:', error);
        showMessage('Erro ao carregar EPIs: ' + error.message, 'error');
    } finally {
        if (loadingDiv) loadingDiv.style.display = 'none';
    }
}

function renderEPIs() {
    const episContainer = document.getElementById('epis-container');
    if (!episContainer) return;
    
    if (!epis || epis.length === 0) {
        episContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-shield-alt" style="font-size: 3rem; margin-bottom: 20px; display: block;"></i>
                <h3>Nenhum EPI cadastrado</h3>
                <p>Adicione seu primeiro EPI usando o formulário acima.</p>
            </div>
        `;
        return;
    }
    
    episContainer.innerHTML = epis.map(epi => {
        const status = getEPIStatus(epi);
        // Note: epi.id é um UUID string. Isso é seguro para passar em onclick().
        return `
            <div class="epi-card ${status.cardClass}">
                <span class="status-badge ${status.class}">${status.text}</span>
                <div class="epi-info">
                    <h3>${epi.nome}</h3>
                    <p><strong>CA:</strong> ${epi.ca}</p>
                    <p><strong>Categoria:</strong> ${epi.categoria}</p>
                    <p><strong>Estoque:</strong> ${epi.estoque} unidades (Min: ${epi.minimo})</p>
                    <p><strong>Validade:</strong> ${epi.validade ? new Date(epi.validade).toLocaleDateString('pt-BR') : 'Não informada'}</p>
                    <p><strong>Local:</strong> ${epi.localizacao || 'N/A'}</p>
                </div>
                <div class="epi-actions">
                    <button class="btn btn-warning btn-sm" onclick="editEPI('${epi.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="deleteEPI('${epi.id}', '${epi.nome.replace(/'/g, "\\'")}')">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function getEPIStatus(epi) {
    let statusText = 'OK';
    let statusClass = 'status-ok';
    let cardClass = '';
    
    const hoje = new Date();
    const validade = epi.validade ? new Date(epi.validade) : null;
    const umMesApos = new Date();
    umMesApos.setMonth(hoje.getMonth() + 1);

    // Verifica estoque primeiro
    if (epi.estoque === 0) {
        statusText = 'FALTA';
        statusClass = 'status-critico';
        cardClass = 'status-critico';
    } else if (epi.estoque <= epi.minimo) {
        statusText = 'CRÍTICO';
        statusClass = 'status-critico';
        cardClass = 'status-critico';
    } else if (epi.estoque < epi.minimo * 2) {
        statusText = 'ATENÇÃO';
        statusClass = 'status-atencao';
        cardClass = 'status-atencao';
    }

    // Sobrescreve por validade se for mais crítica
    if (validade && validade < hoje) {
        statusText = 'VENCIDO';
        statusClass = 'status-critico';
        cardClass = 'status-critico';
    } else if (validade && validade < umMesApos) {
        statusText = 'VALIDADE PRÓX.';
        statusClass = 'status-atencao';
        if (!cardClass) cardClass = 'status-atencao';
    }

    return { text: statusText, class: statusClass, cardClass: cardClass };
}

async function editEPI(id) {
    try {
        const { data: epi, error } = await supabase
            .from('epis')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !epi) throw new Error('EPI não encontrado para edição.');

        // Preenche o formulário
        document.getElementById('nome').value = epi.nome;
        document.getElementById('categoria').value = epi.categoria;
        document.getElementById('ca').value = epi.ca;
        document.getElementById('estoque').value = epi.estoque;
        document.getElementById('minimo').value = epi.minimo;
        document.getElementById('validade').value = epi.validade || '';
        document.getElementById('fornecedor').value = epi.fornecedor || '';
        document.getElementById('localizacao').value = epi.localizacao || '';
        document.getElementById('observacoes').value = epi.observacoes || '';

        // Altera o estado para Edição
        editingEpiId = epi.id; // epi.id é o UUID
        const formTitle = document.getElementById('form-title');
        const submitBtn = document.getElementById('submit-btn');
        const cancelBtn = document.getElementById('cancel-btn');
        
        if (formTitle) formTitle.innerHTML = `<i class="fas fa-edit"></i> Editar EPI: ${epi.nome}`;
        if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Atualizar EPI';
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Erro ao buscar EPI para edição:', error);
        showMessage('Erro ao carregar dados para edição: ' + error.message, 'error');
    }
}

async function deleteEPI(id, nome) {
    if (!confirm(`Tem certeza que deseja excluir o EPI "${nome}" (ID: ${id})? Isso também removerá todas as entregas associadas (se a FK for CASCADE).`)) {
        return;
    }

    try {
        const { error } = await supabase
            .from('epis')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showMessage(`EPI "${nome}" excluído com sucesso!`, 'success');
        
        await loadEPIs();
        await loadEntregas(); // Recarrega entregas caso haja exclusão em cascata
        await populateEPISelect();
        resetForm();

    } catch (error) {
        console.error('Erro ao excluir EPI:', error);
        showMessage('Erro ao excluir EPI: ' + error.message, 'error');
    }
}
window.editEPI = editEPI;
window.deleteEPI = deleteEPI;

// ====================================================================================
// FUNÇÕES DA SEÇÃO ENTREGAS
// ====================================================================================

async function populateEPISelect() {
    const select = document.getElementById('epi_id');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um EPI...</option>';

    try {
        const { data: epis, error } = await supabase
            .from('epis')
            .select('id, nome, estoque, ca')
            .gt('estoque', 0) // Apenas EPIs com estoque > 0
            .order('nome');

        if (error) throw error;

        epis.forEach(epi => {
            const option = document.createElement('option');
            // O value da option é o UUID do EPI (epis.id)
            option.value = epi.id; 
            option.textContent = `${epi.nome} (Estoque: ${epi.estoque}) - CA: ${epi.ca}`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Erro ao popular EPI Select:', error);
    }
}

async function handleEntregaSubmit(event) {
    event.preventDefault();
    
    // epi_id é a STRING UUID do select.
    const epi_id = document.getElementById('epi_id').value;
    const quantidade = parseInt(document.getElementById('quantidade').value);
    const colaborador = document.getElementById('colaborador').value;
    const data_entrega = document.getElementById('data_entrega').value;
    
    if (!epi_id || !colaborador || quantidade <= 0 || isNaN(quantidade) || !data_entrega) {
        showMessage('Preencha todos os campos obrigatórios com valores válidos.', 'error');
        return;
    }

    const entregaBtn = document.querySelector('#entregaForm .btn-success');
    try {
        entregaBtn.disabled = true;
        entregaBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando...';
        
        // 1. Verifica o estoque atual
        const { data: epi, error: fetchEpiError } = await supabase
            .from('epis')
            .select('estoque, nome')
            .eq('id', epi_id) // epi_id é um UUID
            .single();
        
        if (fetchEpiError) throw fetchEpiError;
        
        if (!epi) {
            showMessage('EPI não encontrado.', 'error');
            return;
        }

        if (epi.estoque < quantidade) {
            showMessage(`Estoque insuficiente de ${epi.nome}! Disponível: ${epi.estoque} unidades.`, 'error');
            return;
        }
        
        // 2. Registra a Entrega
        const entregaData = {
            colaborador: colaborador,
            // CORRIGIDO: Passando o UUID como string. REMOVIDO: parseInt()
            epi_id: epi_id, 
            quantidade: quantidade,
            data_entrega: data_entrega,
            observacoes: document.getElementById('observacoes_entrega').value || null,
            created_at: new Date().toISOString()
        };
        
        const { error: entregaError } = await supabase
            .from('entregas')
            .insert([entregaData]);
        
        if (entregaError) throw entregaError;
        
        // 3. Atualiza o Estoque do EPI
        const novoEstoque = epi.estoque - quantidade;
        const { error: estoqueError } = await supabase
            .from('epis')
            .update({ 
                estoque: novoEstoque,
                updated_at: new Date().toISOString()
            })
            .eq('id', epi_id); // epi_id é um UUID
        
        if (estoqueError) throw estoqueError;
        
        showMessage('Entrega registrada e estoque atualizado com sucesso!', 'success');
        
        // Limpa e recarrega
        document.getElementById('entregaForm').reset();
        
        // Define data padrão novamente após reset
        const dataEntregaInput = document.getElementById('data_entrega');
        if (dataEntregaInput) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            dataEntregaInput.value = `${year}-${month}-${day}`;
        }
        
        await loadEntregas();
        await loadEPIs();
        await populateEPISelect();
        
    } catch (error) {
        console.error('Erro ao registrar entrega:', error);
        // O erro '22P02' que você viu é capturado aqui
        showMessage('Erro ao registrar entrega: ' + (error.message || JSON.stringify(error)), 'error');
    } finally {
        entregaBtn.disabled = false;
        entregaBtn.innerHTML = '<i class="fas fa-check"></i> Registrar Entrega';
    }
}

async function loadEntregas() {
    const entregasContainer = document.getElementById('entregas-container');
    if (!entregasContainer) return;
    
    entregasContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando Entregas...</div>';

    try {
        // Busca a entrega e dados aninhados do EPI (join)
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
            `) // O comentário foi removido daqui!
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        entregas = data || [];
        renderEntregas();
        
    } catch (error) {
        console.error('Erro ao carregar entregas:', error);
        // Garante que a mensagem de erro seja clara
        entregasContainer.innerHTML = `<p class="error">Erro ao carregar histórico: ${error.message}</p>`;
    }
}

async function reverseEntrega(entregaId, epiId, quantidade, colaborador) {
    if (!confirm(`Tem certeza que deseja REVERTER a entrega de ${quantidade} unidades do EPI para "${colaborador}"? Esta ação é irreversível e irá adicionar as unidades de volta ao estoque.`)) {
        return;
    }

    try {
        // 1. Busca o estoque atual do EPI
        const { data: epi, error: fetchEpiError } = await supabase
            .from('epis')
            .select('estoque, nome')
            .eq('id', epiId)
            .single();

        if (fetchEpiError) throw fetchEpiError;
        if (!epi) throw new Error('EPI de referência não encontrado.');

        // 2. Remove o registro da entrega
        const { error: deleteError } = await supabase
            .from('entregas')
            .delete()
            .eq('id', entregaId); // entrega.id é SERIAL PRIMARY KEY (int4)

        if (deleteError) throw deleteError;

        // 3. Atualiza o Estoque do EPI (adiciona de volta)
        const novoEstoque = epi.estoque + quantidade;
        const { error: updateError } = await supabase
            .from('epis')
            .update({ 
                estoque: novoEstoque,
                updated_at: new Date().toISOString()
            })
            .eq('id', epiId); // epi.id é UUID

        if (updateError) throw updateError;
        
        showMessage(`Entrega revertida e ${quantidade} unidades de ${epi.nome} adicionadas ao estoque!`, 'success');
        
        // Recarrega tudo
        await loadEntregas();
        await loadEPIs();
        await populateEPISelect();

    } catch (error) {
        console.error('Erro ao reverter entrega:', error);
        showMessage('Erro ao reverter entrega: ' + error.message, 'error');
    }
}
window.reverseEntrega = reverseEntrega; // Torna a função acessível no onclick

function renderEntregas() {
    const entregasContainer = document.getElementById('entregas-container');
    if (!entregasContainer) return;

    if (!entregas || entregas.length === 0) {
        entregasContainer.innerHTML = `
            <p style="text-align: center; color: #666; padding: 20px;">Nenhuma entrega registrada ainda.</p>
        `;
        return;
    }

    entregasContainer.innerHTML = entregas.map(entrega => {
        const epi = entrega.epis || {};
        // Passamos os dados necessários para a função reverseEntrega
        const reverseArgs = `'${entrega.id}', '${entrega.epi_id}', ${entrega.quantidade}, '${entrega.colaborador.replace(/'/g, "\\'")}'`;
        
        return `
            <div class="entrega-item">
                <div class="entrega-details">
                    <h4>Entrega para: ${entrega.colaborador}</h4>
                    <p><strong>EPI:</strong> ${epi.nome || 'EPI Removido'} (CA: ${epi.ca || 'N/A'})</p>
                    <p><strong>Quantidade:</strong> ${entrega.quantidade}</p>
                    <p><strong>Data:</strong> ${new Date(entrega.data_entrega).toLocaleDateString('pt-BR')}</p>
                    ${entrega.observacoes ? `<p><strong>Obs:</strong> ${entrega.observacoes}</p>` : ''}
                    <small>Registrado em: ${new Date(entrega.created_at).toLocaleString('pt-BR')}</small>
                </div>
                <div class="entrega-actions">
                    <button class="btn btn-danger btn-sm" 
                            onclick="reverseEntrega(${reverseArgs})">
                        <i class="fas fa-undo"></i> Reverter Entrega
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ====================================================================================
// FUNÇÕES DE ESTATÍSTICAS E RELATÓRIOS
// ====================================================================================

function updateStats() {
    // Atualiza contadores do dashboard
    const totalEPIsCount = document.getElementById('total-epis-count');
    const estoqueOkCount = document.getElementById('estoque-ok-count');
    const estoqueAtencaoCount = document.getElementById('estoque-atencao-count');
    const estoqueCriticoCount = document.getElementById('estoque-critico-count');
    
    if (!totalEPIsCount || !epis) return;
    
    totalEPIsCount.textContent = epis.length;
    
    let okCount = 0, atencaoCount = 0, criticoCount = 0;
    
    epis.forEach(epi => {
        const status = getEPIStatus(epi);
        if (status.class === 'status-ok') okCount++;
        else if (status.class === 'status-atencao') atencaoCount++;
        else if (status.class === 'status-critico') criticoCount++;
    });
    
    if (estoqueOkCount) estoqueOkCount.textContent = okCount;
    if (estoqueAtencaoCount) estoqueAtencaoCount.textContent = atencaoCount;
    if (estoqueCriticoCount) estoqueCriticoCount.textContent = criticoCount;
}

async function loadRelatorios() {
    const relatoriosContainer = document.getElementById('relatorios-container');
    if (!relatoriosContainer) return;
    
    relatoriosContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Gerando Relatórios...</div>';
    
    try {
        // Total de EPIs
        const { count: totalEPIs, error: epiCountError } = await supabase
            .from('epis')
            .select('*', { count: 'exact', head: true });

        if (epiCountError) throw epiCountError;

        // EPIs em estoque crítico (consulta direta)
        // Nota: A função supabase.sql() é para casos mais complexos. 
        // Para esta lógica, vamos usar um filtro mais simples, assumindo 
        // que o min_stock é o limite: .lte('estoque', 'minimo')
        // Embora o ideal seja usar RPC ou View para comparar duas colunas na mesma tabela.
        const criticos = epis.filter(e => e.estoque <= e.minimo || e.estoque === 0);
        const totalCriticos = criticos.length;

        // Total de entregas
        const { count: totalEntregas, error: entregasCountError } = await supabase
            .from('entregas')
            .select('*', { count: 'exact', head: true });
        
        if (entregasCountError) throw entregasCountError;

        // Soma das quantidades entregues
        const { data: allEntregas, error: allEntregasError } = await supabase
             .from('entregas')
             .select('quantidade');
        
        if (allEntregasError) throw allEntregasError;
        const totalUnidadesEntregues = allEntregas ? 
            allEntregas.reduce((sum, entrega) => sum + entrega.quantidade, 0) : 0;

        // Colaboradores únicos
        const { data: colaboradores, error: colaboradoresError } = await supabase
            .from('entregas')
            .select('colaborador');
        
        if (colaboradoresError) throw colaboradoresError;
        
        const colaboradoresUnicos = colaboradores ? 
            [...new Set(colaboradores.map(e => e.colaborador))] : [];
        const totalColaboradores = colaboradoresUnicos.length;

        // EPIs vencidos
        const hoje = new Date().toISOString().split('T')[0];
        const { data: vencidos, error: vencidosError } = await supabase
            .from('epis')
            .select('*')
            .lt('validade', hoje)
            .not('validade', 'is', null);

        if (vencidosError) throw vencidosError;
        const totalVencidos = vencidos ? vencidos.length : 0;
        
        // Atualiza contadores
        const colaboradoresCount = document.getElementById('colaboradores-count');
        const vencidosCount = document.getElementById('vencidos-count');
        
        if (colaboradoresCount) colaboradoresCount.textContent = totalColaboradores;
        if (vencidosCount) vencidosCount.textContent = totalVencidos;
        
        relatoriosContainer.innerHTML = `
            <div class="stats-grid" style="margin-top: 20px;">
                <div class="stat-card">
                    <i class="fas fa-cubes"></i>
                    <h3>${totalEPIs || 0}</h3>
                    <p>Tipos de EPIs Cadastrados</p>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #ef5350 0%, #c62828 100%);">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>${totalCriticos}</h3>
                    <p>EPIs em Estoque Crítico</p>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #66bb6a 0%, #2e7d32 100%);">
                    <i class="fas fa-handshake"></i>
                    <h3>${totalEntregas || 0}</h3>
                    <p>Registros de Entregas</p>
                </div>
                <div class="stat-card" style="background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%);">
                    <i class="fas fa-truck-loading"></i>
                    <h3>${totalUnidadesEntregues}</h3>
                    <p>Unidades Entregues no Total</p>
                </div>
            </div>
            
            <div class="card" style="border-left: 5px solid #667eea; margin-top: 30px;">
                <h4 style="color: #667eea; margin-bottom: 10px;">Resumo Executivo</h4>
                <p style="color: #333;">
                    O sistema gerencia <strong>${totalEPIs || 0} tipos de EPIs</strong>, com <strong>${totalColaboradores} colaboradores únicos</strong> que receberam um total de <strong>${totalUnidadesEntregues} unidades</strong> de EPIs em <strong>${totalEntregas || 0} registros</strong> de entrega. 
                    Atualmente, <strong>${totalCriticos} tipos de EPIs</strong> estão em estoque crítico e <strong>${totalVencidos}</strong> estão com a validade expirada.
                </p>
            </div>
        `;

    } catch (error) {
        console.error('Erro ao gerar relatórios:', error);
        relatoriosContainer.innerHTML = `
            <p class="error">Erro ao carregar relatórios: ${error.message}</p>
            <p style="color: #666; margin-top: 10px;">
                Dica: Verifique se as políticas RLS estão configuradas corretamente no Supabase.
            </p>
        `;
    }
}