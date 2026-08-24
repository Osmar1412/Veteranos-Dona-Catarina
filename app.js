// Banco de Dados Padrão (Carregado se o LocalStorage estiver vazio)
const defaultPlayers = [
    { id: 1, name: "Marcos Goleiro", number: 1, position: "goleiro" },
    { id: 2, name: "Cláudio", number: 12, position: "goleiro" },
    { id: 3, name: "Dinei", number: 3, position: "defesa" },
    { id: 4, name: "Adilson (Capitão)", number: 4, position: "defesa" },
    { id: 5, name: "Zinho", number: 2, position: "defesa" },
    { id: 6, name: "Chico", number: 6, position: "defesa" },
    { id: 7, name: "Mário", number: 5, position: "meio-campo" },
    { id: 8, name: "Valdir", number: 8, position: "meio-campo" },
    { id: 9, name: "Carlinhos", number: 10, position: "meio-campo" },
    { id: 10, name: "Tico", number: 7, position: "meio-campo" },
    { id: 11, name: "Osmar", number: 9, position: "ataque" },
    { id: 12, name: "Roberto", number: 11, position: "ataque" },
    { id: 13, name: "Neco", number: 18, position: "ataque" }
];

const defaultMatches = [
    {
        id: 1,
        opponent: "Granja Selecta F.C.",
        date: "16/08/2026",
        time: "09:30",
        location: "Campo da Cerim (Nosso Campo)",
        isHome: true,
        played: true,
        homeScore: 4,
        awayScore: 1
    },
    {
        id: 2,
        opponent: "São João F.C. (Capela do Alto)",
        date: "23/08/2026",
        time: "10:00",
        location: "Campo Municipal de São Roque",
        isHome: false,
        played: false,
        homeScore: 0,
        awayScore: 0
    },
    {
        id: 3,
        opponent: "Amigos do Bairro Cerim",
        date: "30/08/2026",
        time: "09:30",
        location: "Campo da Cerim (Nosso Campo)",
        isHome: true,
        played: false,
        homeScore: 0,
        awayScore: 0
    },
    {
        id: 4,
        opponent: "Veteranos de Mairinque",
        date: "06/09/2026",
        time: "09:30",
        location: "Campo da Cerim (Nosso Campo)",
        isHome: true,
        played: false,
        homeScore: 0,
        awayScore: 0
    },
    {
        id: 5,
        opponent: "Vila São José F.C.",
        date: "04/10/2026",
        time: "09:30",
        location: "Campo da Cerim (Nosso Campo)",
        isHome: true,
        played: false,
        homeScore: 0,
        awayScore: 0
    }
];

// Inicialização do Estado
let players = JSON.parse(localStorage.getItem('vet_dona_catarina_players')) || defaultPlayers;
let matches = JSON.parse(localStorage.getItem('vet_dona_catarina_matches')) || defaultMatches;
let isAdminAuthenticated = sessionStorage.getItem('vet_dona_catarina_admin') === 'true';
let editingPlayerId = null;
let editingMatchId = null; // Variável de controle para edição de partidas
let coachName = localStorage.getItem('vet_dona_catarina_coach') || "A definir";
let currentPlayerPhotoBase64 = "";
let currentCoachPhotoBase64 = "";

// Helper para obter dados formatados da Comissão Técnica (retrocompatível com strings simples)
function getCoachData() {
    let data = { name: "A definir", photo: "" };
    try {
        const parsed = JSON.parse(coachName);
        if (parsed && typeof parsed === 'object' && parsed.name) {
            data = parsed;
        } else {
            data.name = coachName;
        }
    } catch (e) {
        data.name = coachName;
    }
    return data;
}

// Migração de dados legados do LocalStorage (garante compatibilidade)
let needsSave = false;
matches = matches.map(match => {
    if (match.played === undefined) {
        needsSave = true;
        // Jogo 1 vira "Jogado" (Granja Selecta) e os demais continuam "Agendados"
        match.played = (match.id === 1 || match.opponent.toLowerCase().includes("granja selecta"));
        if (match.played) {
            match.opponent = "Granja Selecta F.C.";
            match.homeScore = 3;
            match.awayScore = 2;
        } else {
            match.homeScore = 0;
            match.awayScore = 0;
        }
    }
    return match;
});
if (needsSave) {
    localStorage.setItem('vet_dona_catarina_matches', JSON.stringify(matches));
}

// ==========================================================================
// CONFIGURAÇÃO DO FIREBASE (NUVEM)
// ==========================================================================
// O usuário deve colar suas chaves do Firebase aqui para ativar a sincronização em nuvem.
const firebaseConfig = {
    apiKey: "AIzaSyDogILsqobZ2vdtKBEB5N05RvXrd-fZFso",
    authDomain: "veteranos-dona-catarina.firebaseapp.com",
    databaseURL: "https://veteranos-dona-catarina-default-rtdb.firebaseio.com",
    projectId: "veteranos-dona-catarina",
    storageBucket: "veteranos-dona-catarina.firebasestorage.app",
    messagingSenderId: "334749241707",
    appId: "1:334749241707:web:b9b9a05d86a4a4ae69fc2e",
    measurementId: "G-1VQJD0WRMS"
};

