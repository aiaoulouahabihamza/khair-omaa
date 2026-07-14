/**
 * خير أمة - الصفحة الرئيسية
 */

// ============================================
// 1. تبديل الوضع (ليلي / نهاري)
// ============================================
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

// ============================================
// 2. التاريخ (هجري + ميلادي)
// ============================================
async function updateDates() {
    const now = new Date();
    
    document.getElementById('gregorianDate').textContent = 
        now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    
    try {
        const response = await fetch(
            `https://api.aladhan.com/v1/gToH/${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}`
        );
        const data = await response.json();
        if (data.code === 200) {
            const h = data.data.hijri;
            document.getElementById('hijriDate').textContent = `${h.day} ${h.month.ar} ${h.year} هـ`;
        }
    } catch (error) {
        document.getElementById('hijriDate').textContent = '-- -- ----';
    }
}
updateDates();

// ============================================
// 3. جلب مواقيت الصلاة المصغرة
// ============================================
async function fetchMiniPrayerTimes() {
    try {
        const savedCity = localStorage.getItem('prayerCity');
        const city = savedCity ? JSON.parse(savedCity) : { name: 'مكة المكرمة', country: 'SA' };
        
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        
        const url = `https://api.aladhan.com/v1/timingsByCity/${day}-${month}-${year}?city=${encodeURIComponent(city.name)}&country=${city.country}&method=2`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200) {
            const timings = data.data.timings;
            document.getElementById('miniFajr').textContent = timings.Fajr;
            document.getElementById('miniDhuhr').textContent = timings.Dhuhr;
            document.getElementById('miniAsr').textContent = timings.Asr;
            document.getElementById('miniMaghrib').textContent = timings.Maghrib;
            document.getElementById('miniIsha').textContent = timings.Isha;
        }
    } catch (error) {}
}
fetchMiniPrayerTimes();

// ============================================
// 4. مودال المزيد
// ============================================
const moreBtn = document.getElementById('moreBtn');
const moreModal = document.getElementById('moreModal');
const modalClose = document.getElementById('modalClose');

function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

if (moreBtn) moreBtn.addEventListener('click', () => openModal(moreModal));
if (modalClose) modalClose.addEventListener('click', () => closeModal(moreModal));

if (moreModal) {
    moreModal.addEventListener('click', (e) => {
        if (e.target === moreModal) closeModal(moreModal);
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && moreModal && moreModal.classList.contains('active')) {
        closeModal(moreModal);
    }
});

document.querySelectorAll('.modal-item').forEach(item => {
    item.addEventListener('click', () => {
        const name = item.querySelector('span')?.textContent || 'القسم';
        alert(`جار التوجه إلى: ${name}`);
        if (moreModal) closeModal(moreModal);
    });
});

// ============================================
// 5. مودال البروفايل
// ============================================
const profileBtn = document.getElementById('profileBtn');
const profileModal = document.getElementById('profileModal');
const profileClose = document.getElementById('profileClose');

if (profileBtn) profileBtn.addEventListener('click', () => openModal(profileModal));
if (profileClose) profileClose.addEventListener('click', () => closeModal(profileModal));

if (profileModal) {
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) closeModal(profileModal);
    });
}

document.getElementById('profileSave')?.addEventListener('click', () => {
    const data = {
        name: document.getElementById('profileName')?.value || '',
        city: document.getElementById('profileCity')?.value || '',
        country: document.getElementById('profileCountry')?.value || '',
    };
    localStorage.setItem('profile', JSON.stringify(data));
    alert('تم حفظ الملف الشخصي');
    closeModal(profileModal);
});

const savedProfile = localStorage.getItem('profile');
if (savedProfile) {
    try {
        const data = JSON.parse(savedProfile);
        const nameInput = document.getElementById('profileName');
        const cityInput = document.getElementById('profileCity');
        const countryInput = document.getElementById('profileCountry');
        if (nameInput) nameInput.value = data.name || '';
        if (cityInput) cityInput.value = data.city || '';
        if (countryInput) countryInput.value = data.country || '';
    } catch(e) {}
}

// ============================================
// 6. التنقل النشط
// ============================================
const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
    item.addEventListener('click', function(e) {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        if (this.getAttribute('data-nav') === 'home') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
});

// ============================================
// 7. إخفاء الهيدر
// ============================================
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

// ============================================
// 8. عرض الكل (آخر قراءة)
// ============================================
document.getElementById('viewAllRecent')?.addEventListener('click', () => {
    alert('جميع القراءات السابقة (سيتم ربطها لاحقاً)');
});

// ============================================
// 9. تحديث أوقات الصلاة كل 5 دقائق
// ============================================
setInterval(fetchMiniPrayerTimes, 300000);

// ============================================
// 10. تحديث التاريخ كل دقيقة
// ============================================
setInterval(updateDates, 60000);

