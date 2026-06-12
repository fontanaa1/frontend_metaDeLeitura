const API_URL = 'https://backend-leitura.vercel.app';
console.log('🚀 API configurada para:', API_URL);

// ==========================================
// CAPTURA E UNIFICAÇÃO DO USUÁRIO LOGADO
// ==========================================
let currentUserData = null;
let currentUser = null;

try {
    const s1 = localStorage.getItem('usuarioLogado');
    const s2 = localStorage.getItem('currentUserData');
    const s3 = localStorage.getItem('currentUser');

    if (s1 && s1.startsWith('{')) currentUserData = JSON.parse(s1);
    else if (s2 && s2.startsWith('{')) currentUserData = JSON.parse(s2);
    else if (s3 && s3.startsWith('{')) currentUserData = JSON.parse(s3);

    if (currentUserData) {
        currentUser = currentUserData.rm || currentUserData.RM || null;
    } else if (s3 && !s3.startsWith('{')) {
        currentUser = s3;
        currentUserData = { rm: s3, nome: 'Estudante', turma: 'Não informada' };
    }

    if (currentUserData && currentUser) {
        localStorage.setItem('currentUser', currentUser);
        localStorage.setItem('currentUserData', JSON.stringify(currentUserData));
        localStorage.setItem('usuarioLogado', JSON.stringify(currentUserData));
    }
} catch (e) {
    console.error('Erro ao ler ou sincronizar dados do usuário:', e);
}

// ==========================================
// VERIFICAÇÃO DE SEGURANÇA DE ROTA
// ==========================================
const paginaAtual = window.location.pathname.split('/').pop();
const isLoginPage = paginaAtual === 'index.html' || paginaAtual === '' || window.location.pathname.endsWith('/');

if (!currentUser && !isLoginPage) {
    console.warn("🔒 Usuário não identificado. Redirecionando para index.html...");
    window.location.href = 'index.html';
} else if (currentUser && isLoginPage) {
    window.location.href = 'dashboard.html';
}

let weeklyChart = null;

// ==========================================
// MAPEAMENTO DOM SEGURO
// ==========================================
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');

const loginRm = document.getElementById('loginRm');
const doLoginBtn = document.getElementById('doLoginBtn');
const doRegisterBtn = document.getElementById('doRegisterBtn');
const regNome = document.getElementById('regNome');
const regRm = document.getElementById('regRm');
const regTurma = document.getElementById('regTurma');
const authError = document.getElementById('authError');

// Captura dos elementos do HTML ajustados
const dashboardUserName = document.getElementById('dashboardUserName');
const sidebarUserName = document.getElementById('sidebarUserName'); 
const dashboardUserClass = document.getElementById('dashboardUserClass');
const dashboardLogoutBtn = document.getElementById('dashboardLogoutBtn');

const registerMinutes = document.getElementById('registerMinutes') || document.getElementById('time-slider');
const submitReadingBtn = document.getElementById('submitReadingBtn') || document.getElementById('btn-submit-leitura');
const todayMin = document.getElementById('todayMin');
const remainingToday = document.getElementById('remainingToday');
const dailyBar = document.getElementById('dailyBar');
const readingAlert = document.getElementById('readingAlert');

const schoolTotal = document.getElementById('schoolTotal');
const schoolBar = document.getElementById('schoolBar');
const schoolPercent = document.getElementById('schoolPercent');

const totalWeek = document.getElementById('totalWeek');
const bestDay = document.getElementById('bestDay');

const perfilNome = document.getElementById('perfilNome');
const perfilRm = document.getElementById('perfilRm');
const perfilTurma = document.getElementById('perfilTurma');
const perfilTotal = document.getElementById('perfilTotal');
const perfilSince = document.getElementById('perfilSince');
const rankingContainer = document.getElementById('rankingContainer');

// ==========================================
// ATUALIZAÇÃO DOS CAMPOS DE TEXTO (Injeção Dinâmica)
// ==========================================
function atualizarCamposUsuario() {
    if (currentUserData) {
        console.log('👤 Aplicando nome do usuário na tela:', currentUserData.nome);
        
        // Altera o texto de "Carregando..." para o nome real do estudante nos dois elementos
        if (dashboardUserName) dashboardUserName.textContent = currentUserData.nome;
        if (sidebarUserName) sidebarUserName.textContent = currentUserData.nome;
        
        if (dashboardUserClass) dashboardUserClass.textContent = `Turma ${currentUserData.turma}`;
        if (perfilNome) perfilNome.textContent = currentUserData.nome;
        if (perfilRm) perfilRm.textContent = currentUserData.RM || currentUserData.rm;
        if (perfilTurma) perfilTurma.textContent = currentUserData.turma;
        if (perfilSince) perfilSince.textContent = currentUserData.created_at ? new Date(currentUserData.created_at).toLocaleDateString('pt-BR') : 'Recente';
    } else {
        console.warn('⚠️ Nenhum dado de usuário encontrado para exibir.');
    }
}