// Inicializar Firebase
let db = null;
let useFirebase = false;

if (typeof firebase !== 'undefined' && firebaseConfig && firebaseConfig.databaseURL) {
    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        useFirebase = true;
        console.log("Firebase conectado e pronto para sincronizar em nuvem!");
    } catch (e) {
        console.error("Erro ao inicializar o Firebase:", e);
    }
}

// Redimensiona e comprime uma foto usando Canvas para converter em Base64 leve (JPEG, qualidade 0.7, 150x150px)
function compressAndResizePhoto(file, callback) {
    if (!file) {
        callback("");
        return;
    }
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const max_size = 150;
            let width = img.width;
            let height = img.height;

            // Cortar quadrado perfeito no centro
            const size = Math.min(width, height);
            canvas.width = max_size;
            canvas.height = max_size;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                img,
                (width - size) / 2,
                (height - size) / 2,
                size,
                size,
                0,
                0,
                max_size,
                max_size
            );

            // Converter para JPEG compactado a 70% (fica entre 5 KB e 15 KB)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            callback(dataUrl);
        };
        img.onerror = function() {
            callback("");
        };
        img.src = e.target.result;
    };
    reader.onerror = function() {
        callback("");
    };
    reader.readAsDataURL(file);
}

// Salvar dados no LocalStorage e no Firebase
function savePlayers() {
    localStorage.setItem('vet_dona_catarina_players', JSON.stringify(players));
    if (useFirebase && db) {
        db.ref('players').set(players);
    }
}

function saveMatches() {
    localStorage.setItem('vet_dona_catarina_matches', JSON.stringify(matches));
    if (useFirebase && db) {
        db.ref('matches').set(matches);
    }
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initMobileMenu();
    initContactForm();
    initAdminForm();
    checkAdminAuthState();

    if (useFirebase && db) {
        // Escutar elenco em tempo real
        db.ref('players').on('value', (snapshot) => {
            const val = snapshot.val();
            if (val) {
                players = val;
            } else {
                // Banco vazio, popular com dados padrão
                players = defaultPlayers;
                db.ref('players').set(defaultPlayers);
            }
            renderSquad('todos');
            renderAdminPlayersTable();
        });

        // Escutar partidas em tempo real
        db.ref('matches').on('value', (snapshot) => {
            const val = snapshot.val();
            if (val) {
                matches = val;
            } else {
                // Banco vazio, popular com dados padrão
                matches = defaultMatches;
                db.ref('matches').set(defaultMatches);
            }
            renderMatches();
            renderHistory();
            renderScoreboard();
            renderAdminMatchesTable();
        });

        // Escutar treinador em tempo real
        db.ref('coach').on('value', (snapshot) => {
            const val = snapshot.val();
            if (val) {
                coachName = val;
            } else {
                coachName = "A definir";
                db.ref('coach').set("A definir");
            }
            renderSquad('todos');
            const coachInput = document.getElementById('coach-name-input');
            if (coachInput) {
                const coachData = getCoachData();
                coachInput.value = coachData.name === "A definir" ? "" : coachData.name;
                const coachPhotoPreview = document.getElementById('coach-photo-preview');
                if (coachData.photo && coachPhotoPreview) {
                    currentCoachPhotoBase64 = coachData.photo;
                    coachPhotoPreview.innerHTML = `<img src="${coachData.photo}" alt="Preview">`;
                }
            }
        });
    } else {
        // Fallback local caso Firebase não esteja configurado
        renderSquad('todos');
        renderMatches();
        renderScoreboard();
        renderHistory();
    }
});

/* ==========================================================================
   NAVEGAÇÃO E INTERFACE (TABS)
   ========================================================================== */

function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn, .footer-nav a[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = btn.getAttribute('data-tab');
            
            // Fechar menu mobile se estiver aberto
            const nav = document.querySelector('nav');
            if (nav.classList.contains('show')) {
                nav.classList.remove('show');
            }

            // Ativar botões da barra de navegação correspondentes
            navButtons.forEach(b => {
                if (b.getAttribute('data-tab') === targetTab) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });

            // Ativar aba correspondente
            tabContents.forEach(tab => {
                if (tab.id === targetTab) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });

            // Rolar suavemente para o topo
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');

    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('show');
    });
}

/* ==========================================================================
   ELENCO DE JOGADORES (SQUAD)
   ========================================================================== */

