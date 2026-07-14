/**
 * خير أمة - قائمة السور (مُحسّن نهائي)
 * يعتمد على variables.css
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

// ===== المتغيرات =====
let allSurahs = [];
const loadingState = document.getElementById('loadingState');
const surahList = document.getElementById('surahList');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const noResults = document.getElementById('noResults');
const clearSearchBtn = document.getElementById('clearSearchBtn');

const arabicNums = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
function toArabicNum(n) {
    return n.toString().split('').map(d => arabicNums[parseInt(d)]).join('');
}

// ===== تحميل السور =====
async function loadSurahs() {
    try {
        const res = await fetch('../data/json/surah.json');
        if (!res.ok) throw new Error('فشل التحميل');
        allSurahs = await res.json();
        
        loadingState.style.display = 'none';
        renderSurahs(allSurahs);
    } catch (error) {
        console.error('❌ خطأ:', error);
        loadingState.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
                <i class="fa-solid fa-triangle-exclamation" style="color:var(--color-gold, #C8B46E);font-size:48px;"></i>
                <span style="font-size:16px;font-weight:600;">حدث خطأ في تحميل القرآن</span>
                <button onclick="location.reload()" style="padding:10px 28px;border:none;border-radius:9999px;background:var(--color-primary, #5E7A55);color:white;font-family:var(--font-family, 'Tajawal');font-weight:700;cursor:pointer;font-size:14px;">
                    <i class="fa-solid fa-arrow-rotate-right" style="margin-left:6px;"></i>
                    إعادة المحاولة
                </button>
            </div>
        `;
    }
}

// ===== عرض السور =====
function renderSurahs(surahs) {
    if (!surahs || surahs.length === 0) {
        surahList.innerHTML = '';
        noResults.style.display = 'flex';
        return;
    }
    
    noResults.style.display = 'none';
    
    surahList.innerHTML = surahs.map((surah, index) => {
        const typeClass = surah.type === 'مكية' ? 'makki' : 'madani';
        const typeLabel = surah.type === 'مكية' ? 'مكية' : 'مدنية';
        const versesCount = surah.surah_verses_count || '--';
        const latinName = surah.title_latin || '';
        
        return `
            <div class="surah-item" data-index="${index}" data-surah-number="${surah.surah_number}">
                <div class="surah-number-wrap">
                    <span class="surah-number">${toArabicNum(surah.surah_number)}</span>
                </div>
                <div class="surah-name-block">
                    <span class="surah-name">${surah.title_ar || surah.surah_title || '--'}</span>
                    ${latinName ? `<span class="surah-name-latin">${latinName}</span>` : ''}
                </div>
                <div class="surah-meta">
                    <span class="type-badge ${typeClass}">${typeLabel}</span>
                    <span class="surah-meta-item">
                        <i class="fa-solid fa-book-open"></i>
                        ${toArabicNum(versesCount)}
                    </span>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.surah-item').forEach(item => {
        item.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            const surah = allSurahs[index];
            if (surah) {
                navigateToSurah(surah);
            }
        });
    });
}

// ===== الانتقال إلى السورة =====
function navigateToSurah(surah) {
    // الفاتحة تبدأ من صفحة 2 (ليس 1)
    let startPage = parseInt(surah.page_debut_content) || 2;
    
    // إذا كانت الفاتحة (رقم 1) والصفحة 1، نستخدم 2
    if (surah.surah_number === 1 && startPage === 1) {
        startPage = 2;
    }
    
    const name = surah.title_ar || surah.surah_title || 'الفاتحة';
    const type = surah.type || 'مكية';
    
    // حفظ آخر قراءة
    localStorage.setItem('lastRead', JSON.stringify({
        surahNumber: surah.surah_number,
        surahName: name,
        page: startPage,
        timestamp: Date.now()
    }));
    
    window.location.href = `page.html?page=${startPage}&surah=${surah.surah_number}&name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
}

// ===== البحث =====
searchInput.addEventListener('input', function() {
    const query = this.value.trim();
    
    if (query.length > 0) {
        searchClear.classList.add('visible');
    } else {
        searchClear.classList.remove('visible');
    }
    
    if (query === '') {
        renderSurahs(allSurahs);
        return;
    }
    
    const lowerQuery = query.toLowerCase();
    const filtered = allSurahs.filter(s => {
        const titleAr = (s.title_ar || '').toLowerCase();
        const titleLatin = (s.title_latin || '').toLowerCase();
        const surahNum = (s.surah_number || '').toString();
        
        return titleAr.includes(lowerQuery) ||
               titleLatin.includes(lowerQuery) ||
               surahNum.includes(query);
    });
    
    renderSurahs(filtered);
});

// ===== مسح البحث =====
searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    renderSurahs(allSurahs);
    searchInput.focus();
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.classList.remove('visible');
    renderSurahs(allSurahs);
});

// ===== إخفاء/إظهار الهيدر =====
let lastScroll = 0;
const header = document.getElementById('mainHeader');
let ticking = false;

window.addEventListener('scroll', () => {
    if (!ticking) {
        window.requestAnimationFrame(() => {
            const currentScroll = window.pageYOffset;
            if (currentScroll > 100 && currentScroll > lastScroll) {
                header.classList.add('hidden');
            } else {
                header.classList.remove('hidden');
            }
            lastScroll = currentScroll;
            ticking = false;
        });
        ticking = true;
    }
});

// ===== آخر قراءة =====
document.getElementById('lastReadBtn').addEventListener('click', (e) => {
    e.preventDefault();
    const lastRead = localStorage.getItem('lastRead');
    if (lastRead) {
        const data = JSON.parse(lastRead);
        window.location.href = `page.html?page=${data.page}&surah=${data.surahNumber}&name=${encodeURIComponent(data.surahName)}`;
    } else {
        // الفاتحة من صفحة 2
        window.location.href = `page.html?page=2&surah=1&name=${encodeURIComponent('الفاتحة')}&type=${encodeURIComponent('مكية')}`;
    }
});

// ===== مفضلة + إعدادات (placeholder) =====
document.getElementById('favoritesBtn').addEventListener('click', (e) => {
    e.preventDefault();
    alert('المفضلة - قريباً');
});

document.getElementById('settingsBtn').addEventListener('click', (e) => {
    e.preventDefault();
    alert('الإعدادات - قريباً');
});

// ===== التهيئة =====
loadSurahs();
console.log('🌙 خير أمة - قائمة السور - تم التحميل');
