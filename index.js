// --- Configuration Keys ---
const BUDGET_KEY = 'budgetApp_daily_budget';
const CURRENT_EXPENSES_KEY = 'budgetApp_current_expenses';
const DAILY_RECORDS_KEY = 'budgetApp_daily_history';
const CURRENT_CYCLE_DATE_KEY = 'budgetApp_current_cycle_date'; 

// --- Global State Variables ---
let budget = 0;
let currentExpenses = [];
let dailyRecords = []; 
let expenses = 0; 
let balance = 0; 
let currentView = 'current'; 
let currentCycleDate = new Date().toISOString().split('T')[0]; 

// --- DOM Elements ---
const appContainer = document.getElementById('app-container');

// --- Helper Functions ---

/**
 * Formats a number as Philippine Peso (PHP) currency.
 */
const formatCurrency = (amount) => {
    const absoluteAmount = Math.abs(amount);
    return new Intl.NumberFormat('fil-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2
    }).format(absoluteAmount);
};

/**
 * Generates a simple unique ID for local storage transactions.
 */
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 6);

/**
 * Loads data from localStorage.
 */
const loadData = () => {
     budget = parseFloat(localStorage.getItem(BUDGET_KEY) || 0);
     currentCycleDate = localStorage.getItem(CURRENT_CYCLE_DATE_KEY) || new Date().toISOString().split('T')[0];
     
     const loadArray = (key) => {
         try {
             const rawData = JSON.parse(localStorage.getItem(key) || '[]');
             return rawData.map(t => ({
                 ...t,
                 amount: parseFloat(t.amount),
                 startingBudget: t.startingBudget !== undefined ? parseFloat(t.startingBudget) : undefined,
                 endingBalance: t.endingBalance !== undefined ? parseFloat(t.endingBalance) : undefined,
                 totalExpenses: t.totalExpenses !== undefined ? parseFloat(t.totalExpenses) : undefined,
                 createdAt: t.createdAt || new Date().toISOString()
             }));
         } catch (e) {
             console.error(`Error loading data for key ${key}:`, e);
             return [];
         }
     };
     
     currentExpenses = loadArray(CURRENT_EXPENSES_KEY);
     dailyRecords = loadArray(DAILY_RECORDS_KEY);
};

/**
 * Saves all current state data to localStorage.
 */
const saveData = () => {
    localStorage.setItem(BUDGET_KEY, budget.toString());
    localStorage.setItem(CURRENT_CYCLE_DATE_KEY, currentCycleDate);

    const sortedCurrent = currentExpenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    localStorage.setItem(CURRENT_EXPENSES_KEY, JSON.stringify(sortedCurrent));
    
    const sortedRecords = dailyRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem(DAILY_RECORDS_KEY, JSON.stringify(sortedRecords));
};

/**
 * Calculates total expenses for the current cycle.
 */
const calculateTotals = () => {
    expenses = currentExpenses.reduce((sum, t) => sum + t.amount, 0);
    balance = budget - expenses;
    return { expenses, balance };
};

const saveBudget = () => {
    const input = document.getElementById('new-budget-input');
    const newBudget = parseFloat(input.value);

    if (isNaN(newBudget) || newBudget < 0) {
        alert("Please enter a valid non-negative number for the budget.");
        return;
    }

    budget = newBudget;
    renderApp();
};

const addExpense = (event) => {
    event.preventDefault();
    
    const descriptionInput = document.getElementById('expense-description-input');
    const amountInput = document.getElementById('expense-amount-input');

    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);

    if (!description || isNaN(amount) || amount <= 0) {
        alert("Please enter a valid description and a positive amount.");
        return;
    }

    const newExpense = {
        id: generateId(),
        description: description,
        amount: amount,
        date: currentCycleDate,
        createdAt: new Date().toISOString()
    };

    currentExpenses.unshift(newExpense);
    
    descriptionInput.value = '';
    amountInput.value = '';

    renderApp();
};

const deleteExpense = (id) => {
    if (!confirm("Are you sure you want to delete this expense?")) {
        return;
    }
    currentExpenses = currentExpenses.filter(t => t.id !== id);
    renderApp();
};