function renderSquad(filter = 'todos') {
    const squadGrid = document.getElementById('squad-grid');
    if (!squadGrid) return;

    squadGrid.innerHTML = '';

    // Renderizar Treinador (Comissão Técnica) no topo se o filtro for 'todos'
    if (filter === 'todos') {
        const coachData = getCoachData();
        const coachCard = document.createElement('div');
        coachCard.className = 'player-card coach-card';
        coachCard.style.borderLeft = '4px solid var(--color-gold)';
        
        const photoHtml = coachData.photo 
            ? `<img src="${coachData.photo}" class="player-photo" alt="${coachData.name}">`
            : `<svg class="player-avatar-svg" viewBox="0 0 24 24" style="fill: var(--color-gold)">
                   <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
               </svg>`;
        
        coachCard.innerHTML = `
            <div class="player-number" style="color: rgba(241, 196, 15, 0.15)">📋</div>
            <div class="player-photo-container" style="border-color: var(--color-gold)">
                ${photoHtml}
            </div>
            <div class="player-info">
                <h3 class="player-name">${coachData.name}</h3>
                <span class="player-position" style="color: var(--color-gold)">Treinador</span>
                <div>
                    <span class="player-jersey-number" style="background: rgba(241, 196, 15, 0.1); color: var(--color-gold)">Comissão Técnica</span>
                </div>
            </div>
        `;
        squadGrid.appendChild(coachCard);
    }

    const filteredPlayers = filter === 'todos' 
        ? players 
        : players.filter(p => p.position === filter);

    if (filteredPlayers.length === 0) {
        if (filter !== 'todos') {
            squadGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #a0aec0;">
                    <p>Nenhum jogador cadastrado nesta posição.</p>
                </div>
            `;
        }
        return;
    }

    // Ordenar por número da camisa
    filteredPlayers.sort((a, b) => a.number - b.number);

    filteredPlayers.forEach(player => {
        const card = document.createElement('div');
        card.className = `player-card player-pos-${player.position}`;
        
        let positionLabel = '';
        switch(player.position) {
            case 'goleiro': positionLabel = 'Goleiro'; break;
            case 'defesa': positionLabel = 'Defensor'; break;
            case 'meio-campo': positionLabel = 'Meio-Campista'; break;
            case 'ataque': positionLabel = 'Atacante'; break;
        }

        const photoHtml = player.photo 
            ? `<img src="${player.photo}" class="player-photo" alt="${player.name}">`
            : `<svg class="player-avatar-svg" viewBox="0 0 24 24">
                   <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
               </svg>`;

        card.innerHTML = `
            <div class="player-number">${player.number}</div>
            <div class="player-photo-container">
                ${photoHtml}
            </div>
            <div class="player-info">
                <h3 class="player-name">${player.name}</h3>
                <span class="player-position">${positionLabel}</span>
                <div>
                    <span class="player-jersey-number">Nº ${player.number}</span>
                </div>
            </div>
        `;
        squadGrid.appendChild(card);
    });

    // Configurar filtros
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
        
        // Evitar duplicar listeners
        btn.onclick = () => renderSquad(btn.getAttribute('data-filter'));
    });
}

/* ==========================================================================
   PRÓXIMOS COMPROMISSOS (JOGOS)
   ========================================================================== */

function renderMatches() {
    const matchesGrid = document.getElementById('matches-grid');
    if (!matchesGrid) return;

    matchesGrid.innerHTML = '';

    // Filtrar apenas jogos NÃO realizados (played === false)
    const upcomingMatches = matches.filter(m => !m.played);

    if (upcomingMatches.length === 0) {
        matchesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 4rem; background: var(--color-neutral-card); border-radius: var(--border-radius-lg); border: 1px solid var(--color-glass-border)">
                <p style="color: #a0aec0;">Nenhum jogo agendado no momento. Solicite um amistoso no formulário abaixo!</p>
            </div>
        `;
        return;
    }

    // Ordenar jogos por data (mais antigos/próximos primeiro para compromissos)
    const sortedMatches = [...upcomingMatches].sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return new Date(dateA) - new Date(dateB);
    });

    // Exibir apenas os 3 próximos domingos
    const nextThreeMatches = sortedMatches.slice(0, 3);

    nextThreeMatches.forEach(match => {
        const card = document.createElement('div');
        card.className = 'match-card';
        
        const badgeClass = match.isHome ? 'home' : 'away';
        const badgeLabel = match.isHome ? 'Casa' : 'Fora';

        // Definir se usamos logotipo ou iniciais para o adversário
        let opponentLogoHtml = '';
        if (match.opponent.toLowerCase().includes("granja selecta")) {
            opponentLogoHtml = `<img src="img/granja_selecta.png" alt="${match.opponent}" class="match-team-logo">`;
        } else if (match.opponent.toLowerCase().includes("são joão") || match.opponent.toLowerCase().includes("sao joao") || match.opponent.toLowerCase().includes("sjfc")) {
            opponentLogoHtml = `<img src="img/sao_joao.jpg?v=2" alt="${match.opponent}" class="match-team-logo">`;
        } else if (match.opponent.toLowerCase().includes("são josé") || match.opponent.toLowerCase().includes("sao jose") || match.opponent.toLowerCase().includes("vsjfc")) {
            opponentLogoHtml = `<img src="img/sao_jose.jpg?v=2" alt="${match.opponent}" class="match-team-logo">`;
        } else {
            opponentLogoHtml = `
                <div class="match-team-logo" style="display:flex;align-items:center;justify-content:center;font-weight:bold;color:var(--color-red-primary);font-size:1.5rem;font-family:var(--font-heading)">
                    ${match.opponent.substring(0,2).toUpperCase()}
                </div>
            `;
        }

        card.innerHTML = `
            <div class="match-header">
                <span>DOMINGO - CAMPEONATO/AMISTOSO</span>
                <span class="match-badge ${badgeClass}">${badgeLabel}</span>
            </div>
            <div class="match-teams">
                <div class="match-team">
                    <img src="img/brasao.jpg?v=2" alt="Dona Catarina Logo" class="match-team-logo" onerror="this.src='https://placehold.co/100x100/093b1f/ffffff?text=DC'">
                    <span class="match-team-name">Dona Catarina</span>
                </div>
                <div class="match-vs">VS</div>
                <div class="match-team">
                    ${opponentLogoHtml}
                    <span class="match-team-name">${match.opponent}</span>
                </div>
            </div>
            <div class="match-footer">
                <div class="match-detail-item">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>${match.date} às ${match.time}</span>
                </div>
                <div class="match-detail-item">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>${match.location}</span>
                </div>
            </div>
        `;
        matchesGrid.appendChild(card);
    });
}

