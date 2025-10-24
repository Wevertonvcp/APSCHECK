// Estado da aplicação
let pendingGames = [];
let activeMultiples = [];
let historyMultiples = [];
let selectedGames = [];

// Elementos DOM
const gameForm = document.getElementById('gameForm');
const pendingGamesContainer = document.getElementById('pendingGames');
const activeMultiplesContainer = document.getElementById('activeMultiples');
const historyMultiplesContainer = document.getElementById('historyMultiples');
const multipleActions = document.getElementById('multipleActions');
const selectedCount = document.getElementById('selectedCount');
const totalOdds = document.getElementById('totalOdds');
const createMultipleBtn = document.getElementById('createMultiple');
const modal = document.getElementById('multipleModal');
const modalTotalOdds = document.getElementById('modalTotalOdds');
const potentialReturn = document.getElementById('potentialReturn');
const betAmount = document.getElementById('betAmount');
const selectedGamesSummary = document.getElementById('selectedGamesSummary');
const confirmMultipleBtn = document.getElementById('confirmMultiple');
const cancelMultipleBtn = document.getElementById('cancelMultiple');
const closeModal = document.querySelector('.close');
const clearHistoryBtn = document.getElementById('clearHistory');

// Elementos do modal de edição
const editGameModal = document.getElementById('editGameModal');
const editGameForm = document.getElementById('editGameForm');
const editHomeTeam = document.getElementById('editHomeTeam');
const editAwayTeam = document.getElementById('editAwayTeam');
const editBetType = document.getElementById('editBetType');
const editOdds = document.getElementById('editOdds');
const editGameDate = document.getElementById('editGameDate');
const saveEditGameBtn = document.getElementById('saveEditGame');
const cancelEditGameBtn = document.getElementById('cancelEditGame');
const closeEditModal = document.querySelector('.close-edit');

let currentEditingGameId = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    setupEventListeners();
    // Aguardar verificação de autenticação antes de carregar dados
    await waitForAuthCheck();
});

// Configurar event listeners
function setupEventListeners() {
    gameForm.addEventListener('submit', handleAddGame);
    createMultipleBtn.addEventListener('click', openMultipleModal);
    confirmMultipleBtn.addEventListener('click', confirmMultiple);
    cancelMultipleBtn.addEventListener('click', closeMultipleModal);
    closeModal.addEventListener('click', closeMultipleModal);
    betAmount.addEventListener('input', updatePotentialReturn);
    clearHistoryBtn.addEventListener('click', clearHistory);
    
    // Event listeners para modal de edição
    saveEditGameBtn.addEventListener('click', saveEditGame);
    cancelEditGameBtn.addEventListener('click', closeEditGameModal);
    closeEditModal.addEventListener('click', closeEditGameModal);
    
    // Fechar modal ao clicar fora
    editGameModal.addEventListener('click', function(event) {
        if (event.target === editGameModal) {
            closeEditGameModal();
        }
    });
    
    // Fechar modal clicando fora
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeMultipleModal();
        }
    });
}

// Adicionar novo jogo
async function handleAddGame(event) {
    console.log('🚀 handleAddGame chamada');
    event.preventDefault();
    
    // Verificação simples de autenticação
    if (!requireAuth()) {
        console.log('❌ Usuário não autenticado, interrompendo adição');
        showNotification('Faça login para adicionar jogos!', 'error');
        return;
    }
    
    const formData = new FormData(gameForm);
    const game = {
        id: Date.now().toString(),
        homeTeam: formData.get('homeTeam') || document.getElementById('homeTeam').value,
        awayTeam: formData.get('awayTeam') || document.getElementById('awayTeam').value,
        betType: formData.get('betType') || document.getElementById('betType').value,
        odds: parseFloat(document.getElementById('odds').value),
        gameDate: document.getElementById('gameDate').value,
        createdAt: new Date().toISOString()
    };
    
    console.log('📝 Dados do jogo criado:', game);
    
    try {
        console.log('💾 Tentando salvar no banco...');
        await savePendingGame(game);
        
        console.log('📋 Adicionando ao array local...');
        pendingGames.push(game);
        
        console.log('🔄 Atualizando display...');
        updateDisplay();
        
        console.log('🧹 Resetando formulário...');
        gameForm.reset();
        
        // Animação de sucesso
        console.log('✅ Mostrando notificação de sucesso...');
        showNotification('Jogo adicionado com sucesso!', 'success');
    } catch (error) {
        console.error('💥 Erro ao adicionar jogo:', error);
        showNotification('Erro ao adicionar jogo: ' + error.message, 'error');
    }
}

