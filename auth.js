// Funções de Autenticação com Supabase

// Estado global do usuário
let currentUser = null;

// Elementos DOM
let authModal, loginBtn, logoutBtn, userInfo, userEmail;
let loginTab, registerTab, loginForm, registerForm;
let loginFormElement, registerFormElement;
let authClose, authInfo, authInfoLoginBtn, mainContent;

// Inicializar elementos DOM quando o documento estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    initAuthElements();
    setupAuthEventListeners();
    checkAuthState();
});

// Inicializar elementos DOM
function initAuthElements() {
    authModal = document.getElementById('authModal');
    loginBtn = document.getElementById('loginBtn');
    logoutBtn = document.getElementById('logoutBtn');
    userInfo = document.getElementById('userInfo');
    userEmail = document.getElementById('userEmail');
    
    loginTab = document.getElementById('loginTab');
    registerTab = document.getElementById('registerTab');
    loginForm = document.getElementById('loginForm');
    registerForm = document.getElementById('registerForm');
    
    loginFormElement = document.getElementById('loginFormElement');
    registerFormElement = document.getElementById('registerFormElement');
    authClose = document.querySelector('.auth-close');
    authInfo = document.getElementById('authInfo');
    authInfoLoginBtn = document.getElementById('authInfoLoginBtn');
    mainContent = document.querySelector('.main-content');
}

// Configurar event listeners
function setupAuthEventListeners() {
    if (loginBtn) loginBtn.addEventListener('click', openAuthModal);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (authClose) authClose.addEventListener('click', closeAuthModal);
    if (authInfoLoginBtn) authInfoLoginBtn.addEventListener('click', openAuthModal);
    
    if (loginTab) loginTab.addEventListener('click', () => switchAuthTab('login'));
    if (registerTab) registerTab.addEventListener('click', () => switchAuthTab('register'));
    
    if (loginFormElement) loginFormElement.addEventListener('submit', handleLogin);
    if (registerFormElement) registerFormElement.addEventListener('submit', handleRegister);
    
    // Fechar modal clicando fora dele
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                closeAuthModal();
            }
        });
    }
}

// Verificar estado de autenticação
async function checkAuthState() {
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        
        if (session) {
            currentUser = session.user;
            updateUIForLoggedInUser();
        } else {
            updateUIForLoggedOutUser();
        }
    } catch (error) {
        console.error('Erro ao verificar estado de autenticação:', error);
        updateUIForLoggedOutUser();
    }
}

// Abrir modal de autenticação
function openAuthModal() {
    authModal.style.display = 'block';
    switchAuthTab('login');
}

// Fechar modal de autenticação
function closeAuthModal() {
    authModal.style.display = 'none';
    clearAuthForms();
}

// Alternar entre tabs de login e registro
function switchAuthTab(tab) {
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    }
    clearAuthForms();
}

// Limpar formulários
function clearAuthForms() {
    loginFormElement.reset();
    registerFormElement.reset();
}

// Fazer login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const { data, error } = await window.supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        updateUIForLoggedInUser();
        closeAuthModal();
        showNotification('Login realizado com sucesso!', 'success');
        
        // Recarregar dados do usuário
        await loadData();
        
    } catch (error) {
        console.error('Erro no login:', error);
        showNotification(getAuthErrorMessage(error.message), 'error');
    }
}

// Registrar novo usuário
async function handleRegister(event) {
    event.preventDefault();
    
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validar senhas
    if (password !== confirmPassword) {
        showNotification('As senhas não coincidem!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('A senha deve ter pelo menos 6 caracteres!', 'error');
        return;
    }
    
    try {
        const { data, error } = await window.supabaseClient.auth.signUp({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        if (data.user && !data.session) {
            showNotification('Verifique seu e-mail para confirmar a conta!', 'info');
        } else {
            currentUser = data.user;
            updateUIForLoggedInUser();
            closeAuthModal();
            showNotification('Conta criada com sucesso!', 'success');
            await loadData();
        }
        
    } catch (error) {
        console.error('Erro no registro:', error);
        showNotification(getAuthErrorMessage(error.message), 'error');
    }
}

// Fazer logout
async function handleLogout() {
    try {
        const { error } = await window.supabaseClient.auth.signOut();
        
        if (error) throw error;
        
        currentUser = null;
        updateUIForLoggedOutUser();
        showNotification('Logout realizado com sucesso!', 'success');
        
        // Limpar dados locais
        pendingGames = [];
        activeMultiples = [];
        historyMultiples = [];
        selectedGames = [];
        updateDisplay();
        
    } catch (error) {
        console.error('Erro no logout:', error);
        showNotification('Erro ao fazer logout!', 'error');
    }
}

// Atualizar UI para usuário logado
function updateUIForLoggedInUser() {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userInfo) userInfo.style.display = 'flex';
    if (userEmail && currentUser) userEmail.textContent = currentUser.email;
    if (authInfo) authInfo.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
}

// Atualizar UI para usuário não logado
function updateUIForLoggedOutUser() {
    if (loginBtn) loginBtn.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
    if (userEmail) userEmail.textContent = '';
    if (authInfo) authInfo.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
}

// Obter mensagem de erro amigável
function getAuthErrorMessage(errorMessage) {
    const errorMessages = {
        'Invalid login credentials': 'E-mail ou senha incorretos!',
        'Email not confirmed': 'E-mail não confirmado. Verifique sua caixa de entrada.',
        'User already registered': 'Este e-mail já está cadastrado!',
        'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres!',
        'Invalid email': 'E-mail inválido!',
        'Signup disabled': 'Cadastro desabilitado temporariamente.',
        'Email rate limit exceeded': 'Muitas tentativas. Tente novamente em alguns minutos.'
    };
    
    return errorMessages[errorMessage] || 'Erro de autenticação. Tente novamente.';
}

// Verificar se usuário está logado
function isUserLoggedIn() {
    return currentUser !== null;
}

// Obter usuário atual
function getCurrentUser() {
    return currentUser;
}

// Listener para mudanças de autenticação
window.supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        currentUser = session.user;
        updateUIForLoggedInUser();
    } else if (event === 'SIGNED_OUT') {
        currentUser = null;
        updateUIForLoggedOutUser();
    }
});