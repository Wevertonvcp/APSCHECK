// Funções para integração com Supabase
// Substitui as funções de localStorage por operações de banco de dados

// Função para salvar jogo pendente
async function savePendingGame(game) {
    try {
        const user = getCurrentUser();
        
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        // Primeiro, tentar com user_id (nova estrutura)
        const gameDataWithUserId = {
            id: game.id,
            user_id: user.id,
            home_team: game.homeTeam,
            away_team: game.awayTeam,
            bet_type: game.betType,
            odds: game.odds,
            game_date: game.gameDate,
            created_at: game.createdAt
        };

        let { data, error } = await window.supabaseClient
            .from('pending_games')
            .insert([gameDataWithUserId]);

        // Se der erro relacionado à coluna user_id, tentar sem ela (estrutura antiga)
        if (error && (error.message.includes('user_id') || error.message.includes('column') || error.message.includes('does not exist'))) {
            const gameDataWithoutUserId = {
                id: game.id,
                home_team: game.homeTeam,
                away_team: game.awayTeam,
                bet_type: game.betType,
                odds: game.odds,
                game_date: game.gameDate,
                created_at: game.createdAt
            };
            
            const result = await window.supabaseClient
                .from('pending_games')
                .insert([gameDataWithoutUserId]);
                
            data = result.data;
            error = result.error;
        }

        if (error) throw error;
        
        return data;
    } catch (error) {
        showNotification('Erro ao salvar jogo: ' + error.message, 'error');
        throw error;
    }
}

// Função para carregar jogos pendentes
async function loadPendingGames() {
    try {
        const user = getCurrentUser();
        if (!user) {
            return [];
        }

        const { data, error } = await window.supabaseClient
            .from('pending_games')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Converter para formato da aplicação
        return data.map(game => ({
            id: game.id,
            homeTeam: game.home_team,
            awayTeam: game.away_team,
            betType: game.bet_type,
            odds: game.odds,
            gameDate: game.game_date,
            createdAt: game.created_at
        }));
    } catch (error) {
        showNotification('Erro ao carregar jogos!', 'error');
        return [];
    }
}

// Função para remover jogo pendente
async function removePendingGameFromDB(gameId) {
    try {
        const { error } = await window.supabaseClient
            .from('pending_games')
            .delete()
            .eq('id', gameId);

        if (error) throw error;
    } catch (error) {
        showNotification('Erro ao remover jogo!', 'error');
        throw error;
    }
}

// Função para atualizar jogo pendente no banco
async function updatePendingGame(gameId, game) {
    try {
        const { data, error } = await window.supabaseClient
            .from('pending_games')
            .update({
                home_team: game.homeTeam,
                away_team: game.awayTeam,
                bet_type: game.betType,
                odds: game.odds,
                game_date: game.gameDate
            })
            .eq('id', gameId);

        if (error) throw error;
        return data;
    } catch (error) {
        showNotification('Erro ao atualizar jogo!', 'error');
        throw error;
    }
}

// Função para salvar múltipla
async function saveMultiple(multiple) {
    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        // Primeiro, salvar a múltipla
        const { data: multipleData, error: multipleError } = await window.supabaseClient
            .from('multiples')
            .insert([{
                id: multiple.id,
                user_id: user.id,
                bet_amount: multiple.betAmount,
                total_odds: multiple.totalOdds,
                potential_return: multiple.potentialReturn,
                status: multiple.status,
                created_at: multiple.createdAt
            }]);

        if (multipleError) throw multipleError;

        // Depois, salvar os jogos da múltipla
        const gamesData = multiple.games.map(game => ({
            multiple_id: multiple.id,
            game_id: game.id,
            home_team: game.homeTeam,
            away_team: game.awayTeam,
            bet_type: game.betType,
            odds: game.odds,
            game_date: game.gameDate,
            result: game.result,
            created_at: game.createdAt
        }));

        const { error: gamesError } = await window.supabaseClient
            .from('multiple_games')
            .insert(gamesData);

        if (gamesError) throw gamesError;

        return multipleData;
    } catch (error) {
        showNotification('Erro ao salvar múltipla!', 'error');
        throw error;
    }
}

// Função para carregar múltiplas ativas
async function loadActiveMultiples() {
    try {
        const user = getCurrentUser();
        if (!user) {
            return [];
        }

        const { data: multiples, error: multiplesError } = await window.supabaseClient
            .from('multiples')
            .select(`
                *,
                multiple_games (*)
            `)
            .eq('user_id', user.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false });

        if (multiplesError) throw multiplesError;

        // Converter para formato da aplicação
        return multiples.map(multiple => ({
            id: multiple.id,
            betAmount: multiple.bet_amount,
            totalOdds: multiple.total_odds,
            potentialReturn: multiple.potential_return,
            status: multiple.status,
            createdAt: multiple.created_at,
            games: multiple.multiple_games.map(game => ({
                id: game.game_id,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                betType: game.bet_type,
                odds: game.odds,
                gameDate: game.game_date,
                result: game.result,
                createdAt: game.created_at
            }))
        }));
    } catch (error) {
        showNotification('Erro ao carregar múltiplas ativas!', 'error');
        return [];
    }
}