// Alternar seleção de jogo
function toggleGameSelection(gameId) {
    const index = selectedGames.findIndex(id => id.toString() === gameId.toString());
    if (index > -1) {
        selectedGames.splice(index, 1);
    } else {
        selectedGames.push(gameId);
    }
    updateDisplay();
}

// Calcular odds total
function calculateTotalOdds() {
    if (selectedGames.length === 0) return 0;
    
    return selectedGames.reduce((total, gameId) => {
        const game = pendingGames.find(g => g.id === gameId);
        return total * (game ? game.odds : 1);
    }, 1);
}

// Abrir modal de múltipla
function cleanupSelectedGames() {
    // Remove jogos selecionados que não existem mais nos pendentes
    selectedGames = selectedGames.filter(gameId => 
        pendingGames.some(game => game.id === gameId)
    );
}

function openMultipleModal() {
    // Limpar jogos selecionados que não existem mais
    cleanupSelectedGames();
    
    if (selectedGames.length < 2) {
        showNotification('Selecione pelo menos 2 jogos para criar uma múltipla!', 'error');
        return;
    }
    
    const total = calculateTotalOdds();
    modalTotalOdds.textContent = total.toFixed(2);
    
    // Mostrar resumo dos jogos selecionados
    selectedGamesSummary.innerHTML = selectedGames.map(gameId => {
        const game = pendingGames.find(g => g.id === gameId);
        if (!game) {
            console.error('Jogo não encontrado no resumo:', gameId);
            return '';
        }
        return `
            <div class="multiple-game">
                <div>
                    <strong>${game.homeTeam} vs ${game.awayTeam}</strong><br>
                    <small>${getBetTypeLabel(game.betType)} - Odd: ${game.odds}</small>
                </div>
            </div>
        `;
    }).filter(html => html !== '').join('');
    
    updatePotentialReturn();
    modal.style.display = 'block';
}

// Fechar modal
function closeMultipleModal() {
    modal.style.display = 'none';
}

// Atualizar retorno potencial
function updatePotentialReturn() {
    const amount = parseFloat(betAmount.value) || 0;
    const odds = parseFloat(modalTotalOdds.textContent) || 0;
    const potential = amount * odds;
    potentialReturn.textContent = `R$ ${potential.toFixed(2)}`;
}

// Confirmar múltipla
async function confirmMultiple() {
    const amount = parseFloat(betAmount.value);
    if (!amount || amount <= 0) {
        showNotification('Informe um valor válido para a aposta!', 'error');
        return;
    }
    
    const multiple = {
        id: Date.now().toString(),
        games: selectedGames.map(gameId => {
            const game = pendingGames.find(g => g.id === gameId);
            if (!game) {
                console.error('Jogo não encontrado:', gameId);
                return null;
            }
            return {
                ...game,
                result: null // null = pendente, true = ganhou, false = perdeu
            };
        }).filter(game => game !== null),
        betAmount: amount,
        totalOdds: calculateTotalOdds(),
        potentialReturn: amount * calculateTotalOdds(),
        status: 'active', // active, won, lost
        createdAt: new Date().toISOString()
    };
    
    try {
        // Salvar múltipla no Supabase
        await saveMultiple(multiple);
        
        // Remover jogos selecionados dos pendentes no Supabase
        for (const gameId of selectedGames) {
            await removePendingGameFromDB(gameId);
        }
        
        // Atualizar arrays locais
        activeMultiples.push(multiple);
        pendingGames = pendingGames.filter(game => !selectedGames.includes(game.id));
        selectedGames = [];
        
        updateDisplay();
        closeMultipleModal();
        
        showNotification('Múltipla criada com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao criar múltipla:', error);
    }
}

