// script.js

// =====================================================
// CONFIGURATION
// =====================================================

// Remplacez par l'URL de votre API déployée
const API_BASE_URL = 'https://banque-api-45tc.onrender.com';

// =====================================================
// ÉTAT DE L'APPLICATION
// =====================================================

let accounts = [];
let selectedAccountId = null;

// =====================================================
// FONCTIONS UTILITAIRES
// =====================================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XAF',
        minimumFractionDigits: 0
    }).format(amount);
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

function openModal(name) {
    document.getElementById(`modal-${name}`).classList.remove('hidden');
}

function closeModal(name) {
    document.getElementById(`modal-${name}`).classList.add('hidden');
}

function getAccountName(account) {
    return `${account.clientName} - ${account.accountNumber} (${formatCurrency(account.balance)})`;
}

// =====================================================
// API APPELS
// =====================================================

async function apiRequest(endpoint, method = 'GET', body = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const data = await response.json();
        return { ok: response.ok, data, status: response.status };
    } catch (error) {
        console.error('Erreur API:', error);
        showToast('❌ Erreur de communication avec le serveur', 'error');
        return { ok: false, data: null, status: 500 };
    }
}

// =====================================================
// CHARGEMENT DES DONNÉES
// =====================================================

async function loadAccounts() {
    const type = document.getElementById('filterType').value;
    const status = document.getElementById('filterStatus').value;
    let url = '/api/accounts';
    const params = [];
    if (type) params.push(`type=${type}`);
    if (status) params.push(`status=${status}`);
    if (params.length) url += '?' + params.join('&');

    const result = await apiRequest(url);
    if (result.ok) {
        accounts = result.data.data || [];
        renderAccounts();
        updateStats();
        populateSelects();
    } else {
        showToast('❌ Erreur lors du chargement des comptes', 'error');
    }
}

async function loadAccountDetails(accountId) {
    const result = await apiRequest(`/api/accounts/${accountId}`);
    if (result.ok) {
        return result.data.data;
    }
    return null;
}

// =====================================================
// RENDU
// =====================================================