// ==========================================
// FUNÇÕES DE REQUISIÇÃO API
// ==========================================
async function apiRequest(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_URL}/api${cleanEndpoint}?rm=${currentUser || ''}`;
    
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'rm': currentUser || '',
            ...(options.headers || {})
        }
    });
    
    const contentType = response.headers.get("content-type");
    if (!contentType || contentType.indexOf("application/json") === -1) {
        throw new Error("Resposta inválida (HTML) retornada pelo servidor.");
    }
    
    const data = await response.json();
    return { response, data };
}

function mostrarAuthError(msg) {
    if (authError) {
        authError.classList.remove('hidden');
        authError.textContent = msg;
    } else {
        alert(msg);
    }
}

function mostrarAlerta(msg, tipo) {
    if (readingAlert) {
        readingAlert.classList.remove('hidden');
        readingAlert.className = `mt-4 p-3 rounded-xl text-sm ${
            tipo === 'success' ? 'bg-green-500/20 text-green-300' : 
            tipo === 'info' ? 'bg-blue-500/20 text-blue-300' : 'bg-red-500/20 text-red-300'
        }`;
        readingAlert.innerHTML = msg;
        setTimeout(() => readingAlert.classList.add('hidden'), 5000);
    } else {
        alert(msg);
    }
}

// ==========================================
// EVENTOS E AUTENTICAÇÃO
// ==========================================
if (tabLoginBtn && tabRegisterBtn) {
    tabLoginBtn.addEventListener('click', () => {
        tabLoginBtn.classList.add('active', 'border-b-2', 'border-brand-600', 'text-brand-600');
        tabRegisterBtn.classList.remove('active', 'border-b-2', 'border-brand-600', 'text-brand-600');
        if (loginForm) loginForm.classList.remove('hidden');
        if (registerForm) registerForm.classList.add('hidden');
    });
    tabRegisterBtn.addEventListener('click', () => {
        tabRegisterBtn.classList.add('active', 'border-b-2', 'border-brand-600', 'text-brand-600');
        tabLoginBtn.classList.remove('active', 'border-b-2', 'border-brand-600', 'text-brand-600');
        if (registerForm) registerForm.classList.remove('hidden');
        if (loginForm) loginForm.classList.add('hidden');
    });
}

if (doLoginBtn) {
    doLoginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const rm = loginRm?.value.trim();
        if (!rm) return mostrarAuthError('Por favor, introduza o seu RM.');
        await processarAutenticacao({ rm });
    });
}

if (doRegisterBtn) {
    doRegisterBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const nome = regNome?.value.trim();
        const rm = regRm?.value.trim();
        const turma = regTurma?.value;
        if (!nome || !rm || !turma) return mostrarAuthError('Por favor, preencha todos os campos.');
        await processarAutenticacao({ rm, nome, turma });
    });
}

async function processarAutenticacao(dadosAuth) {
    try {
        const response = await fetch(`${API_URL}/api/auth/login-ou-cadastro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosAuth)
        });
        const dados = await response.json();
        if (response.ok && dados.success) {
            currentUser = dados.aluno.RM || dados.aluno.rm; 
            currentUserData = dados.aluno;
            localStorage.setItem('currentUser', currentUser);
            localStorage.setItem('currentUserData', JSON.stringify(dados.aluno));
            localStorage.setItem('usuarioLogado', JSON.stringify(dados.aluno));
            window.location.href = 'dashboard.html'; 
        } else {
            mostrarAuthError(`❌ ${dados.error || 'Erro ao fazer login.'}`);
        }
    } catch (erro) {
        mostrarAuthError('❌ Erro de processamento interno ou de rede.');
    }
}

if (dashboardLogoutBtn) {
    dashboardLogoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        localStorage.removeItem('currentUserData');
        localStorage.removeItem('usuarioLogado');
        window.location.href = 'index.html';
    });
}

// ==========================================
// LEITURA DIÁRIA E CARREGAMENTO DE DADOS
// ==========================================
if (submitReadingBtn) {
    submitReadingBtn.onclick = async (e) => {
        e.preventDefault();
        // ... dentro da função que envia os minutos lidos no script.js ...

const minutosDigitados = parseInt(registerMinutes.value, 10);

// Certifique-se de que a chave do JSON seja "minutos" e não "minutosLidos"
const dadosParaEnviar = {
    minutos: minutosDigitados 
};

try {
    const response = await fetch(`${API_URL}/leitura/registrar`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'rm': currentUser // O backend precisa do RM aqui nos headers para te identificar!
        },
        body: JSON.stringify(dadosParaEnviar)
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Erro ao registrar leitura');
    }

    alert('Leitura registrada com sucesso!');
    window.location.href = 'dashboard.html';

} catch (erro) {
    console.error('Erro no registro:', erro);
    alert(`Não foi possível salvar: ${erro.message}`);
}
    };
}