// Marcar resultado do jogo
async function markGameResult(multipleId, gameId, result) {
    try {
        const multiple = activeMultiples.find(m => m.id === multipleId);
        if (!multiple) return;
        
        const game = multiple.games.find(g => g.id === gameId);
        if (!game) return;
        
        game.result = result;
        
        // Atualizar o resultado do jogo no Supabase
        await updateMultipleGameResult(multipleId, gameId, result);
        
        // Verificar se todos os jogos têm resultado
        const allGamesHaveResult = multiple.games.every(g => g.result !== null);
        
        if (allGamesHaveResult) {
            // Verificar se a múltipla foi ganha (todos os jogos ganhos)
            const allGamesWon = multiple.games.every(g => g.result === true);
            
            multiple.status = allGamesWon ? 'won' : 'lost';
            
            // Atualizar status da múltipla no Supabase
            await updateMultipleStatus(multipleId, multiple.status);
            
            // Mover para histórico
            historyMultiples.push(multiple);
            activeMultiples = activeMultiples.filter(m => m.id !== multipleId);
            
            const message = allGamesWon ? 
                `Parabéns! Múltipla ganha! Retorno: R$ ${multiple.potentialReturn.toFixed(2)}` :
                'Múltipla perdida. Boa sorte na próxima!';
            
            showNotification(message, allGamesWon ? 'success' : 'error');
        }
        
        updateDisplay();
    } catch (error) {
        console.error('Erro ao marcar resultado do jogo:', error);
        showNotification('Erro ao marcar resultado do jogo', 'error');
    }
}

// Remover jogo pendente
async function removePendingGame(gameId) {
    try {
        console.log('Removendo jogo com ID:', gameId, 'Tipo:', typeof gameId);
        console.log('Jogos pendentes antes:', pendingGames.map(g => ({id: g.id, type: typeof g.id})));
        
        // Remover do Supabase
        await removePendingGameFromDB(gameId);
        
        // Remover dos arrays locais
        pendingGames = pendingGames.filter(game => game.id.toString() !== gameId.toString());
        selectedGames = selectedGames.filter(id => id.toString() !== gameId.toString());
        
        console.log('Jogos pendentes depois:', pendingGames.map(g => ({id: g.id, type: typeof g.id})));
        
        updateDisplay();
        showNotification('Jogo removido!', 'info');
    } catch (error) {
        console.error('Erro ao remover jogo:', error);
        showNotification('Erro ao remover jogo', 'error');
    }
}

// Excluir múltipla ativa
async function deleteActiveMultiple(multipleId) {
    if (confirm('Tem certeza que deseja excluir esta múltipla? Os jogos serão retornados para a lista de pendentes.')) {
        try {
            const multiple = activeMultiples.find(m => m.id === multipleId);
            if (multiple) {
                // Retornar jogos para pendentes (apenas os que não têm resultado)
                for (const game of multiple.games) {
                    if (game.result === null) {
                        const pendingGame = {
                            id: game.id,
                            homeTeam: game.homeTeam,
                            awayTeam: game.awayTeam,
                            betType: game.betType,
                            odds: game.odds,
                            gameDate: game.gameDate,
                            createdAt: game.createdAt
                        };
                        await savePendingGame(pendingGame);
                        pendingGames.push(pendingGame);
                    }
                }
                
                // Remover múltipla do Supabase
                await removeMultiple(multipleId);
                
                activeMultiples = activeMultiples.filter(m => m.id !== multipleId);
                updateDisplay();
                showNotification('Múltipla excluída e jogos retornados para pendentes!', 'info');
            }
        } catch (error) {
            console.error('Erro ao excluir múltipla:', error);
            showNotification('Erro ao excluir múltipla', 'error');
        }
    }
}

// Excluir múltipla do histórico
async function deleteHistoryMultiple(multipleId) {
    if (confirm('Tem certeza que deseja excluir esta múltipla do histórico?')) {
        try {
            // Remover múltipla do Supabase
            await removeMultiple(multipleId);
            
            historyMultiples = historyMultiples.filter(m => m.id !== multipleId);
            updateDisplay();
            showNotification('Múltipla removida do histórico!', 'info');
        } catch (error) {
            console.error('Erro ao remover múltipla do histórico:', error);
            showNotification('Erro ao remover múltipla do histórico', 'error');
        }
    }
}

