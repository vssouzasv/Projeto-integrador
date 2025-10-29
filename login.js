// login.js

// COLOQUE SUAS CHAVES AQUI
const SUPABASE_URL = 'https://wseqgrjuwsnnmbjkawvb.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzZXFncmp1d3Nubm1iamthd3ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMzAxOTMsImV4cCI6MjA3NjgwNjE5M30.2qAFsLNEsVgkdJq_4_9asbnu5CC80dzj8SFZ-6c8gV0'; 

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================================================================
// FUNÇÕES DE UI
// =========================================================================

function showMessage(message, type = 'error') {
    // ... (Implementação da função showMessage)
}

function togglePassword(id) {
    // ... (Implementação da função togglePassword)
}

function showLogin() {
    // ... (Implementação para mostrar o formulário de Login e esconder os outros)
}

function showSignup() {
    // ... (Implementação para mostrar o formulário de Cadastro e esconder os outros)
}

function showForgotPassword() {
    // ... (Implementação para mostrar o formulário de Recuperação e esconder os outros)
}


// =========================================================================
// FUNÇÕES DE AUTENTICAÇÃO (IMPLEMENTAÇÃO COMPLETA)
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Ouvinte para o formulário de Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // 2. Ouvinte para o formulário de Cadastro
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    
    // 3. Ouvinte para o formulário de Recuperação
    document.getElementById('forgotPasswordForm').addEventListener('submit', handleForgotPassword);
    
    // Verifica se já está logado
    checkSession(); 
});


async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        // Redireciona para a página principal se já estiver logado
        window.location.href = 'index.html'; 
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        showMessage('Erro no login: ' + error.message, 'error');
    } else if (data.user) {
        showMessage('Login realizado com sucesso!', 'success');
        // Redireciona após login
        window.location.href = 'index.html'; 
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'URL_DA_SUA_PAGINA_DE_RESET', // Ex: 'http://localhost:5500/reset-password.html'
    });
    
    if (error) {
        showMessage('Erro: ' + error.message, 'error');
    } else {
        showMessage('Link de redefinição de senha enviado para seu e-mail!', 'success');
    }
}