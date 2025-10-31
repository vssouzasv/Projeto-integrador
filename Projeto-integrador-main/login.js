// login.js

// =========================================================================
// CONFIGURAÇÃO DO SUPABASE
// =========================================================================
// COLOQUE SUAS CHAVES CORRETAS AQUI
const SUPABASE_URL = 'https://usojesvtabxybzbigpzn.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb2plc3Z0YWJ4eWJ6YmlncHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjM0NTEsImV4cCI6MjA3Njg5OTQ1MX0.kaR3WyHGMgz-JBSZocRaxyB0OAcGOJWv2m2_Ac7BeTg'; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// URL para onde o usuário será redirecionado após o login/cadastro
const REDIRECT_URL = 'dashboard.html';

// =========================================================================
// FUNÇÕES DE UI
// =========================================================================

function showMessage(message, type = 'error') {
    const messageArea = document.getElementById('message-area');
    messageArea.textContent = message;
    messageArea.className = `alert alert-${type}`; // Assume que as classes CSS para alertas estão em login-styles.css
    messageArea.style.display = 'block';
    // Esconde a mensagem após 5 segundos
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
// FUNÇÕES DE AUTENTICAÇÃO
// =========================================================================

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        // Códigos de erro comuns: invalid_credentials
        showMessage('Erro no login: ' + (error.message.includes('Invalid login credentials') ? 'E-mail ou senha inválidos.' : error.message), 'error');
    } else if (data.session) {
        showMessage('Login realizado com sucesso!', 'success');
        window.location.href = REDIRECT_URL;
    }
}

async function handleSignup(event) {
    event.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const name = document.getElementById('signup-name').value;
    
    if (password !== confirmPassword) {
        showMessage('As senhas não coincidem.', 'error');
        return;
    }

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { 
                full_name: name 
            }
        }
    });

    if (error) {
        showMessage('Erro no cadastro: ' + error.message, 'error');
    } else if (data.user) {
        // Supabase geralmente requer confirmação por e-mail, exceto se desativado no console
        showMessage('Cadastro realizado! Verifique seu e-mail para confirmar a conta.', 'success');
        showLogin();
    } else if (data.session === null) {
         showMessage('Cadastro realizado! Verifique seu e-mail para confirmar a conta.', 'success');
         showLogin();
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();
    const email = document.getElementById('forgot-email').value;
    
    // Nota: A URL de redirecionamento deve ser configurada no Supabase -> Auth -> Settings
    // E deve apontar para uma página onde o usuário pode redefinir a senha (ex: reset-password.html)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password.html', // Usando URL base + uma página de reset
    });
    
    if (error) {
        showMessage('Erro ao solicitar redefinição: ' + error.message, 'error');
    } else {
        showMessage('Link de redefinição enviado para ' + email + '. Verifique sua caixa de entrada.', 'success');
        // Opcional: Voltar para login após o envio
        setTimeout(showLogin, 5000);
    }
}


// =========================================================================
// INICIALIZAÇÃO
// =========================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar se o usuário já está logado
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // Se houver uma sessão ativa, redireciona para o dashboard
        window.location.href = REDIRECT_URL;
        return;
    }

    // 2. Definir Event Listeners dos Formulários
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('forgotPasswordForm').addEventListener('submit', handleForgotPassword);
});