function renderHistory() {
    const historyGrid = document.getElementById('history-grid');
    if (!historyGrid) return;

    historyGrid.innerHTML = '';

    // Filtrar apenas jogos realizados (played === true)
    const playedMatches = matches.filter(m => m.played);

    if (playedMatches.length === 0) {
        historyGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #a0aec0; background: var(--color-neutral-card); border-radius: var(--border-radius-sm); border: 1px solid var(--color-glass-border)">
                <p>Nenhum resultado registrado este ano.</p>
            </div>
        `;
        return;
    }

    // Ordenar jogos por data decrescente (mais recente primeiro)
    const sortedPlayed = [...playedMatches].sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return new Date(dateB) - new Date(dateA);
    });

    sortedPlayed.forEach(match => {
        const row = document.createElement('div');
        row.className = 'history-match-row';

        // Definir se usamos logotipo ou iniciais para o adversário
        let opponentLogoHtml = '';
        if (match.opponent.toLowerCase().includes("granja selecta")) {
            opponentLogoHtml = `<img src="img/granja_selecta.png" alt="${match.opponent}" class="history-logo-mini">`;
        } else if (match.opponent.toLowerCase().includes("são joão") || match.opponent.toLowerCase().includes("sao joao") || match.opponent.toLowerCase().includes("sjfc")) {
            opponentLogoHtml = `<img src="img/sao_joao.jpg?v=2" alt="${match.opponent}" class="history-logo-mini">`;
        } else if (match.opponent.toLowerCase().includes("são josé") || match.opponent.toLowerCase().includes("sao jose") || match.opponent.toLowerCase().includes("vsjfc")) {
            opponentLogoHtml = `<img src="img/sao_jose.jpg?v=2" alt="${match.opponent}" class="history-logo-mini">`;
        } else {
            opponentLogoHtml = `
                <div class="history-logo-mini" style="display:flex;align-items:center;justify-content:center;font-weight:bold;color:var(--color-red-primary);font-size:0.75rem;font-family:var(--font-heading)">
                    ${match.opponent.substring(0,2).toUpperCase()}
                </div>
            `;
        }

        // Definir destaque visual do placar
        let homeClass = '';
        let awayClass = '';
        if (match.homeScore > match.awayScore) {
            homeClass = 'win';
        } else if (match.homeScore < match.awayScore) {
            awayClass = 'loss';
        }

        row.innerHTML = `
            <div class="history-date">${match.date}</div>
            <div class="history-teams-display">
                <div class="history-team-side home">
                    <span class="history-name">Dona Catarina</span>
                    <img src="img/brasao.jpg?v=2" alt="Dona Catarina" class="history-logo-mini" onerror="this.src='https://placehold.co/50x50/093b1f/ffffff?text=DC'">
                </div>
                <div class="history-score-capsule">
                    <span class="${homeClass}">${match.homeScore}</span>
                    <span>-</span>
                    <span class="${awayClass}">${match.awayScore}</span>
                </div>
                <div class="history-team-side away">
                    ${opponentLogoHtml}
                    <span class="history-name">${match.opponent}</span>
                </div>
            </div>
            <div class="history-details-text">${match.location}</div>
        `;
        historyGrid.appendChild(row);
    });
}

/* ==========================================================================
   FORMULÁRIO DE CONTATO/AGENDAMENTO
   ========================================================================== */

function initContactForm() {
    const contactForm = document.getElementById('match-schedule-form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const teamName = document.getElementById('contact-team').value;
        const repName = document.getElementById('contact-rep').value;
        const repPhone = document.getElementById('contact-phone').value;
        const matchDate = document.getElementById('contact-date').value;
        const matchTime = document.getElementById('contact-time').value;
        const message = document.getElementById('contact-message').value;

        // Número de WhatsApp oficial do time (Pode ser alterado)
        // Substitua pelo número real no formato internacional sem "+" ex: 5511999999999
        const whatsappNumber = "5511999999999"; 

        const formattedText = `Olá! Sou o ${repName} do time *${teamName}*.\nGostaria de agendar um jogo amistoso com os *Veteranos do Dona Catarina*.\n\n` + 
                              `📅 *Data Sugerida:* ${matchDate} (Domingo)\n` +
                              `⏰ *Horário:* ${matchTime}\n` +
                              `📞 *Contato:* ${repPhone}\n\n` +
                              `📝 *Recado:* ${message}`;

        const whatsappURL = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(formattedText)}`;

        // Mostrar Toast de Sucesso
        showToast("Encaminhando para o WhatsApp do time...");

        // Redirecionar para o WhatsApp
        setTimeout(() => {
            window.open(whatsappURL, '_blank');
            contactForm.reset();
        }, 1500);
    });
}

