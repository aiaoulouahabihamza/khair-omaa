/**
 * خير أمة - الأحاديث النبوية (مبسط)
 */

const params = new URLSearchParams(window.location.search);
const bookId = params.get('book') || 'bukhari';

const BOOKS = {
    bukhari: { name: 'صحيح البخاري', file: '../data/hadith/bukhari.json' },
    muslim: { name: 'صحيح مسلم', file: '../data/hadith/muslim.json' },
    nasai: { name: 'سنن النسائي', file: '../data/hadith/nasai.json' },
    abudawud: { name: 'سنن أبي داود', file: '../data/hadith/abudawud.json' },
    tirmidhi: { name: 'جامع الترمذي', file: '../data/hadith/tirmidhi.json' },
    ibnmajah: { name: 'سنن ابن ماجه', file: '../data/hadith/ibnmajah.json' },
    malik: { name: 'موطأ مالك', file: '../data/hadith/malik.json' },
    ahmed: { name: 'مسند أحمد', file: '../data/hadith/ahmed.json' },
    darimi: { name: 'سنن الدارمي', file: '../data/hadith/darimi.json' }
};

let bookData = null;
let chapters = [];
let hadiths = [];
let currentChapterId = null;
let currentOffset = 0;
const PAGE_SIZE = 20;

// ===== عناصر DOM =====
const loadingState = document.getElementById('loadingState');
const bookTitle = document.getElementById('bookTitle');
const currentLocation = document.getElementById('currentLocation');
const chaptersView = document.getElementById('chaptersView');
const hadithsView = document.getElementById('hadithsView');
const chaptersList = document.getElementById('chaptersList');
const hadithsList = document.getElementById('hadithsList');
const chapterName = document.getElementById('chapterName');
const searchInput = document.getElementById('searchInput');
const searchClear = document.getElementById('searchClear');
const loadMoreContainer = document.getElementById('loadMoreContainer');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const backToChapters = document.getElementById('backToChapters');

// ===== تبديل الوضع =====
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');

let currentTheme = localStorage.getItem('theme') || 'light';
applyTheme(currentTheme);

function applyTheme(theme) {
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fas fa-sun';
    } else {
        document.documentElement.removeAttribute('data-theme');
        themeIcon.className = 'fas fa-moon';
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

// ===== تحميل الكتاب =====
async function loadBook() {
    try {
        const book = BOOKS[bookId];
        if (!book) throw new Error('كتاب غير موجود');
        
        bookTitle.innerHTML = `<i class="fas fa-book"></i> ${book.name}`;
        
        const response = await fetch(book.file);
        if (!response.ok) throw new Error('فشل التحميل');
        
        bookData = await response.json();
        chapters = bookData.chapters || [];
        hadiths = bookData.hadiths || [];
        
        loadingState.style.display = 'none';
        renderChapters();
        
    } catch (error) {
        loadingState.innerHTML = `
            <i class="fas fa-exclamation-circle" style="color:var(--color-warning);"></i>
            <span>حدث خطأ في تحميل الكتاب</span>
            <button onclick="location.reload()" style="padding:8px 24px;border:none;border-radius:var(--radius);background:var(--color-primary);color:white;font-family:var(--font-family);font-weight:600;cursor:pointer;margin-top:8px;">
                <i class="fas fa-redo"></i> إعادة المحاولة
            </button>
        `;
    }
}

// ===== عرض الأبواب =====
function renderChapters() {
    if (chapters.length === 0) {
        chaptersList.innerHTML = `<div style="text-align:center;padding:30px 0;color:var(--color-text-lighter);">لا توجد أبواب</div>`;
        return;
    }
    
    chaptersList.innerHTML = chapters.map(ch => {
        const count = hadiths.filter(h => h.chapterId === ch.id).length;
        return `
            <div class="chapter-item" data-chapter-id="${ch.id}">
                <span class="chapter-name">${ch.arabic || ch.english || 'باب'}</span>
                <span class="chapter-count">${count}</span>
                <span class="chapter-arrow"><i class="fas fa-chevron-left"></i></span>
            </div>
        `;
    }).join('');
    
    document.querySelectorAll('.chapter-item').forEach(item => {
        item.addEventListener('click', function() {
            const chapterId = parseInt(this.dataset.chapterId);
            openChapter(chapterId);
        });
    });
}

// ===== فتح باب =====
function openChapter(chapterId) {
    currentChapterId = chapterId;
    currentOffset = 0;
    const chapter = chapters.find(c => c.id === chapterId);
    const name = chapter?.arabic || chapter?.english || 'الأحاديث';
    
    chapterName.textContent = name;
    currentLocation.textContent = name;
    
    chaptersView.style.display = 'none';
    hadithsView.style.display = 'block';
    document.getElementById('searchBar').style.display = 'flex';
    searchInput.value = '';
    searchClear.style.display = 'none';
    
    renderHadiths();
}

// ===== عرض الأحاديث =====
function renderHadiths(searchQuery = '') {
    let filtered = hadiths.filter(h => h.chapterId === currentChapterId);
    
    if (searchQuery) {
        const query = searchQuery.trim();
        filtered = filtered.filter(h => 
            (h.arabic || '').includes(query)
        );
    }
    
    const total = filtered.length;
    const start = currentOffset;
    const end = Math.min(start + PAGE_SIZE, total);
    const pageItems = filtered.slice(start, end);
    
    if (pageItems.length === 0 && start === 0) {
        hadithsList.innerHTML = `<div style="text-align:center;padding:40px 0;color:var(--color-text-lighter);">لا توجد أحاديث</div>`;
        loadMoreContainer.style.display = 'none';
        return;
    }
    
    if (start === 0) {
        hadithsList.innerHTML = '';
    }
    
    pageItems.forEach((h) => {
        const div = document.createElement('div');
        div.className = 'hadith-item';
        div.dataset.hadithId = h.id;
        
        const text = h.arabic || '';
        const displayNumber = h.idInBook || h.id;
        
        // تقسيم النص إلى سند ومتن
        let sanad = '';
        let matn = text;
        const match = text.match(/^(.*?)(?:قال|عن|حدثنا|أخبرنا|أنبأنا)/);
        if (match && match[1] && match[1].length < text.length / 2) {
            sanad = match[1].trim();
            matn = text.substring(match[0].length - match[1].length).trim();
        }
        
        div.innerHTML = `
            <div class="hadith-number">الحديث ${displayNumber}</div>
            ${sanad ? `<div class="hadith-sanad">${sanad}</div>` : ''}
            <div class="hadith-matn">${matn}</div>
            <div class="hadith-footer">
                <span class="hadith-reference">${bookData.metadata?.arabic?.title || bookId}</span>
                <div class="hadith-actions">
                    <button class="copy-hadith" data-text="${text.replace(/"/g, '&quot;')}">
                        <i class="fas fa-copy"></i>
                    </button>
                    <button class="read-hadith" data-id="${h.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
            </div>
        `;
        
        hadithsList.appendChild(div);
    });
    
    // إضافة مستمعي الأحداث
    hadithsList.querySelectorAll('.copy-hadith').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            copyText(this.dataset.text);
        });
    });
    
    hadithsList.querySelectorAll('.read-hadith').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = parseInt(this.dataset.id);
            const hadith = hadiths.find(h => h.id === id);
            if (hadith) openHadithModal(hadith);
        });
    });
    
    hadithsList.querySelectorAll('.hadith-item').forEach(item => {
        item.addEventListener('click', function() {
            const id = parseInt(this.dataset.hadithId);
            const hadith = hadiths.find(h => h.id === id);
            if (hadith) openHadithModal(hadith);
        });
    });
    
    // تحميل المزيد
    if (end < total && !searchQuery) {
        loadMoreContainer.style.display = 'block';
        loadMoreBtn.dataset.offset = end;
    } else {
        loadMoreContainer.style.display = 'none';
    }
}

