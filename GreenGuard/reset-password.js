// reset-password.js
const SUPABASE_URL = 'https://usojesvtabxybzbigpzn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzb2plc3Z0YWJ4eWJ6YmlncHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMjM0NTEsImV4cCI6MjA3Njg5OTQ1MX0.kaR3WyHGMgz-JBSZocRaxyB0OAcGOJWv2m2_Ac7BeTg';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

async function handleResetPassword(event) {
    event.preventDefault();
    
    const resetBtn = document.getElementById('reset-btn');
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (!newPassword || !confirmPassword) {
        showMessage('Por favor, preencha todos os campos.', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showMessage('As senhas não coincidem.', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showMessage('A senha deve ter pelo menos 6 caracteres.', 'error');
        return;
    }

    resetBtn.disabled = true;
    resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Redefinindo...';

    try {
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) {
            throw error;
        }

        showMessage('Senha redefinida com sucesso! Redirecionando para o login...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        console.error('Erro reset password:', error);
        
        if (error.message.includes('session')) {
            showMessage('Link expirado ou inválido. Solicite um novo link de recuperação.', 'error');
        } else {
            showMessage('Erro ao redefinir senha: ' + error.message, 'error');
        }
    } finally {
        resetBtn.disabled = false;
        resetBtn.innerHTML = '<i class="fas fa-save"></i> Redefinir Senha';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('resetPasswordForm').addEventListener('submit', handleResetPassword);
});