// ============================================
// 11. الأدعية من 100dua.json
// ============================================
let allDua = [];
let duaIndex = 0;
let duaInterval = null;

async function loadDua() {
    try {
        const response = await fetch('./data/json/100dua.json');
        const data = await response.json();
        allDua = data;
        displayDua(0);
        startDuaRotation();
    } catch (error) {
        console.error('خطأ في تحميل الأدعية:', error);
        document.getElementById('randomDua').textContent = 'اللهم إني أسألك العفو والعافية';
        document.getElementById('duaSource').textContent = 'دعاء مبارك';
    }
}

function displayDua(index) {
    if (allDua.length === 0) return;
    
    const duaItem = allDua[index % allDua.length];
    const duaText = document.getElementById('randomDua');
    const duaSource = document.getElementById('duaSource');
    
    if (duaItem && duaItem.duaa && duaItem.duaa.length > 0) {
        duaText.textContent = duaItem.duaa[0].text;
        
        // عرض المصدر
        const source = duaItem.duaa[0].source;
        let sourceText = '';
        if (source) {
            if (source.type === 'quran') {
                const ref = source.references[0];
                if (ref) {
                    sourceText = ` ${ref.surah.name} - ${ref.ayah.from}`;
                }
            } else if (source.type === 'hadith') {
                const ref = source.references[0];
                if (ref) {
                    sourceText = ` ${ref.book || ''} ${ref.numberOrPage || ''}`;
                }
            }
        }
        duaSource.textContent = sourceText || 'دعاء مبارك';
    }
    
    // تحديث النقاط
    updateDots('duaDots', index, allDua.length);
    duaIndex = index;
}

function startDuaRotation() {
    if (duaInterval) clearInterval(duaInterval);
    duaInterval = setInterval(() => {
        const nextIndex = (duaIndex + 1) % allDua.length;
        displayDua(nextIndex);
    }, 120000); // 2 دقيقة
}

// ============================================
// 12. آية وعبرة من ayat&ebra.json
// ============================================
let allVerses = [];
let verseIndex = 0;
let verseInterval = null;

async function loadVerse() {
    try {
        const response = await fetch('./data/json/ayat&ebra.json');
        const data = await response.json();
        allVerses = data;
        displayVerse(0);
        startVerseRotation();
    } catch (error) {
        console.error('خطأ في تحميل الآيات:', error);
        document.getElementById('verseText').textContent = '"وَمَنْ يَتَّقِ اللَّهَ يَجْعَلْ لَهُ مَخْرَجًا"';
        document.getElementById('verseRef').textContent = 'الطلاق - 2';
        document.getElementById('verseLesson').textContent = 'التقوى باب الفرج، من تمسك بها فتح الله له من حيث لا يحتسب';
    }
}

function displayVerse(index) {
    if (allVerses.length === 0) return;
    
    const verse = allVerses[index % allVerses.length];
    const verseText = document.getElementById('verseText');
    const verseRef = document.getElementById('verseRef');
    const verseLesson = document.getElementById('verseLesson');
    
    if (verse) {
        verseText.textContent = verse.title1 || '';
        verseRef.textContent = verse.title2 || 'آية قرآنية';
        verseLesson.textContent = verse.title3 || 'تأمل في آيات الله وتدبر معانيها';
    }
    
    updateDots('verseDots', index, allVerses.length);
    verseIndex = index;
}

function startVerseRotation() {
    if (verseInterval) clearInterval(verseInterval);
    verseInterval = setInterval(() => {
        const nextIndex = (verseIndex + 1) % allVerses.length;
        displayVerse(nextIndex);
    }, 120000); // 2 دقيقة
}

// ============================================
// 13. تحديث النقاط
// ============================================
function updateDots(containerId, activeIndex, total) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const dots = container.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === (activeIndex % total));
    });
}

// ============================================
// 14. النقر على النقاط للتبديل
// ============================================
document.addEventListener('click', function(e) {
    // نقاط الأدعية
    if (e.target.closest('#duaDots .dot')) {
        const dot = e.target.closest('.dot');
        const index = parseInt(dot.dataset.index);
        if (!isNaN(index) && allDua.length > 0) {
            displayDua(index % allDua.length);
            // إعادة تعيين المؤقت
            startDuaRotation();
        }
    }
    
    // نقاط الآيات
    if (e.target.closest('#verseDots .dot')) {
        const dot = e.target.closest('.dot');
        const index = parseInt(dot.dataset.index);
        if (!isNaN(index) && allVerses.length > 0) {
            displayVerse(index % allVerses.length);
            startVerseRotation();
        }
    }
});

// ============================================
// 15. التهيئة
// ============================================
loadDua();
loadVerse();

console.log('🌙 خير أمة - الصفحة الرئيسية');
console.log('📖 تم تحميل الأدعية والآيات');
console.log('🔄 تتغير تلقائياً كل دقيقتين');