// ===== تحميل المزيد =====
loadMoreBtn.addEventListener('click', function() {
    currentOffset = parseInt(this.dataset.offset);
    renderHadiths();
});

// ===== العودة للأبواب =====
backToChapters.addEventListener('click', () => {
    hadithsView.style.display = 'none';
    chaptersView.style.display = 'block';
    document.getElementById('searchBar').style.display = 'none';
    currentLocation.textContent = 'الأبواب';
    searchInput.value = '';
    searchClear.style.display = 'none';
});

// ===== البحث =====
searchInput.addEventListener('input', function() {
    const query = this.value;
    searchClear.style.display = query ? 'block' : 'none';
    if (hadithsView.style.display !== 'none') {
        currentOffset = 0;
        hadithsList.innerHTML = '';
        renderHadiths(query);
    }
});

searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchClear.style.display = 'none';
    currentOffset = 0;
    hadithsList.innerHTML = '';
    renderHadiths('');
});

// ===== نسخ النص =====
function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('تم نسخ الحديث');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('تم نسخ الحديث');
    });
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
        background: var(--color-primary); color: white;
        padding: 10px 24px; border-radius: var(--radius-full);
        font-family: var(--font-family); font-weight: 500;
        z-index: 9999; box-shadow: var(--shadow-strong);
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

// ===== مودال الحديث =====
const hadithModal = document.getElementById('hadithModal');
const modalHadithClose = document.getElementById('modalHadithClose');
const modalHadithTitle = document.getElementById('modalHadithTitle');
const modalHadithBody = document.getElementById('modalHadithBody');

function openHadithModal(hadith) {
    const text = hadith.arabic || '';
    const displayNumber = hadith.idInBook || hadith.id || '--';
    
    modalHadithTitle.textContent = `الحديث ${displayNumber}`;
    
    let sanad = '';
    let matn = text;
    const match = text.match(/^(.*?)(?:قال|عن|حدثنا|أخبرنا|أنبأنا)/);
    if (match && match[1] && match[1].length < text.length / 2) {
        sanad = match[1].trim();
        matn = text.substring(match[0].length - match[1].length).trim();
    }
    
    modalHadithBody.innerHTML = `
        ${sanad ? `<div class="modal-sanad">${sanad}</div>` : ''}
        <div class="modal-matn">${matn}</div>
        <div class="modal-meta">
            <span>${bookData.metadata?.arabic?.title || bookId}</span>
            <span>${hadith.english?.narrator || ''}</span>
        </div>
        <div class="modal-actions">
            <button class="modal-copy-btn" data-text="${text.replace(/"/g, '&quot;')}">
                <i class="fas fa-copy"></i> نسخ
            </button>
        </div>
    `;
    
    hadithModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    modalHadithBody.querySelector('.modal-copy-btn')?.addEventListener('click', function() {
        copyText(this.dataset.text);
    });
}

function closeHadithModal() {
    hadithModal.classList.remove('active');
    document.body.style.overflow = '';
}

modalHadithClose.addEventListener('click', closeHadithModal);
hadithModal.addEventListener('click', (e) => {
    if (e.target === hadithModal) closeHadithModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hadithModal.classList.contains('active')) {
        closeHadithModal();
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

// ===== بدء التحميل =====
loadBook();

console.log('🌙 خير أمة - الأحاديث النبوية');
console.log(`📖 الكتاب: ${bookId}`);