// Função para carregar histórico de múltiplas
async function loadHistoryMultiples() {
    try {
        const user = getCurrentUser();
        if (!user) {
            return [];
        }

        const { data: multiples, error: multiplesError } = await window.supabaseClient
            .from('multiples')
            .select(`
                *,
                multiple_games (*)
            `)
            .eq('user_id', user.id)
            .in('status', ['won', 'lost'])
            .order('created_at', { ascending: false });

        if (multiplesError) throw multiplesError;

        // Converter para formato da aplicação
        return multiples.map(multiple => ({
            id: multiple.id,
            betAmount: multiple.bet_amount,
            totalOdds: multiple.total_odds,
            potentialReturn: multiple.potential_return,
            status: multiple.status,
            createdAt: multiple.created_at,
            games: multiple.multiple_games.map(game => ({
                id: game.game_id,
                homeTeam: game.home_team,
                awayTeam: game.away_team,
                betType: game.bet_type,
                odds: game.odds,
                gameDate: game.game_date,
                result: game.result,
                createdAt: game.created_at
            }))
        }));
    } catch (error) {
        showNotification('Erro ao carregar histórico!', 'error');
        return [];
    }
}

// Função para atualizar resultado do jogo em uma múltipla
async function updateMultipleGameResult(multipleId, gameId, result) {
    try {
        const { data, error } = await window.supabaseClient
            .from('multiple_games')
            .update({ result: result })
            .eq('multiple_id', multipleId)
            .eq('game_id', gameId);

        if (error) throw error;
        return data;
    } catch (error) {
        showNotification('Erro ao atualizar resultado!', 'error');
        throw error;
    }
}

// Função para atualizar status da múltipla
async function updateMultipleStatus(multipleId, status) {
    try {
        const { error } = await window.supabaseClient
            .from('multiples')
            .update({ status: status })
            .eq('id', multipleId);

        if (error) throw error;
    } catch (error) {
        showNotification('Erro ao atualizar múltipla!', 'error');
        throw error;
    }
}

// Função para remover múltipla do banco
async function removeMultiple(multipleId) {
    try {
        // Primeiro remover os jogos da múltipla
        await window.supabaseClient
            .from('multiple_games')
            .delete()
            .eq('multiple_id', multipleId);

        // Depois remover a múltipla
        const { data, error } = await window.supabaseClient
            .from('multiples')
            .delete()
            .eq('id', multipleId);

        if (error) throw error;
        return data;
    } catch (error) {
        showNotification('Erro ao remover múltipla!', 'error');
        throw error;
    }
}

// Função para limpar histórico
async function clearHistoryMultiples() {
    try {
        // Remover todas as múltiplas com status 'won' ou 'lost'
        const { data, error } = await window.supabaseClient
            .from('multiples')
            .delete()
            .in('status', ['won', 'lost']);

        if (error) throw error;
        return data;
    } catch (error) {
        showNotification('Erro ao limpar histórico!', 'error');
        throw error;
    }
}

// Função para atualizar status da múltipla
async function updateMultipleStatus(multipleId, status) {
    try {
        const { data, error } = await window.supabaseClient
            .from('multiples')
            .update({ status: status })
            .eq('id', multipleId);

        if (error) throw error;
        return data;
    } catch (error) {
        showNotification('Erro ao atualizar status!', 'error');
        throw error;
    }
}

// Função para remover jogo pendente do banco
async function removePendingGameFromDB(gameId) {
    try {
        const { data, error } = await window.supabaseClient
            .from('pending_games')
            .delete()
            .eq('id', gameId);

        if (error) throw error;
        return data;
    } catch (error) {
        showNotification('Erro ao remover jogo!', 'error');
        throw error;
    }
}

// ==================== FUNÇÕES PARA TIPOS DE APOSTA ====================

// Carregar todos os tipos de aposta do banco de dados
async function loadBetTypesFromDB() {
    try {
        const { data, error } = await window.supabaseClient
            .from('bet_types')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        
        return data || [];
    } catch (error) {
        // Retornar array vazio em caso de erro para não quebrar a aplicação
        return [];
    }
}

// Salvar novo tipo de aposta no banco de dados
async function saveBetTypeToDB(key, label) {
    try {
        const user = getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        const betTypeData = {
            key: key,
            label: label,
            created_by: user.id
        };

        const { data, error } = await window.supabaseClient
            .from('bet_types')
            .insert([betTypeData])
            .select();

        if (error) throw error;
        
        return data[0];
    } catch (error) {
        throw error;
    }
}

// Remover tipo de aposta do banco de dados
async function removeBetTypeFromDB(key) {
    try {
        const { error } = await window.supabaseClient
            .from('bet_types')
            .delete()
            .eq('key', key);

        if (error) throw error;
        
        return true;
    } catch (error) {
        throw error;
    }
}

// Verificar se um tipo de aposta existe no banco
async function betTypeExistsInDB(key) {
    try {
        const { data, error } = await window.supabaseClient
            .from('bet_types')
            .select('key')
            .eq('key', key)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
        
        return !!data;
    } catch (error) {
        return false;
    }
}