// Limpar todo o histórico
async function clearHistory() {
    if (confirm('Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.')) {
        try {
            // Remover todas as múltiplas do histórico do Supabase
            await clearHistoryMultiples();
            
            historyMultiples = [];
            updateDisplay();
            showNotification('Histórico limpo!', 'info');
        } catch (error) {
            console.error('Erro ao limpar histórico:', error);
            showNotification('Erro ao limpar histórico', 'error');
        }
    }
}

// Copiar jogos de uma múltipla ativa para jogos pendentes
function copyMultipleGames(multipleId) {
    const multiple = activeMultiples.find(m => m.id === multipleId);
    if (!multiple) return;

    let copiedCount = 0;
    
    multiple.games.forEach(game => {
        // Criar uma nova cópia do jogo com novo ID (como string)
        const newGame = {
            id: Date.now().toString() + Math.floor(Math.random() * 1000).toString(),
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            betType: game.betType,
            odds: game.odds,
            gameDate: game.gameDate,
            createdAt: new Date().toISOString()
        };
        
        pendingGames.push(newGame);
        copiedCount++;
    });

    saveData();
    updateDisplay();
    showNotification(`${copiedCount} jogo(s) copiado(s) para jogos pendentes!`, 'success');
}

// Abrir modal de edição de jogo
function openEditGameModal(gameId) {
    console.log('Abrindo modal de edição para o jogo:', gameId, 'Tipo:', typeof gameId);
    console.log('Jogos pendentes disponíveis:', pendingGames.map(g => ({id: g.id, type: typeof g.id})));
    
    const game = pendingGames.find(g => g.id.toString() === gameId.toString());
    if (!game) {
        console.log('Jogo não encontrado:', gameId);
        return;
    }

    currentEditingGameId = gameId;
    
    // Preencher campos do modal
    editHomeTeam.value = game.homeTeam;
    editAwayTeam.value = game.awayTeam;
    editBetType.value = game.betType;
    editOdds.value = game.odds;
    editGameDate.value = game.gameDate;
    
    editGameModal.style.display = 'block';
}

// Fechar modal de edição
function closeEditGameModal() {
    editGameModal.style.display = 'none';
    currentEditingGameId = null;
    editGameForm.reset();
}

// Salvar edição do jogo
async function saveEditGame() {
    if (!currentEditingGameId) return;
    
    const gameIndex = pendingGames.findIndex(g => g.id.toString() === currentEditingGameId.toString());
    if (gameIndex === -1) return;
    
    // Validar campos
    if (!editHomeTeam.value || !editAwayTeam.value || !editBetType.value || !editOdds.value || !editGameDate.value) {
        showNotification('Por favor, preencha todos os campos!', 'error');
        return;
    }
    
    try {
        // Atualizar jogo
        const updatedGame = {
            ...pendingGames[gameIndex],
            homeTeam: editHomeTeam.value,
            awayTeam: editAwayTeam.value,
            betType: editBetType.value,
            odds: parseFloat(editOdds.value),
            gameDate: editGameDate.value
        };
        
        // Atualizar no Supabase
        await updatePendingGame(currentEditingGameId, updatedGame);
        
        // Atualizar no array local
        pendingGames[gameIndex] = updatedGame;
        
        // Remover da seleção se estava selecionado
        selectedGames = selectedGames.filter(id => id.toString() !== currentEditingGameId.toString());
        
        updateDisplay();
        closeEditGameModal();
        showNotification('Jogo editado com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao editar jogo:', error);
        showNotification('Erro ao editar jogo', 'error');
    }
}

// Obter label do tipo de aposta
function getBetTypeLabel(betType) {
    const betTypeNames = {
        '1': 'Vitória Casa (1)',
        'X': 'Empate (X)',
        '2': 'Vitória Visitante (2)',
        '1X': 'Casa ou Empate (1X)',
        '12': 'Casa ou Visitante (12)',
        'X2': 'Empate ou Visitante (X2)',
        'over1.5': 'Mais de 1.5 gols',
        'over2.5': 'Mais de 2.5 gols',
        'under2.5': 'Menos de 2.5 gols',
        'btts': 'Ambos marcam',
        'over2.5_btts': 'Mais de 2.5 e Ambas Marcam',
        '1_btts': 'Casa e Ambos Marcam',
        '2_btts': 'Fora e Ambos Marcam',
        '1_over2.5': 'Casa e Mais de 2.5 gols',
        '1_over1.5': 'Casa e Mais de 1.5 gols',
        '1X_over1.5': 'Casa ou Empate e Mais de 1.5 gols'
    };
    return betTypeNames[betType] || betType;
}