function renderAccounts() {
    const container = document.getElementById('accountsList');
    if (accounts.length === 0) {
        container.innerHTML = `
            <div class="p-12 text-center text-gray-500">
                <i class="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                <p>Aucun compte trouvé</p>
                <button onclick="openModal('createAccount')" class="mt-3 text-blue-600 hover:underline">
                    Créer votre premier compte
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = accounts.map(account => `
        <div class="p-6 hover:bg-gray-50 transition-colors card-hover">
            <div class="flex flex-wrap items-start justify-between gap-4">
                <div class="flex-1 min-w-[200px]">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-full ${account.type === 'courant' ? 'bg-blue-100' : 'bg-purple-100'} flex items-center justify-center">
                            <i class="fas ${account.type === 'courant' ? 'fa-building text-blue-600' : 'fa-piggy-bank text-purple-600'}"></i>
                        </div>
                        <div>
                            <h4 class="font-semibold text-gray-800">${account.clientName}</h4>
                            <div class="flex items-center gap-2 text-sm text-gray-500">
                                <span>${account.accountNumber}</span>
                                <span class="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span class="capitalize">${account.type}</span>
                                <span class="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span class="${account.status === 'active' ? 'text-green-600' : 'text-red-600'}">
                                    ${account.status === 'active' ? '✓ Actif' : '✗ Inactif'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-4">
                    <div class="text-right">
                        <p class="text-sm text-gray-500">Solde</p>
                        <p class="text-xl font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}">
                            ${formatCurrency(account.balance)}
                        </p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="showAccountActions('${account.id}')" 
                                class="bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Actions rapides -->
            <div id="actions-${account.id}" class="mt-4 hidden flex-wrap gap-2 border-t border-gray-100 pt-4">
                <button onclick="openDeposit('${account.id}')" 
                        class="bg-green-50 text-green-600 hover:bg-green-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <i class="fas fa-arrow-down"></i> Dépôt
                </button>
                <button onclick="openWithdraw('${account.id}')" 
                        class="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <i class="fas fa-arrow-up"></i> Retrait
                </button>
                <button onclick="openTransfer('${account.id}')" 
                        class="bg-purple-50 text-purple-600 hover:bg-purple-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <i class="fas fa-exchange-alt"></i> Virement
                </button>
                <button onclick="viewHistory('${account.id}')" 
                        class="bg-gray-50 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <i class="fas fa-history"></i> Historique
                </button>
                <button onclick="deactivateAccount('${account.id}')" 
                        class="bg-red-50 text-red-500 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <i class="fas fa-ban"></i> Désactiver
                </button>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    document.getElementById('totalAccounts').textContent = accounts.length;
    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
    document.getElementById('totalBalance').textContent = formatCurrency(totalBalance);
    const activeCount = accounts.filter(a => a.status === 'active').length;
    document.getElementById('activeAccounts').textContent = activeCount;
    document.getElementById('totalTransactions').textContent = '—';
}

function populateSelects() {
    // Pour les modals, on remplit les selects avec les comptes actifs
    const activeAccounts = accounts.filter(a => a.status === 'active');
    const selects = ['depositAccount', 'withdrawAccount', 'transferFrom', 'transferTo'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        const currentValue = select.value;
        select.innerHTML = activeAccounts.map(a => `
            <option value="${a.id}">${getAccountName(a)}</option>
        `).join('');
        if (currentValue) select.value = currentValue;
    });
}

function showAccountActions(accountId) {
    const container = document.getElementById(`actions-${accountId}`);
    if (container) {
        container.classList.toggle('hidden');
    }
}

// =====================================================
// CRÉATION DE COMPTE
// =====================================================

async function createAccount(event) {
    event.preventDefault();
    const name = document.getElementById('createName').value.trim();
    const email = document.getElementById('createEmail').value.trim();
    const type = document.getElementById('createType').value;
    const deposit = parseFloat(document.getElementById('createDeposit').value) || 0;

    const result = await apiRequest('/api/accounts', 'POST', {
        clientName: name,
        clientEmail: email,
        type,
        initialDeposit: deposit,
        currency: 'XAF'
    });

    if (result.ok) {
        showToast(`✅ Compte créé avec succès ! (${result.data.data.accountNumber})`, 'success');
        closeModal('createAccount');
        document.getElementById('createAccountForm').reset();
        loadAccounts();
    } else {
        showToast(`❌ Erreur: ${result.data.error || 'Création échouée'}`, 'error');
    }
}

// =====================================================
// DÉPÔT
// =====================================================

function openDeposit(accountId) {
    openModal('deposit');
    populateSelects();
    if (accountId) document.getElementById('depositAccount').value = accountId;
}

async function executeDeposit(event) {
    event.preventDefault();
    const accountId = document.getElementById('depositAccount').value;
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const description = document.getElementById('depositDesc').value || 'Dépôt';

    if (!accountId) {
        showToast('❌ Veuillez sélectionner un compte', 'error');
        return;
    }

    const result = await apiRequest('/api/deposit', 'POST', {
        accountId,
        amount,
        description
    });

    if (result.ok) {
        showToast(`✅ Dépôt de ${formatCurrency(amount)} effectué !`, 'success');
        closeModal('deposit');
        document.getElementById('depositForm').reset();
        loadAccounts();
    } else {
        showToast(`❌ Erreur: ${result.data.error || 'Dépôt échoué'}`, 'error');
    }
}

// =====================================================
// RETRAIT
// =====================================================

function openWithdraw(accountId) {
    openModal('withdraw');
    populateSelects();
    if (accountId) document.getElementById('withdrawAccount').value = accountId;
}

async function executeWithdraw(event) {
    event.preventDefault();
    const accountId = document.getElementById('withdrawAccount').value;
    const amount = parseFloat(document.getElementById('withdrawAmount').value);
    const description = document.getElementById('withdrawDesc').value || 'Retrait';

    if (!accountId) {
        showToast('❌ Veuillez sélectionner un compte', 'error');
        return;
    }

    const result = await apiRequest('/api/withdraw', 'POST', {
        accountId,
        amount,
        description
    });

    if (result.ok) {
        showToast(`✅ Retrait de ${formatCurrency(amount)} effectué !`, 'success');
        closeModal('withdraw');
        document.getElementById('withdrawForm').reset();
        loadAccounts();
    } else {
        showToast(`❌ Erreur: ${result.data.error || 'Retrait échoué'}`, 'error');
    }
}

// =====================================================
// VIREMENT
// =====================================================

function openTransfer(accountId) {
    openModal('transfer');
    populateSelects();
    if (accountId) {
        document.getElementById('transferFrom').value = accountId;
        // On ne peut pas virer vers le même compte
        const toSelect = document.getElementById('transferTo');
        const options = toSelect.querySelectorAll('option');
        options.forEach(opt => {
            if (opt.value === accountId) opt.disabled = true;
        });
    }
}

async function executeTransfer(event) {
    event.preventDefault();
    const fromId = document.getElementById('transferFrom').value;
    const toId = document.getElementById('transferTo').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const description = document.getElementById('transferDesc').value || 'Virement';

    if (!fromId || !toId) {
        showToast('❌ Veuillez sélectionner les deux comptes', 'error');
        return;
    }

    if (fromId === toId) {
        showToast('❌ Impossible de virer vers le même compte', 'error');
        return;
    }

    const result = await apiRequest('/api/transfer', 'POST', {
        fromAccountId: fromId,
        toAccountId: toId,
        amount,
        description
    });

    if (result.ok) {
        showToast(`✅ Virement de ${formatCurrency(amount)} effectué !`, 'success');
        closeModal('transfer');
        document.getElementById('transferForm').reset();
        loadAccounts();
    } else {
        showToast(`❌ Erreur: ${result.data.error || 'Virement échoué'}`, 'error');
    }
}

// =====================================================
// HISTORIQUE
// =====================================================

async function viewHistory(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) {
        showToast('❌ Compte non trouvé', 'error');
        return;
    }

    const result = await apiRequest(`/api/accounts/${accountId}/history?limit=50`);
    if (!result.ok) {
        showToast('❌ Erreur lors du chargement de l\'historique', 'error');
        return;
    }

    const transactions = result.data.data || [];
    const transactionHtml = transactions.length === 0 ? 
        '<p class="text-gray-500 text-center py-4">Aucune transaction</p>' :
        transactions.map(t => `
            <div class="flex justify-between items-center py-3 border-b border-gray-100">
                <div>
                    <p class="font-medium text-gray-800">${t.type === 'depot' ? '💰 Dépôt' : t.type === 'retrait' ? '🏦 Retrait' : '🔄 Virement'}</p>
                    <p class="text-sm text-gray-500">${t.description || '—'}</p>
                    <p class="text-xs text-gray-400">${new Date(t.date).toLocaleString('fr-FR')}</p>
                </div>
                <span class="font-semibold ${t.type === 'depot' ? 'text-green-600' : t.type === 'retrait' ? 'text-red-600' : 'text-purple-600'}">
                    ${t.type === 'depot' ? '+' : t.type === 'retrait' ? '-' : ''} ${formatCurrency(t.amount)}
                </span>
            </div>
        `).join('');

    // Afficher un modal d'historique
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 modal-overlay flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto fade-in">
            <div class="flex justify-between items-center mb-6 sticky top-0 bg-white pb-4 border-b border-gray-100">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">
                        <i class="fas fa-history text-blue-600 mr-2"></i>
                        Historique
                    </h3>
                    <p class="text-sm text-gray-500">${account.clientName} - ${account.accountNumber}</p>
                </div>
                <button onclick="this.closest('.modal-overlay').remove()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div>
                ${transactionHtml}
            </div>
            <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                <span class="text-sm text-gray-500">Total: ${transactions.length} transactions</span>
                <span class="font-bold">Solde: ${formatCurrency(account.balance)}</span>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// =====================================================
// DÉSACTIVATION DE COMPTE
// =====================================================

async function deactivateAccount(accountId) {
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;

    if (account.balance > 0) {
        showToast('❌ Impossible de désactiver un compte avec solde positif', 'error');
        return;
    }

    if (!confirm(`Désactiver le compte de ${account.clientName} ?`)) return;

    const result = await apiRequest(`/api/accounts/${accountId}`, 'DELETE');
    if (result.ok) {
        showToast(`✅ Compte désactivé avec succès`, 'success');
        loadAccounts();
    } else {
        showToast(`❌ Erreur: ${result.data.error || 'Désactivation échouée'}`, 'error');
    }
}

// =====================================================
// RAFRAÎCHISSEMENT
// =====================================================

function refreshData() {
    showToast('🔄 Rafraîchissement des données...', 'info');
    loadAccounts();
}

// =====================================================
// INITIALISATION
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    loadAccounts();

    // Fermeture des modals par clic sur l'overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
            }
        });
    });

    // Remplir les selects quand les modals s'ouvrent
    document.querySelectorAll('[id^="modal-"]').forEach(modal => {
        const observer = new MutationObserver(() => {
            if (!modal.classList.contains('hidden')) {
                populateSelects();
            }
        });
        observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    });
});