async function carregarTodosDados() {
    atualizarCamposUsuario(); 
    await carregarTermometro();
    await carregarRanking();
    if (currentUser) {
        await carregarProgressoUsuario();
        await carregarLimiteDiario();
    }
}

async function carregarProgressoUsuario() {
    const canvas = document.getElementById('weeklyProgressChart');
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
        const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = () => carregarProgressoUsuario(); document.head.appendChild(script); return;
    }
    try {
        const { response, data } = await apiRequest('/leitura/progresso');
        if (!response.ok || !data.progresso) return;
        const registros = data.progresso; const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        const minutosPorDia = new Array(7).fill(0); let totalSemana = 0;
        registros.forEach(r => {
            const dia = new Date(r.data_registro + 'T00:00:00').getDay();
            minutosPorDia[dia] += r.minutos; totalSemana += r.minutos;
        });
        if (totalWeek) totalWeek.textContent = totalSemana;
        if (bestDay) bestDay.textContent = `${Math.max(...minutosPorDia, 0)} min`;
        if (perfilTotal) perfilTotal.textContent = registros.reduce((s, r) => s + r.minutos, 0);
        if (weeklyChart) weeklyChart.destroy();
        weeklyChart = new Chart(canvas.getContext('2d'), {
            type: 'line', data: { labels: diasSemana, datasets: [{ label: 'Minutos Lidos', data: minutosPorDia, borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderWidth: 2.5, fill: true, tension: 0.3 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
    } catch (e) { console.error(e); }
}

async function carregarTermometro() {
    try {
        const r = await fetch(`${API_URL}/api/leitura/termometro`); if (!r.ok) return;
        const d = await r.json(); const total = d.total_escola || 0; const percent = (total / 1000000) * 100;
        if (schoolTotal) schoolTotal.textContent = total.toLocaleString('pt-BR');
        if (schoolBar) schoolBar.style.width = `${Math.min(percent, 100)}%`;
        if (schoolPercent) schoolPercent.textContent = percent.toFixed(2);
    } catch (e) { console.error(e); }
}

async function carregarRanking() {
    if (!rankingContainer) return;
    try {
        const r = await fetch(`${API_URL}/api/leitura/ranking`); if (!r.ok) return;
        const d = await r.json();
        if (Array.isArray(d) && d.length > 0) {
            rankingContainer.innerHTML = d.map((item, idx) => `
                <div class="flex items-center justify-between p-3.5 bg-white border border-ink-100 rounded-xl mb-2 shadow-soft">
                    <div class="flex items-center gap-3">
                        <span class="w-7 h-7 rounded-lg grid place-items-center text-sm font-bold ${idx === 0 ? 'bg-amber-500/10 text-amber-600' : idx === 1 ? 'bg-slate-400/10 text-slate-500' : idx === 2 ? 'bg-amber-700/10 text-amber-800' : 'bg-ink-50 text-ink-500'}">${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}</span>
                        <span class="font-semibold text-ink-900">Turma ${item.turma}</span>
                    </div>
                    <div class="text-right"><span class="text-base font-bold text-brand-600">${item.total}</span><span class="text-[11px] text-ink-400 ml-0.5">min hoje</span></div>
                </div>`).join('');
        }
    } catch (e) { console.error(e); }
}

async function carregarLimiteDiario() {
    try {
        const { response, data } = await apiRequest('/leitura/progresso');
        if (!response.ok || !data.progresso) return;
        const hoje = new Date().toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).split(" ")[0];
        const minutosHoje = data.progresso.filter(r => r.data_registro === hoje).reduce((s, r) => s + r.minutos, 0);
        const restante = Math.max(0, 16 - minutosHoje);
        if (todayMin) todayMin.textContent = minutesHoje;
        if (remainingToday) remainingToday.textContent = restante;
        if (dailyBar) dailyBar.style.width = `${(minutosHoje / 16) * 100}%`;
        if (registerMinutes) {
            registerMinutes.max = restante;
            if (registerMinutes.tagName === 'INPUT' && registerMinutes.type !== 'range') registerMinutes.placeholder = restante > 0 ? `Máximo ${restante} min` : 'Limite atingido';
            const limiteAtingido = (restante === 0); registerMinutes.disabled = limiteAtingido;
            if (submitReadingBtn) { submitReadingBtn.disabled = limiteAtingido; submitReadingBtn.style.opacity = limiteAtingido ? '0.4' : '1'; submitReadingBtn.style.cursor = limiteAtingido ? 'not-allowed' : 'pointer'; }
        }
    } catch (e) { console.error(e); }
}

window.addEventListener('DOMContentLoaded', () => {
    carregarTodosDados();
});