// Formatar data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Atualizar display
function updateDisplay() {
    updatePendingGames();
    updateActiveMultiples();
    updateHistoryMultiples();
    updateMultipleActions();
}

// Atualizar jogos pendentes
function updatePendingGames() {
    if (pendingGames.length === 0) {
        pendingGamesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-futbol"></i>
                <p>Nenhum jogo pendente. Adicione jogos para criar suas múltiplas!</p>
            </div>
        `;
        return;
    }
    
    pendingGamesContainer.innerHTML = pendingGames.map(game => `
        <div class="game-item ${selectedGames.some(id => id.toString() === game.id.toString()) ? 'selected' : ''}" 
             onclick="toggleGameSelection('${game.id}')">
            <div class="game-header">
                <div class="game-teams">${game.homeTeam} vs ${game.awayTeam}</div>
                <div class="game-odds">${game.odds}</div>
            </div>
            <div class="game-details">
                <span class="game-bet-type">${getBetTypeLabel(game.betType)}</span>
                <span>${formatDate(game.gameDate)}</span>
                <div class="game-actions">
                    <button onclick="event.stopPropagation(); openEditGameModal('${game.id}')" 
                            class="btn-edit" title="Editar jogo">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button onclick="event.stopPropagation(); removePendingGame('${game.id}')" 
                            class="btn btn-danger btn-small">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Atualizar múltiplas ativas
function updateActiveMultiples() {
    if (activeMultiples.length === 0) {
        activeMultiplesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <p>Nenhuma múltipla ativa.</p>
            </div>
        `;
        return;
    }
    
    activeMultiplesContainer.innerHTML = activeMultiples.map(multiple => `
        <div class="multiple-item">
            <div class="multiple-header">
                <div class="multiple-info">
                    <span class="multiple-status status-${multiple.status}">
                        ${multiple.status === 'active' ? 'Ativa' : multiple.status}
                    </span>
                    <span>Odd Total: ${multiple.totalOdds.toFixed(2)}</span>
                    <span>Aposta: R$ ${multiple.betAmount.toFixed(2)}</span>
                    <span>Retorno: R$ ${multiple.potentialReturn.toFixed(2)}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <small>${formatDate(multiple.createdAt)}</small>
                    <button onclick="copyMultipleGames('${multiple.id}')" class="btn-copy" title="Copiar jogos para pendentes">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button onclick="deleteActiveMultiple('${multiple.id}')" class="btn-delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="multiple-games">
                ${multiple.games.map(game => `
                    <div class="multiple-game ${game.result === true ? 'result-won' : game.result === false ? 'result-lost' : ''}">
                        <div>
                            <strong>${game.homeTeam} vs ${game.awayTeam}</strong><br>
                            <small>${getBetTypeLabel(game.betType)} - Odd: ${game.odds}</small>
                        </div>
                        <div class="game-result-buttons">
                            <button onclick="markGameResult('${multiple.id}', '${game.id}', true)" 
                                    class="btn btn-success btn-small ${game.result === true ? 'result-won' : ''}">
                                <i class="fas fa-check"></i> Ganhou
                            </button>
                            <button onclick="markGameResult('${multiple.id}', '${game.id}', false)" 
                                    class="btn btn-danger btn-small ${game.result === false ? 'result-lost' : ''}">
                                <i class="fas fa-times"></i> Perdeu
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Atualizar histórico
function updateHistoryMultiples() {
    // Mostrar/ocultar botão de limpar histórico
    if (historyMultiples.length === 0) {
        clearHistoryBtn.style.display = 'none';
        historyMultiplesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-archive"></i>
                <p>Nenhuma múltipla finalizada ainda.</p>
            </div>
        `;
        return;
    }
    
    clearHistoryBtn.style.display = 'block';
    
    historyMultiplesContainer.innerHTML = historyMultiples.map(multiple => `
        <div class="multiple-item">
            <div class="multiple-header">
                <div class="multiple-info">
                    <span class="multiple-status status-${multiple.status}">
                        ${multiple.status === 'won' ? 'Ganha' : 'Perdida'}
                    </span>
                    <span>Odd Total: ${multiple.totalOdds.toFixed(2)}</span>
                    <span>Aposta: R$ ${multiple.betAmount.toFixed(2)}</span>
                    <span>Retorno: R$ ${multiple.status === 'won' ? multiple.potentialReturn.toFixed(2) : '0.00'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <small>${formatDate(multiple.createdAt)}</small>
                    <button onclick="deleteHistoryMultiple('${multiple.id}')" class="btn-delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="multiple-games">
                ${multiple.games.map(game => `
                    <div class="multiple-game ${game.result === true ? 'result-won' : 'result-lost'}">
                        <div>
                            <strong>${game.homeTeam} vs ${game.awayTeam}</strong><br>
                            <small>${getBetTypeLabel(game.betType)} - Odd: ${game.odds}</small>
                        </div>
                        <div>
                            <span class="btn btn-small ${game.result === true ? 'result-won' : 'result-lost'}">
                                ${game.result === true ? 'Ganhou' : 'Perdeu'}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Atualizar ações da múltipla
function updateMultipleActions() {
    if (selectedGames.length === 0) {
        multipleActions.style.display = 'none';
        return;
    }
    
    multipleActions.style.display = 'flex';
    selectedCount.textContent = selectedGames.length;
    totalOdds.textContent = calculateTotalOdds().toFixed(2);
}

// Salvar dados no localStorage
// Função para carregar todos os dados do Supabase
async function loadData() {
    try {
        // Carregar dados em paralelo
        const [pendingGamesData, activeMultiplesData, historyMultiplesData] = await Promise.all([
            loadPendingGames(),
            loadActiveMultiples(),
            loadHistoryMultiples()
        ]);

        pendingGames = pendingGamesData;
        activeMultiples = activeMultiplesData;
        historyMultiples = historyMultiplesData;

        updateDisplay();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showNotification('Erro ao carregar dados da aplicação!', 'error');
    }
}

// Função saveData não é mais necessária - cada operação salva diretamente no Supabase
function saveData() {
    // Esta função agora é apenas para compatibilidade
    // Os dados são salvos automaticamente nas operações específicas
}

// Mostrar notificação
function showNotification(message, type = 'info') {
    // Criar elemento de notificação
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Adicionar estilos se não existirem
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 10px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                display: flex;
                align-items: center;
                gap: 10px;
                animation: slideInRight 0.3s ease;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            }
            .notification-success { background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); }
            .notification-error { background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%); }
            .notification-info { background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%); }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Remover após 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Funções de proteção de autenticação
async function waitForAuthCheck() {
    // Aguardar até que as funções de autenticação estejam disponíveis
    while (typeof isUserLoggedIn !== 'function') {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Aguardar até que a verificação de autenticação seja concluída
    let attempts = 0;
    const maxAttempts = 50; // 5 segundos máximo
    
    while (attempts < maxAttempts) {
        try {
            const user = getCurrentUser();
            if (user !== undefined) {
                // Autenticação verificada, carregar dados se logado
                if (isUserLoggedIn()) {
                    await loadData();
                }
                return; // Sair da função independentemente do status de login
            }
        } catch (error) {
            // Ainda aguardando inicialização
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    // Se chegou aqui, a autenticação foi inicializada mas pode não estar logado
    // Não mostrar mensagem de erro automaticamente, apenas não carregar dados
    console.log('Autenticação inicializada, usuário não está logado');
}

function showAuthRequiredMessage() {
    // Limpar dados locais
    pendingGames = [];
    activeMultiples = [];
    historyMultiples = [];
    selectedGames = [];
    updateDisplay();
    
    // Mostrar mensagem informativa
    showNotification('Faça login para acessar suas apostas!', 'info');
}

// Função de verificação de autenticação simplificada
function requireAuth() {
    if (typeof isUserLoggedIn !== 'function') {
        console.error('Função isUserLoggedIn não está disponível');
        return false;
    }
    
    if (!isUserLoggedIn()) {
        console.log('Usuário não está logado');
        return false;
    }
    
    return true;
}