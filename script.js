// ==========================================
// ▼ 設定と価格マスター
// ==========================================
const CONFIG = {
    PAPER_SURCHARGE: 1650, 
    DATA_FEES: { none: 0, pdf: 5000, ai: 15000, ai_edit: 30000 },
    LOCAL_DISCOUNT_RATE: 0.8,  // 20%OFF
    ONLINE_DISCOUNT_RATE: 0.9  // 10%OFF
};

const DESIGN_PRICE = {
    A2: 30000, A1: 40000,
    B3: 25000, B2: 35000
};

const PRINT_PRICE = {
    A2: { 10: 12540, 50: 13340, 100: 14320, 300: 15590, 3000: 39950 },
    A1: { 10: 12410, 50: 13820, 100: 15590, 300: 17770, 3000: 60160 },
    B3: { 10: 14460, 50: 15060, 100: 15800, 300: 16790, 3000: 35210 },
    B2: { 10: 11840, 50: 12890, 100: 14220, 300: 15890, 3000: 47700 }
};

// ==========================================
// ▼ 状態管理と計算ロジック
// ==========================================
let state = {
    serviceType: 'design_print',
    size: 'A2', 
    paper: 'coat', 
    qty: 10,       
    dataDelivery: 'none',
    isLocalDiscount: false,
    isOnlineDiscount: false
};

let currentDisplayPrice = 0;
let animationId = null;

function updateState(key, val) {
    state[key] = val;
    
    // 特殊なUI連動処理
    if (key === 'serviceType') {
        const printWrapper = document.getElementById('print-options-wrapper');
        const dataSelect = document.getElementById('data-delivery');
        if (val === 'design_only') {
            printWrapper.classList.add('disabled-section');
            if (state.dataDelivery === 'none') {
                dataSelect.value = 'pdf';
                state.dataDelivery = 'pdf';
            }
            dataSelect.options[0].disabled = true;
        } else {
            printWrapper.classList.remove('disabled-section');
            dataSelect.options[0].disabled = false;
        }
    }
    
    if (key === 'size' && state.qty > 3000) {
        state.qty = 3000;
        updateQtyUI();
    }
    
    updateButtonActiveStates();
    calculate();
}

function updateButtonActiveStates() {
    const sizeBtns = document.getElementById('size-selector').querySelectorAll('.select-btn');
    sizeBtns.forEach(b => b.classList.toggle('active', b.innerText === state.size));
    
    const paperMap = { 'coat': 'コート紙', 'matte': 'マットコート紙', 'fine': '上質紙' };
    const paperBtns = document.getElementById('paper-selector').querySelectorAll('.select-btn');
    paperBtns.forEach(b => b.classList.toggle('active', b.innerText === paperMap[state.paper]));
}

function stepQuantity(direction) {
    let step = state.qty >= 100 ? 100 : 10;
    let next = state.qty + (direction * step);
    
    if (next < 10) next = 10;
    if (next > 3000) next = 3000;

    state.qty = next;
    updateQtyUI();
    calculate();
}

function updateQtyUI() {
    document.getElementById('qty-val').innerText = `${state.qty.toLocaleString()}部`;
}

function interpolate(table, qty) {
    const points = Object.keys(table).map(Number).sort((a, b) => a - b);
    if (table[qty]) return table[qty];
    if (qty <= points[0]) return table[points[0]];
    if (qty >= points[points.length - 1]) return table[points[points.length - 1]];

    let lower = points[0], upper = points[points.length - 1];
    for (let i = 0; i < points.length - 1; i++) {
        if (qty > points[i] && qty < points[i+1]) {
            lower = points[i];
            upper = points[i+1];
            break;
        }
    }
    const ratio = (qty - lower) / (upper - lower);
    return table[lower] + (table[upper] - table[lower]) * ratio;
}

function calculate() {
    // 1. 基本料金の算出
    let baseFee = DESIGN_PRICE[state.size];
    if (state.serviceType === 'design_print') {
        baseFee += interpolate(PRINT_PRICE[state.size], state.qty);
    }

    // 2. 割引の適用（基本料金に対してのみ）
    if (state.isLocalDiscount) baseFee *= CONFIG.LOCAL_DISCOUNT_RATE;
    if (state.isOnlineDiscount) baseFee *= CONFIG.ONLINE_DISCOUNT_RATE;

    // 3. オプション料金の加算（割引対象外）
    let paperSurcharge = (state.serviceType === 'design_print' && state.paper !== 'coat') ? CONFIG.PAPER_SURCHARGE : 0;
    let dataDeliveryFee = CONFIG.DATA_FEES[state.dataDelivery];
    
    let total = baseFee + paperSurcharge + dataDeliveryFee;

    // 4. 100円単位で四捨五入
    total = Math.round(total / 100) * 100;

    animatePrice(total, 400);
}

function animatePrice(targetPrice, duration) {
    const el = document.getElementById('final-price');
    const startPrice = currentDisplayPrice;
    const startTime = performance.now();
    if (animationId) cancelAnimationFrame(animationId);

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = Math.floor(startPrice + (targetPrice - startPrice) * ease);
        
        el.innerText = current.toLocaleString();
        currentDisplayPrice = current;
        
        if (progress < 1) {
            animationId = requestAnimationFrame(update);
        } else {
            el.innerText = targetPrice.toLocaleString();
        }
    }
    animationId = requestAnimationFrame(update);
}

// 初期化実行
window.addEventListener('DOMContentLoaded', () => {
    updateButtonActiveStates();
    updateQtyUI();
    calculate(); // 初期計算を実行
});