const finalizeDay = () => {
    if (budget === 0 && currentExpenses.length === 0) {
        const container = document.getElementById('finalize-status');
        if(container) {
            container.innerHTML = '<p style="color: var(--primary-orange); font-weight: 600;">Error: Please set a budget or log an expense.</p>';
            setTimeout(() => container.innerHTML = '', 3000);
        }
        return;
    }
    
    if (!confirm(`Finalize cycle for ${new Date(currentCycleDate).toLocaleDateString()}? This archives all current data.`)) {
        return;
    }

    const { expenses: finalExpenses, balance: finalBalance } = calculateTotals();

    const newRecord = {
        id: generateId(),
        date: currentCycleDate,
        startingBudget: budget,
        endingBalance: finalBalance,
        totalExpenses: finalExpenses,
        transactions: [...currentExpenses]
    };

    dailyRecords.unshift(newRecord); 

    budget = 0;
    currentExpenses = [];
    
    const nextDay = new Date(currentCycleDate);
    nextDay.setDate(nextDay.getDate() + 1);
    currentCycleDate = nextDay.toISOString().split('T')[0];
    
    renderApp();
    renderBudgetSetter(true);
    
    const container = document.getElementById('finalize-status');
    if(container) {
         container.innerHTML = '<p style="color: var(--success-complement); font-weight: 600;">✅ Cycle Finalized! Set your new budget.</p>';
         setTimeout(() => container.innerHTML = '', 4000);
    }
};


// --- UI Rendering ---

/**
 * Renders the SVG Pie/Donut Chart.
 */
const renderBudgetVisualization = () => {
    if (budget <= 0) {
        const radius = 40;
        const strokeWidth = 20;

        return `
            <div style="display: flex; flex-direction: column; align-items: center; padding: 16px; width: 100%;">
                <svg viewBox="0 0 100 100" width="120" height="120" style="transform: rotate(-90deg);">
                    <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="var(--olive-tint)" stroke-width="${strokeWidth}"/>
                    <g transform="rotate(90 50 50)">
                        <text x="50" y="45" text-anchor="middle" dominant-baseline="middle" style="font-size: 7px; font-weight: bold; fill: var(--light-text); opacity: 0.6;">
                            ₱0.00
                        </text>
                        <text x="50" y="55" text-anchor="middle" dominant-baseline="middle" style="font-size: 5px; font-weight: 600; fill: var(--light-text); opacity: 0.6;">
                            BUDGET
                        </text>
                    </g>
                </svg>
                <p style="margin-top: 16px; text-align: center; font-size: 0.875rem; font-weight: 600; color: var(--light-text); opacity: 0.7;">
                    Set your budget to start tracking.
                </p>
            </div>
        `;
    }

    const isOver = expenses > budget;
    const spentPercentage = budget > 0 ? (expenses / budget) * 100 : 0;
    const normalizedSpent = Math.min(100, spentPercentage); 

    const radius = 40; 
    const strokeWidth = 20; 

    const circumference = 2 * Math.PI * radius;
    const spentStroke = (normalizedSpent / 100) * circumference;
    
    const spentColorHex = 'var(--primary-orange)'; 
    const remainingColorHex = 'var(--success-complement)'; 

    const centerText = isOver ? 'OVER BUDGET' : `${Math.round(spentPercentage)}% SPENT`;
    const bottomText = isOver 
        ? `- ${formatCurrency(balance)} Over` 
        : `${formatCurrency(balance)} Remaining`;
    
    const centerTextColor = isOver ? 'var(--primary-orange)' : 'var(--light-text)';
    const bottomTextColor = isOver ? 'var(--primary-orange)' : 'var(--success-complement)';


    const svgMarkup = `
        <svg viewBox="0 0 100 100" width="100%" height="auto" style="max-height: 200px; transform: rotate(-90deg); flex-shrink: 0;">
            
            <circle cx="50" cy="50" r="${radius}" fill="transparent" 
                    stroke="${isOver ? 'var(--olive-tint)' : remainingColorHex}" 
                    stroke-width="${strokeWidth}" />
            
            <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="${spentColorHex}" stroke-width="${strokeWidth}"
                    stroke-dasharray="${spentStroke} ${circumference}" stroke-dashoffset="0" stroke-linecap="butt" />

            <g transform="rotate(90 50 50)">
                <text x="50" y="48" text-anchor="middle" dominant-baseline="middle" 
                      style="font-size: 7px; font-weight: bold; fill: ${centerTextColor};">
                    ${centerText}
                </text>
                <text x="50" y="58" text-anchor="middle" dominant-baseline="middle" 
                      style="font-size: 6px; font-weight: 600; fill: var(--light-text); opacity: 0.7;">
                    ${formatCurrency(expenses)} / ${formatCurrency(budget)}
                </text>
            </g>
        </svg>
    `;

    return `
        <div style="display: flex; flex-direction: column; align-items: center; width: 100%;">
            ${svgMarkup}
            <p style="padding-top: 8px; text-align: center; font-size: 1rem; font-weight: 700; color: ${bottomTextColor};">
                ${bottomText}
            </p>
        </div>
    `;
};

/**
 * Main render function to update the entire application UI structure.
 */