/* ==========================================================================
   PAINEL ADMINISTRATIVO (ADMIN)
   ========================================================================== */

function checkAdminAuthState() {
    const loginSection = document.getElementById('admin-login-section');
    const dashboardSection = document.getElementById('admin-dashboard-section');

    if (!loginSection || !dashboardSection) return;

    if (isAdminAuthenticated) {
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'grid';
        renderAdminPlayersTable();
        renderAdminMatchesTable();
    } else {
        loginSection.style.display = 'block';
        dashboardSection.style.display = 'none';
    }
}

function initAdminForm() {
    const loginForm = document.getElementById('admin-login-form');
    const addPlayerForm = document.getElementById('add-player-form');
    const logoutBtn = document.getElementById('admin-logout-btn');
    const exportBtn = document.getElementById('admin-export-btn');
    const importInput = document.getElementById('admin-import-file');

    // Login
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const pin = document.getElementById('admin-pin').value;
            
            // Senha padrão simple: "catarina"
            if (pin.toLowerCase() === 'catarina') {
                isAdminAuthenticated = true;
                sessionStorage.setItem('vet_dona_catarina_admin', 'true');
                checkAdminAuthState();
                showToast("Acesso administrativo autorizado!");
                loginForm.reset();
            } else {
                showToast("Senha incorreta! Tente novamente.", true);
            }
        });
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            isAdminAuthenticated = false;
            sessionStorage.removeItem('vet_dona_catarina_admin');
            checkAdminAuthState();
            showToast("Sessão finalizada.");
        });
    }

    // Adicionar / Editar Jogador
    if (addPlayerForm) {
        addPlayerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('player-name-input').value;
            const number = parseInt(document.getElementById('player-number-input').value);
            const position = document.getElementById('player-position-select').value;

            // Verificar se número já existe (excluindo o próprio jogador que estamos editando)
            if (players.some(p => p.number === number && p.id !== editingPlayerId)) {
                showToast(`A camisa Nº ${number} já está em uso!`, true);
                return;
            }

            if (editingPlayerId) {
                // Modo Edição
                const playerIndex = players.findIndex(p => p.id === editingPlayerId);
                if (playerIndex !== -1) {
                    players[playerIndex].name = name;
                    players[playerIndex].number = number;
                    players[playerIndex].position = position;
                    players[playerIndex].photo = currentPlayerPhotoBase64;
                    showToast(`Dados de ${name} atualizados!`);
                }
            } else {
                // Modo Cadastro
                const newPlayer = {
                    id: Date.now(),
                    name,
                    number,
                    position,
                    photo: currentPlayerPhotoBase64
                };
                players.push(newPlayer);
                showToast(`Jogador ${name} cadastrado com sucesso!`);
            }

            savePlayers();
            renderSquad('todos');
            renderAdminPlayersTable();
            resetAdminForm();
        });
    }

    // Ouvintes para Inputs de Fotos
    const playerPhotoInput = document.getElementById('player-photo-input');
    const playerPhotoPreview = document.getElementById('player-photo-preview');
    if (playerPhotoInput && playerPhotoPreview) {
        playerPhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                compressAndResizePhoto(file, (base64) => {
                    currentPlayerPhotoBase64 = base64;
                    playerPhotoPreview.innerHTML = `<img src="${base64}" alt="Preview">`;
                });
            } else {
                currentPlayerPhotoBase64 = "";
                playerPhotoPreview.innerHTML = `<span>Sem foto selecionada</span>`;
            }
        });
    }

    const coachPhotoInput = document.getElementById('coach-photo-input');
    const coachPhotoPreview = document.getElementById('coach-photo-preview');
    if (coachPhotoInput && coachPhotoPreview) {
        coachPhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                compressAndResizePhoto(file, (base64) => {
                    currentCoachPhotoBase64 = base64;
                    coachPhotoPreview.innerHTML = `<img src="${base64}" alt="Preview">`;
                });
            } else {
                currentCoachPhotoBase64 = "";
                coachPhotoPreview.innerHTML = `<span>Sem foto selecionada</span>`;
            }
        });
    }

    // Cancelar Edição
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            resetAdminForm();
            showToast("Edição cancelada.");
        });
    }

    // Exportar Dados
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(players, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", "elenco_veteranos_dona_catarina.json");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast("Dados do elenco exportados!");
        });
    }

    // Importar Dados
    if (importInput) {
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const importedPlayers = JSON.parse(event.target.result);
                    if (Array.isArray(importedPlayers) && importedPlayers.every(p => p.name && p.number && p.position)) {
                        players = importedPlayers;
                        savePlayers();
                        renderSquad('todos');
                        renderAdminPlayersTable();
                        showToast("Elenco importado com sucesso!");
                    } else {
                        showToast("Formato de arquivo inválido!", true);
                    }
                } catch (error) {
                    showToast("Erro ao ler o arquivo JSON!", true);
                }
            };
            reader.readAsText(file);
        });
    }

    // Treinador / Comissão Técnica
    const coachForm = document.getElementById('coach-form');
    if (coachForm) {
        const coachInput = document.getElementById('coach-name-input');
        if (coachInput) {
            const coachData = getCoachData();
            coachInput.value = coachData.name === "A definir" ? "" : coachData.name;
            if (coachData.photo && coachPhotoPreview) {
                currentCoachPhotoBase64 = coachData.photo;
                coachPhotoPreview.innerHTML = `<img src="${coachData.photo}" alt="Preview">`;
            }
        }

        coachForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newCoachName = document.getElementById('coach-name-input').value;
            const newCoach = {
                name: newCoachName || "A definir",
                photo: currentCoachPhotoBase64
            };
            coachName = JSON.stringify(newCoach);
            localStorage.setItem('vet_dona_catarina_coach', coachName);
            if (useFirebase && db) {
                db.ref('coach').set(coachName);
            } else {
                renderSquad('todos');
            }
            showToast("Comissão técnica atualizada!");
        });
    }

     // Toggle de exibição dos campos de placar conforme o status
    const matchStatusSelect = document.getElementById('match-status-select');
    const matchScoreFields = document.getElementById('match-score-fields');
    if (matchStatusSelect && matchScoreFields) {
        matchStatusSelect.addEventListener('change', () => {
            if (matchStatusSelect.value === 'jogado') {
                matchScoreFields.style.display = 'block';
            } else {
                matchScoreFields.style.display = 'none';
            }
        });
    }

    // Adicionar / Editar Confronto
    const addMatchForm = document.getElementById('add-match-form');
    if (addMatchForm) {
        addMatchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const opponent = document.getElementById('match-opponent-input').value;
            const date = document.getElementById('match-date-input').value;
            const time = document.getElementById('match-time-input').value;
            const location = document.getElementById('match-location-input').value;
            const isHome = document.getElementById('match-mando-select').value === 'casa';
            const played = document.getElementById('match-status-select').value === 'jogado';
            const homeScore = played ? parseInt(document.getElementById('match-home-score').value) || 0 : 0;
            const awayScore = played ? parseInt(document.getElementById('match-away-score').value) || 0 : 0;

            if (editingMatchId) {
                // Editar jogo existente
                const matchIndex = matches.findIndex(m => m.id === editingMatchId);
                if (matchIndex !== -1) {
                    matches[matchIndex].opponent = opponent;
                    matches[matchIndex].date = date;
                    matches[matchIndex].time = time;
                    matches[matchIndex].location = location;
                    matches[matchIndex].isHome = isHome;
                    matches[matchIndex].played = played;
                    matches[matchIndex].homeScore = homeScore;
                    matches[matchIndex].awayScore = awayScore;
                    showToast("Confronto atualizado com sucesso!");
                }
            } else {
                // Cadastrar novo jogo
                const newMatch = {
                    id: Date.now(),
                    opponent,
                    date,
                    time,
                    location,
                    isHome,
                    played,
                    homeScore,
                    awayScore
                };
                matches.push(newMatch);
                showToast("Confronto agendado com sucesso!");
            }

            saveMatches();
            renderMatches();
            renderHistory();
            renderScoreboard();
            renderAdminMatchesTable();
            resetMatchForm();
        });
    }
    
    // Cancelar Edição do Confronto
    const cancelMatchBtn = document.getElementById('cancel-match-edit-btn');
    if (cancelMatchBtn) {
        cancelMatchBtn.addEventListener('click', () => {
            resetMatchForm();
            showToast("Edição do confronto cancelada.");
        });
    }
}

