// login.js - VERSÃO COMPLETAMENTE CORRIGIDA

// =========================================================================
// CONFIGURAÇÃO DO SUPABASE
// =========================================================================
const SUPABASE_URL = 'https://usojesvtabxybzbigpzn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb2plc3Z0YWJ4eWJ6YmlncHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjM0NTEsImV4cCI6MjA3Njg5OTQ1MX0.kaR3WyHGMgz-JBSZocRaxyB0OAcGOJWv2m2_Ac7BeTg';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

const REDIRECT_URL = 'dashboard.html';

// =========================================================================
// FUNÇÕES DE UI
// =========================================================================

function showMessage(message, type = 'error') {
    const messageArea = document.getElementById('message-area');
    messageArea.textContent = message;
    messageArea.className = `alert alert-${type}`;
    messageArea.style.display = 'block';
    
    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 5000);
}

function togglePassword(id) {
    const input = document.getElementById(id);
    const icon = document.getElementById(`toggle-${id}`);
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('message-area').style.display = 'none';
}

function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('forgotPasswordForm').style.display = 'none';
    document.getElementById('message-area').style.display = 'none';
}

function showForgot() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('forgotPasswordForm').style.display = 'block';
    document.getElementById('message-area').style.display = 'none';
}

// =========================================================================
// FUNÇÕES DE AUTENTICAÇÃO CORRIGIDAS
// =========================================================================

async function handleLogin(event) {
    event.preventDefault();
    
    const loginBtn = document.getElementById('login-btn');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showMessage('Por favor, preencha todos os campos.', 'error');
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            throw error;
        }

        if (data.session) {
            showMessage('Login realizado com sucesso!', 'success');
            setTimeout(() => {
                window.location.href = REDIRECT_URL;
            }, 1000);
        }

    } catch (error) {
        console.error('Erro login:', error);
        if (error.message.includes('Invalid login credentials')) {
            showMessage('E-mail ou senha incorretos.', 'error');
        } else {
            showMessage('Erro ao fazer login: ' + error.message, 'error');
        }
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
    }
}

async function handleSignup(event) {
    event.preventDefault();
    
    const signupBtn = document.getElementById('signup-btn');
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const name = document.getElementById('signup-name').value.trim();

    // Validações básicas
    if (!name || !email || !password || !confirmPassword) {
        showMessage('Por favor, preencha todos os campos.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('As senhas não coincidem.', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
        return;
    }

    signupBtn.disabled = true;
    signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';

    try {
        console.log('Tentando cadastrar:', email);
        
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        console.log('Resposta completa:', { data, error });

        if (error) {
            throw error;
        }

        // Sucesso no cadastro
        if (data.user) {
            showMessage('Cadastro realizado com sucesso! Você já pode fazer login.', 'success');
            setTimeout(() => {
                showLogin();
            }, 2000);
        }

    } catch (error) {
        console.error('Erro cadastro:', error);
        
        if (error.message.includes('already registered')) {
            showMessage('Este e-mail já está cadastrado. Tente fazer login.', 'error');
        } else if (error.status === 429) {
            showMessage('Muitas tentativas. Aguarde alguns minutos.', 'error');
        } else {
            showMessage('Erro no cadastro: ' + error.message, 'error');
        }
    } finally {
        signupBtn.disabled = false;
        signupBtn.innerHTML = '<i class="fas fa-user-plus"></i> Cadastrar';
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();
    
    const forgotBtn = document.getElementById('forgot-btn');
    const email = document.getElementById('forgot-email').value.trim();

    if (!email) {
        showMessage('Por favor, informe seu e-mail.', 'error');
        return;
    }

    // Verificar se não estamos em rate limit
    const lastAttempt = localStorage.getItem('lastRecoveryAttempt');
    if (lastAttempt) {
        const timeDiff = Date.now() - parseInt(lastAttempt);
        if (timeDiff < 300000) { // 5 minutos
            showMessage('Aguarde 5 minutos entre cada solicitação.', 'error');
            return;
        }
    }

    forgotBtn.disabled = true;
    forgotBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`
        });

        if (error) {
            throw error;
        }

        // Salvar timestamp da tentativa
        localStorage.setItem('lastRecoveryAttempt', Date.now().toString());
        
        showMessage('Link de recuperação enviado para: ' + email, 'success');
        showMessage('Verifique sua caixa de entrada e pasta de spam.', 'success');
        
        setTimeout(() => {
            showLogin();
        }, 5000);

    } catch (error) {
        console.error('Erro recuperação:', error);
        
        if (error.status === 429) {
            showMessage('Muitas tentativas. Aguarde 15 minutos.', 'error');
            localStorage.setItem('lastRecoveryAttempt', Date.now().toString());
        } else if (error.message.includes('not found')) {
            showMessage('E-mail não encontrado em nossa base.', 'error');
        } else {
            showMessage('Erro ao enviar e-mail: ' + error.message, 'error');
        }
    } finally {
        forgotBtn.disabled = false;
        forgotBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Link';
    }
}
// =========================================================================
// INICIALIZAÇÃO
// =========================================================================

document.addEventListener('DOMContentLoaded', function() {
    // Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            window.location.href = REDIRECT_URL;
        }
    });

    // Event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('forgotPasswordForm').addEventListener('submit', handleForgotPassword);

    console.log('Sistema de login inicializado!');
});