const renderApp = () => {
    calculateTotals(); 
    const isOverBudget = balance < 0;
    const remainingCardClasses = isOverBudget ? 'remaining-red' : 'remaining-green';

    appContainer.innerHTML = `
        <h1 class="app-header">
            <span style="font-size: 2rem; margin-right: 8px; font-weight: bold;"></span>
            Budget-Tracker Dashboard (PHP)
        </h1>
        
        <section id="summary-section" class="card">
            <div id="visualization-container">
                ${renderBudgetVisualization()}
            </div>
            <div id="summary-grid">
                <div class="summary-item ${remainingCardClasses}">
                    <h2>REMAINING BALANCE</h2>
                    <p id="remaining-budget-display">
                        ${isOverBudget ? '-' : ''}${formatCurrency(balance)}
                    </p>
                </div>
                <div class="summary-item budget-item">
                    <h2>DAILY BUDGET</h2>
                    <p id="total-budget-display">
                        ${formatCurrency(budget)}
                    </p>
                </div>
                <div class="summary-item expense-item">
                    <h2>TOTAL EXPENSES</h2>
                    <p id="total-expenses-display">
                        ${formatCurrency(expenses)}
                    </p>
                </div>
            </div>
        </section>

        <div id="tab-bar">
            <button id="tab-current-btn" class="tab-btn ${currentView === 'current' ? 'active' : ''}">
                <span style="margin-right: 8px;">🏠</span> Active Dashboard
            </button>
            <button id="tab-history-btn" class="tab-btn ${currentView === 'history' ? 'active' : ''}">
                <span style="margin-right: 8px;">📚</span> Daily History (${dailyRecords.length} Days)
            </button>
        </div>

        <div id="view-content-container">
        </div>
    `;

    // --- 2. Attach Dynamic Renderers/Listeners ---
    attachViewEventListeners();
    renderActiveView(); 
    saveData(); 
};

const attachViewEventListeners = () => {
    document.getElementById('tab-current-btn').addEventListener('click', () => switchToView('current'));
    document.getElementById('tab-history-btn').addEventListener('click', () => switchToView('history'));
};

const switchToView = (view) => {
    if (currentView !== view) {
        currentView = view;
        renderApp();
    }
};

const renderActiveView = () => {
    const container = document.getElementById('view-content-container');
    if (!container) return;

    container.innerHTML = ''; 

    if (currentView === 'current') {
        container.innerHTML = renderCurrentDayManager();
        
        // Attach logic
        document.getElementById('set-cycle-date-btn').addEventListener('click', setCycleDate);
        renderBudgetSetter(budget === 0);
        document.getElementById('add-expense-form').addEventListener('submit', addExpense);
        document.getElementById('finalize-day-btn').addEventListener('click', finalizeDay);
        renderExpenseHistory();

    } else {
        container.innerHTML = renderDailyHistory();
    }
};

const setCycleDate = () => {
    const input = document.getElementById('cycle-date-input');
    const newDate = input.value;
    
    if (!newDate) return;

    if (newDate !== currentCycleDate) {
        currentCycleDate = newDate;
        renderApp();
    }
};


// --- Current Day Dashboard Components ---