function renderScoreboard() {
    const homeScoreEl = document.getElementById('score-home');
    const awayScoreEl = document.getElementById('score-away');
    const awayNameEl = document.getElementById('score-away-name');
    const awayLogoEl = document.getElementById('score-away-logo');
    const dateEl = document.getElementById('scoreboard-date');
    const locationEl = document.getElementById('scoreboard-location');

    // Buscar o jogo realizado mais recente
    const playedMatches = matches.filter(m => m.played);
    
    if (playedMatches.length === 0) {
        // Se não houver jogos realizados, ocultar o placar da home
        const scoreboardPanel = document.getElementById('last-match-scoreboard');
        if (scoreboardPanel) scoreboardPanel.style.display = 'none';
        return;
    } else {
        const scoreboardPanel = document.getElementById('last-match-scoreboard');
        if (scoreboardPanel) scoreboardPanel.style.display = 'block';
    }

    // Ordenar por data decrescente (mais recente primeiro)
    const sortedPlayed = [...playedMatches].sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return new Date(dateB) - new Date(dateA);
    });

    const lastPlayedMatch = sortedPlayed[0];

    if (homeScoreEl) homeScoreEl.textContent = lastPlayedMatch.homeScore;
    if (awayScoreEl) awayScoreEl.textContent = lastPlayedMatch.awayScore;
    if (awayNameEl) awayNameEl.textContent = lastPlayedMatch.opponent;
    if (dateEl) dateEl.textContent = lastPlayedMatch.date;
    if (locationEl) locationEl.textContent = lastPlayedMatch.location;

    // Ajustar logotipo do adversário dinamicamente
    if (awayLogoEl) {
        if (lastPlayedMatch.opponent.toLowerCase().includes("granja selecta")) {
            awayLogoEl.src = "img/granja_selecta.png";
        } else if (lastPlayedMatch.opponent.toLowerCase().includes("são joão") || lastPlayedMatch.opponent.toLowerCase().includes("sao joao") || lastPlayedMatch.opponent.toLowerCase().includes("sjfc")) {
            awayLogoEl.src = "img/sao_joao.jpg?v=2";
        } else if (lastPlayedMatch.opponent.toLowerCase().includes("são josé") || lastPlayedMatch.opponent.toLowerCase().includes("sao jose") || lastPlayedMatch.opponent.toLowerCase().includes("vsjfc")) {
            awayLogoEl.src = "img/sao_jose.jpg?v=2";
        } else {
            // Gerar um placeholder com as iniciais do adversário novo
            awayLogoEl.src = `https://placehold.co/100x100/4a5568/ffffff?text=${encodeURIComponent(lastPlayedMatch.opponent.substring(0,2).toUpperCase())}`;
        }
    }
}

