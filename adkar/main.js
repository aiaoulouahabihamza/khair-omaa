/**
 * خير أمة - صفحة الأذكار
 */

// ===== تبديل الوضع =====
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

let currentTheme = localStorage.getItem('theme') || 'light';
applyTheme(currentTheme);

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fa-solid fa-sun';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeIcon.className = 'fa-solid fa-moon';
    }
    localStorage.setItem('theme', theme);
    currentTheme = theme;
}

themeToggle.addEventListener('click', () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
    themeToggle.style.transform = 'rotate(180deg)';
    setTimeout(() => themeToggle.style.transform = 'rotate(0deg)', 300);
});

// ===== تحميل الأذكار =====
let allAzkar = [];
let currentCategory = 'أذكار الصباح';
let completedZekr = JSON.parse(localStorage.getItem('completedZekr') || '{}');

const loadingState = document.getElementById('loadingState');
const categoriesTabs = document.getElementById('categoriesTabs');
const azkarList = document.getElementById('azkarList');

fetch('../data/json/azkar.json')
    .then(response => {
        if (!response.ok) throw new Error('فشل تحميل الملف');
        return response.json();
    })
    .then(data => {
        allAzkar = data.data || data;
        loadingState.style.display = 'none';
        renderCategories();
        renderAzkar(currentCategory);
    })
    .catch(error => {
        console.error('خطأ:', error);
        loadingState.innerHTML = `
            <i class="fa-solid fa-triangle-exclamation" style="color:var(--color-gold);font-size:36px;"></i>
            <span>حدث خطأ في تحميل الأذكار</span>
            <button onclick="location.reload()" style="padding:8px 24px;border:none;border-radius:var(--radius);background:var(--color-primary);color:white;font-family:var(--font-family);font-weight:600;cursor:pointer;">
                <i class="fa-solid fa-arrow-rotate-right"></i> إعادة المحاولة
            </button>
        `;
    });

function renderCategories() {
    const categories = [...new Set(allAzkar.map(item => item.category))];
    
    categoriesTabs.innerHTML = categories.map(cat => `
        <button class="cat-tab ${cat === currentCategory ? 'active' : ''}" data-category="${cat}">
            ${cat}
            <span class="cat-count">(${allAzkar.filter(item => item.category === cat).length})</span>
        </button>
    `).join('');

    document.querySelectorAll('.cat-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentCategory = this.dataset.category;
            renderAzkar(currentCategory);
        });
    });
}