const renderCurrentDayManager = () => {
    const today = new Date().toISOString().split('T')[0];
    const displayDate = new Date(currentCycleDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
    
    return `
        <div id="current-dashboard-grid">
            
            <div id="dashboard-main-column">
                
                <section class="card" id="add-expense-card">
                    <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid var(--olive-tint); padding-bottom: 8px;">
                        ✍️ Log New Expense
                    </h2>
                    <form id="add-expense-form" style="display: grid; grid-template-columns: 2fr 1fr; gap: 16px;">
                        <input type="text" id="expense-description-input" placeholder="Expense Description (e.g., Coffee, Grab)" required />
                        <input type="number" id="expense-amount-input" placeholder="Amount (150.75)"
                            min="0.01" step="0.01" required />
                        
                        <button type="submit" class="btn btn-primary" style="grid-column: span 2;" ${budget === 0 ? 'disabled' : ''} title="${budget === 0 ? 'Set a budget first!' : 'Log Expense'}">
                            Log Expense for ${new Date(currentCycleDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </button>
                        ${budget === 0 ? '<p style="grid-column: span 2; color:var(--primary-orange); text-align:center; font-weight:600;">⚠️ Set your budget in the sidebar!</p>' : ''}
                    </form>
                </section>

                <section class="card" id="expense-history-card" style="flex-grow: 1;">
                    <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid var(--olive-tint); padding-bottom: 8px;">
                        🧾 Transaction History
                    </h2>
                    <div id="history-list-container" style="max-height: 400px; overflow-y: auto;">
                    </div>
                </section>
            </div>

            
            <div id="dashboard-actions-column">
                
                <section id="budget-setter-card" class="card"></section>

                <section class="card" id="date-setter-card">
                    <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 12px; color: var(--primary-orange);">
                        Cycle Date: ${displayDate}
                    </h2>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="date" id="cycle-date-input" value="${currentCycleDate}" max="${today}" style="flex-grow: 1;" required />
                        <button id="set-cycle-date-btn" class="btn btn-success" style="padding: 12px 16px; flex-shrink: 0;">
                            Set
                        </button>
                    </div>
                    <p style="margin-top: 10px; font-size: 0.85rem; color: var(--light-text); opacity: 0.6;">
                        Records will be attributed to this date.
                    </p>
                </section>

                <section class="card" id="finalize-card" style="background-color: var(--olive-tint);">
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--primary-orange); margin-bottom: 16px;">
                        Archive Cycle
                    </h2>
                    <p style="font-size: 0.9rem; color: var(--light-text); margin-bottom: 12px;">
                        Finalize and archive the current budget cycle and expenses.
                    </p>
                    <button id="finalize-day-btn" class="btn btn-primary" style="width: 100%;">
                        Finalize & Start New Day
                    </button>
                    <div id="finalize-status" style="margin-top: 10px; text-align: center;"></div>
                </section>

            </div>
        </div>
    `;
};

const renderBudgetSetter = (isEditing = false) => {
    const container = document.getElementById('budget-setter-card');
    if (!container) return;
    
    const currentBudgetDisplay = formatCurrency(budget);

    if (isEditing) {
        container.innerHTML = `
            <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 16px; border-bottom: 1px solid var(--olive-tint); padding-bottom: 8px;">
                Set/Update Daily Budget
            </h2>
            <div style="display: flex; gap: 8px;">
                <input type="number" id="new-budget-input" placeholder="Enter New Budget Amount" value="${budget.toFixed(2)}"
                    min="0" step="0.01" style="flex-grow: 1;" required />
                <button id="save-budget-btn" class="btn btn-success">Save</button>
            </div>
        `;
        document.getElementById('save-budget-btn').addEventListener('click', saveBudget);
    } else {
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h2 style="font-size: 0.9rem; opacity:0.7; margin-bottom:4px;">Current Daily Budget</h2>
                    <div style="font-size: 1.5rem; font-weight:bold; color:var(--primary-orange);">${currentBudgetDisplay}</div>
                </div>
                <button id="edit-budget-btn" class="btn btn-primary">Edit</button>
            </div>
        `;
        document.getElementById('edit-budget-btn').addEventListener('click', () => renderBudgetSetter(true));
    }
};

const renderExpenseHistory = () => {
    const container = document.getElementById('history-list-container');
    if (!container) return;

    if (currentExpenses.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: var(--subtle-gray); opacity: 0.7;">
                <p>No expenses logged for this cycle yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = currentExpenses.map(item => `
        <div class="transaction-item">
            <div class="transaction-item-details">
                <strong>${item.description}</strong>
                <small>${new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</small>
            </div>
            <div class="transaction-amount-actions" style="display:flex; align-items:center; gap:12px;">
                <span>- ${formatCurrency(item.amount)}</span>
                <button class="delete-btn" onclick="deleteExpense('${item.id}')" title="Delete Entry">🗑️</button>
            </div>
        </div>
    `).join('');
};

const renderDailyHistory = () => {
    if (dailyRecords.length === 0) {
        return `
            <div class="card" style="text-align: center; padding: 40px;">
                <h3 style="color: var(--light-text);">No History Records Found</h3>
                <p style="opacity: 0.7;">Finalize a day to see it appear in your history.</p>
            </div>
        `;
    }

    return `
        <div class="card" id="history-archive-card">
            ${dailyRecords.map(record => {
                const isOverspent = record.endingBalance < 0;
                return `
                <div class="history-record ${isOverspent ? 'overspent' : ''}">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <h3 style="margin:0; font-size:1.1rem;">📅 ${new Date(record.date).toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</h3>
                        <span style="font-weight:bold; color:${isOverspent ? 'var(--primary-orange)' : 'var(--success-complement)'};">
                             ${isOverspent ? 'Overspent' : 'Saved'}
                        </span>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; font-size:0.9rem; margin-bottom:12px;">
                        <div>Budget: <strong>${formatCurrency(record.startingBudget)}</strong></div>
                        <div>Expenses: <strong>${formatCurrency(record.totalExpenses)}</strong></div>
                        <div>Balance: <strong>${formatCurrency(record.endingBalance)}</strong></div>
                    </div>
                    <details>
                        <summary style="cursor:pointer; color:var(--primary-orange); font-size:0.85rem; font-weight:600;">View ${record.transactions.length} Transactions</summary>
                        <div style="margin-top:12px; background:rgba(0,0,0,0.2); padding:8px; border-radius:8px;">
                            ${record.transactions.map(t => `
                                <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.1); font-size:0.85rem;">
                                    <span>${t.description}</span>
                                    <span>${formatCurrency(t.amount)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </details>
                </div>
                `;
            }).join('')}
        </div>
    `;
};

// --- Initialization ---
loadData();
renderApp();