function renderAdminMatchesTable() {
    const tableBody = document.querySelector('#admin-matches-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    // Ordenar todos os jogos por data (mais recentes primeiro)
    const sorted = [...matches].sort((a, b) => {
        const dateA = a.date.split('/').reverse().join('-');
        const dateB = b.date.split('/').reverse().join('-');
        return new Date(dateB) - new Date(dateA);
    });

    sorted.forEach(match => {
        const row = document.createElement('tr');
        
        const statusLabel = match.played 
            ? `<span style="color: var(--color-green-light); font-weight: bold;">Jogado (${match.homeScore} x ${match.awayScore})</span>` 
            : '<span style="color: #cbd5e0; background: rgba(255,255,255,0.05); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">Agendado</span>';
        const mandoLabel = match.isHome ? 'Casa' : 'Fora';

        row.innerHTML = `
            <td>${match.date} às ${match.time}</td>
            <td><strong>${match.opponent}</strong></td>
            <td>${match.location} (${mandoLabel})</td>
            <td>${statusLabel}</td>
            <td>
                <button class="btn-secondary btn-edit-match" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; font-weight: 600; margin-right: 0.5rem;" data-id="${match.id}">Editar</button>
                <button class="btn-danger btn-delete-match" data-id="${match.id}">Remover</button>
            </td>
        `;

        // Evento de edição de jogo
        row.querySelector('.btn-edit-match').addEventListener('click', () => {
            startEditMatch(match.id);
        });

        // Evento de exclusão de jogo
        row.querySelector('.btn-delete-match').addEventListener('click', () => {
            deleteMatch(match.id, match.opponent);
        });

        tableBody.appendChild(row);
    });
}

function startEditMatch(id) {
    const match = matches.find(m => m.id === id);
    if (!match) return;

    editingMatchId = id;
    
    // Atualizar títulos e botões
    document.getElementById('admin-match-form-title').textContent = "Editar Confronto";
    document.getElementById('admin-match-form-title').style.color = "var(--color-gold)";
    document.getElementById('match-form-submit-btn').textContent = "Salvar Alterações";
    document.getElementById('cancel-match-edit-btn').style.display = "block";

    // Preencher campos
    document.getElementById('match-opponent-input').value = match.opponent;
    document.getElementById('match-date-input').value = match.date;
    document.getElementById('match-time-input').value = match.time;
    document.getElementById('match-location-input').value = match.location;
    document.getElementById('match-mando-select').value = match.isHome ? 'casa' : 'fora';
    document.getElementById('match-status-select').value = match.played ? 'jogado' : 'agendado';

    // Mostrar/ocultar campos de placar
    const matchScoreFields = document.getElementById('match-score-fields');
    if (match.played) {
        matchScoreFields.style.display = 'block';
        document.getElementById('match-home-score').value = match.homeScore;
        document.getElementById('match-away-score').value = match.awayScore;
    } else {
        matchScoreFields.style.display = 'none';
        document.getElementById('match-home-score').value = 0;
        document.getElementById('match-away-score').value = 0;
    }

    // Rolagem suave até o formulário
    document.getElementById('admin-match-form-title').scrollIntoView({ behavior: 'smooth' });
}

function resetMatchForm() {
    editingMatchId = null;
    
    document.getElementById('admin-match-form-title').textContent = "Cadastrar Confronto";
    document.getElementById('admin-match-form-title').style.color = "var(--color-green-light)";
    document.getElementById('match-form-submit-btn').textContent = "Salvar Confronto";
    document.getElementById('cancel-match-edit-btn').style.display = "none";

    document.getElementById('add-match-form').reset();
    document.getElementById('match-score-fields').style.display = 'none';
}

function deleteMatch(id, opponent) {
    if (confirm(`Tem certeza que deseja remover o confronto contra o "${opponent}"?`)) {
        if (editingMatchId === id) {
            resetMatchForm();
        }
        matches = matches.filter(m => m.id !== id);
        saveMatches();
        renderMatches();
        renderHistory();
        renderScoreboard();
        renderAdminMatchesTable();
        showToast("Confronto removido!");
    }
}

function renderAdminPlayersTable() {
    const tableBody = document.querySelector('#admin-players-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    // Ordenar por número
    const sorted = [...players].sort((a, b) => a.number - b.number);

    sorted.forEach(player => {
        const row = document.createElement('tr');
        
        let positionLabel = '';
        switch(player.position) {
            case 'goleiro': positionLabel = 'Goleiro'; break;
            case 'defesa': positionLabel = 'Defensor'; break;
            case 'meio-campo': positionLabel = 'Meio-Campista'; break;
            case 'ataque': positionLabel = 'Atacante'; break;
        }

        const imgHtml = player.photo 
            ? `<img src="${player.photo}" class="admin-table-thumb" alt="${player.name}">`
            : `<div class="admin-table-thumb" style="display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;background:#1a201c;color:#a0aec0">👤</div>`;

        row.innerHTML = `
            <td>${player.number}</td>
            <td>
                ${imgHtml}
                <strong>${player.name}</strong>
            </td>
            <td>${positionLabel}</td>
            <td>
                <button class="btn-secondary btn-edit" style="padding: 0.4rem 0.8rem; font-size: 0.85rem; font-weight: 600; margin-right: 0.5rem;" data-id="${player.id}">Editar</button>
                <button class="btn-danger btn-delete" data-id="${player.id}">Remover</button>
            </td>
        `;

        // Evento de edição
        row.querySelector('.btn-edit').addEventListener('click', () => {
            startEditPlayer(player.id);
        });

        // Evento de exclusão
        row.querySelector('.btn-delete').addEventListener('click', () => {
            deletePlayer(player.id, player.name);
        });

        tableBody.appendChild(row);
    });
}

function startEditPlayer(id) {
    const player = players.find(p => p.id === id);
    if (!player) return;

    editingPlayerId = player.id;

    // Preencher formulário
    document.getElementById('player-name-input').value = player.name;
    document.getElementById('player-number-input').value = player.number;
    document.getElementById('player-position-select').value = player.position;

    // Carregar foto no preview se houver
    const previewBox = document.getElementById('player-photo-preview');
    if (previewBox) {
        if (player.photo) {
            currentPlayerPhotoBase64 = player.photo;
            previewBox.innerHTML = `<img src="${player.photo}" alt="Preview">`;
        } else {
            currentPlayerPhotoBase64 = "";
            previewBox.innerHTML = `<span>Sem foto selecionada</span>`;
        }
    }

    // Mudar visual do formulário para Edição
    const formTitle = document.getElementById('admin-form-title');
    const submitBtn = document.getElementById('player-form-submit-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');

    if (formTitle) formTitle.textContent = "Editar Jogador";
    if (submitBtn) submitBtn.textContent = "Salvar Alterações";
    if (cancelBtn) cancelBtn.style.display = 'block';

    // Rolar suavemente até o formulário
    document.getElementById('admin-form-title').scrollIntoView({ behavior: 'smooth' });
}

function resetAdminForm() {
    const form = document.getElementById('add-player-form');
    if (form) form.reset();
    
    editingPlayerId = null;
    currentPlayerPhotoBase64 = "";

    const previewBox = document.getElementById('player-photo-preview');
    if (previewBox) {
        previewBox.innerHTML = `<span>Sem foto selecionada</span>`;
    }
    
    const formTitle = document.getElementById('admin-form-title');
    const submitBtn = document.getElementById('player-form-submit-btn');
    const cancelBtn = document.getElementById('cancel-edit-btn');
    
    if (formTitle) formTitle.textContent = "Cadastrar Jogador";
    if (submitBtn) submitBtn.textContent = "Salvar no Elenco";
    if (cancelBtn) cancelBtn.style.display = 'none';
}

function deletePlayer(id, name) {
    if (confirm(`Deseja realmente remover o jogador "${name}" do elenco?`)) {
        // Se estivermos editando o jogador excluído, cancela a edição
        if (editingPlayerId === id) {
            resetAdminForm();
        }
        players = players.filter(p => p.id !== id);
        savePlayers();
        renderSquad('todos');
        renderAdminPlayersTable();
        showToast(`Jogador ${name} foi removido.`);
    }
}

/* ==========================================================================
   SISTEMA DE TOAST (AVISOS)
   ========================================================================== */

function showToast(message, isError = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    
    const icon = isError 
        ? `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        : `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

    toast.innerHTML = `
        ${icon}
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Trigger reflow/animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remover após 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
