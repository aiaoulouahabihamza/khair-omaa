/**
 * خير أمة - قائمة كتب السنة
 */

const BOOKS = [
    { id: 'bukhari', name: 'صحيح البخاري', author: 'البخاري', file: '../data/hadith/bukhari.json' },
    { id: 'muslim', name: 'صحيح مسلم', author: 'مسلم', file: '../data/hadith/muslim.json' },
    { id: 'nasai', name: 'سنن النسائي', author: 'النسائي', file: '../data/hadith/nasai.json' },
    { id: 'abudawud', name: 'سنن أبي داود', author: 'أبو داود', file: '../data/hadith/abudawud.json' },
    { id: 'tirmidhi', name: 'جامع الترمذي', author: 'الترمذي', file: '../data/hadith/tirmidhi.json' },
    { id: 'ibnmajah', name: 'سنن ابن ماجه', author: 'ابن ماجه', file: '../data/hadith/ibnmajah.json' },
    { id: 'malik', name: 'موطأ مالك', author: 'مالك', file: '../data/hadith/malik.json' },
    { id: 'ahmed', name: 'مسند أحمد', author: 'أحمد', file: '../data/hadith/ahmed.json' },
    { id: 'darimi', name: 'سنن الدارمي', author: 'الدارمي', file: '../data/hadith/darimi.json' }
];

let bookMetadata = {};
const loadingState = document.getElementById('loadingState');
const booksGrid = document.getElementById('booksGrid');

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

// ===== تحميل بيانات الكتاب =====
async function loadBookMetadata(bookId) {
    if (bookMetadata[bookId]) return bookMetadata[bookId];
    try {
        const book = BOOKS.find(b => b.id === bookId);
        if (!book) return null;
        const response = await fetch(book.file);
        if (!response.ok) return null;
        const data = await response.json();
        const length = data.metadata?.length || 0;
        bookMetadata[bookId] = length;
        return length;
    } catch (e) {
        return 0;
    }
}

// ===== عرض الكتب =====
function renderBooks() {
    loadingState.style.display = 'none';
    
    booksGrid.innerHTML = BOOKS.map((book, index) => `
        <div class="book-card" data-book-id="${book.id}" data-index="${index}">
            <div class="book-name">${book.name}</div>
            <div class="book-author">${book.author}</div>
            <div class="book-count" id="count_${book.id}">
                <i class="fas fa-spinner fa-spin" style="font-size:10px;"></i>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.book-card').forEach(card => {
        card.addEventListener('click', function() {
            const bookId = this.dataset.bookId;
            window.location.href = `hadiths.html?book=${bookId}`;
        });
    });
    
    BOOKS.forEach(book => {
        loadBookMetadata(book.id).then(count => {
            const el = document.getElementById(`count_${book.id}`);
            if (el) el.textContent = count ? `${count} حديث` : '--';
        });
    });
}

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

renderBooks();
console.log('🌙 خير أمة - كتب السنة');