function renderAzkar(category) {
    const filtered = allAzkar.filter(item => item.category === category);
    
    if (filtered.length === 0) {
        azkarList.innerHTML = `
            <div style="padding:40px 0;text-align:center;color:var(--color-text-lighter);">
                <i class="fa-solid fa-book-open" style="font-size:32px;opacity:0.3;"></i>
                <p style="margin-top:8px;">لا توجد أذكار في هذه الفئة</p>
            </div>
        `;
        return;
    }

    azkarList.innerHTML = filtered.map((item, index) => {
        const isDone = completedZekr[item.id] || false;
        return `
            <div class="zekr-item" data-id="${item.id}">
                <div class="zekr-header">
                    <span style="font-size:12px;color:var(--color-text-lighter);">#${index + 1}</span>
                    <span class="zekr-count">
                        <i class="fa-solid fa-repeat"></i> ${item.count}
                    </span>
                </div>
                <div class="zekr-text">${item.zekr}</div>
                <div class="zekr-meta">
                    ${item.reference ? `<span class="zekr-ref"><i class="fa-solid fa-book"></i> ${item.reference}</span>` : ''}
                    ${item.description ? `<span class="zekr-desc"><i class="fa-solid fa-circle-info"></i> ${item.description}</span>` : ''}
                </div>
                <div class="zekr-actions">
                    <button class="btn-read" data-id="${item.id}">
                        <i class="fa-regular fa-eye"></i> قراءة
                    </button>
                    <button class="btn-done ${isDone ? 'done' : ''}" data-id="${item.id}">
                        <i class="${isDone ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}"></i>
                        ${isDone ? 'تم' : 'تم التنفيذ'}
                    </button>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.btn-read').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            const zekr = allAzkar.find(item => item.id === id);
            if (zekr) openZekrModal(zekr);
        });
    });

    document.querySelectorAll('.btn-done').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            toggleDone(id);
        });
    });

    document.querySelectorAll('.zekr-item').forEach(item => {
        item.addEventListener('click', function() {
            const id = parseInt(this.dataset.id);
            const zekr = allAzkar.find(item => item.id === id);
            if (zekr) openZekrModal(zekr);
        });
    });
}

function toggleDone(id) {
    if (completedZekr[id]) {
        delete completedZekr[id];
    } else {
        completedZekr[id] = true;
    }
    localStorage.setItem('completedZekr', JSON.stringify(completedZekr));
    renderAzkar(currentCategory);
}

// ===== مودال الذكر =====
const zekrModal = document.getElementById('zekrModal');
const modalZekrClose = document.getElementById('modalZekrClose');
const modalZekrTitle = document.getElementById('modalZekrTitle');
const modalZekrText = document.getElementById('modalZekrText');
const modalZekrRef = document.getElementById('modalZekrRef');
const modalZekrCount = document.getElementById('modalZekrCount');
const modalCopyBtn = document.getElementById('modalCopyBtn');
const modalDoneBtn = document.getElementById('modalDoneBtn');

let currentModalId = null;

function openZekrModal(zekr) {
    currentModalId = zekr.id;
    modalZekrTitle.textContent = zekr.category;
    modalZekrText.textContent = zekr.zekr;
    modalZekrRef.textContent = zekr.reference || 'لا يوجد مرجع';
    modalZekrCount.textContent = `عدد التكرار: ${zekr.count}`;
    
    const isDone = completedZekr[zekr.id] || false;
    modalDoneBtn.innerHTML = `
        <i class="${isDone ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}"></i>
        ${isDone ? 'تم' : 'تم التنفيذ'}
    `;
    modalDoneBtn.classList.toggle('done', isDone);
    
    zekrModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeZekrModal() {
    zekrModal.classList.remove('active');
    document.body.style.overflow = '';
}

modalZekrClose.addEventListener('click', closeZekrModal);
zekrModal.addEventListener('click', (e) => {
    if (e.target === zekrModal) closeZekrModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && zekrModal.classList.contains('active')) {
        closeZekrModal();
    }
});

modalCopyBtn.addEventListener('click', () => {
    const text = modalZekrText.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const original = modalCopyBtn.innerHTML;
        modalCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
        setTimeout(() => {
            modalCopyBtn.innerHTML = original;
        }, 2000);
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        const original = modalCopyBtn.innerHTML;
        modalCopyBtn.innerHTML = '<i class="fa-solid fa-check"></i> تم النسخ';
        setTimeout(() => {
            modalCopyBtn.innerHTML = original;
        }, 2000);
    });
});

modalDoneBtn.addEventListener('click', () => {
    if (currentModalId !== null) {
        toggleDone(currentModalId);
        const isDone = completedZekr[currentModalId] || false;
        modalDoneBtn.innerHTML = `
            <i class="${isDone ? 'fa-solid fa-circle-check' : 'fa-regular fa-circle'}"></i>
            ${isDone ? 'تم' : 'تم التنفيذ'}
        `;
        modalDoneBtn.classList.toggle('done', isDone);
        closeZekrModal();
    }
});

// ===== إخفاء الهيدر =====
let lastScroll = 0;
const header = document.getElementById('mainHeader');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > 80 && currentScroll > lastScroll) {
        header.style.transform = 'translateY(-100%)';
    } else {
        header.style.transform = 'translateY(0)';
    }
    lastScroll = currentScroll;
});

console.log('خير أمة - صفحة الأذكار');