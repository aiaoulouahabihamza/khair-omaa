/**
 * خير أمة - صفحة عرض المصحف
 */

const params = new URLSearchParams(window.location.search);
const startPage = parseInt(params.get('page')) || 2;
const surahNumber = parseInt(params.get('surah')) || 1;
const surahName = decodeURIComponent(params.get('name') || 'الفاتحة');
const surahType = decodeURIComponent(params.get('type') || 'مكية');

let allPages = [];
let allAhzab = [];
let pageData = [];
let currentPageIndex = 0;
const viewer = document.getElementById('quranViewer');

const pageCache = new Map();
const CACHE_MAX_SIZE = 20;

let touchStartY = 0;
let touchStartX = 0;
let isScrolling = false;

const arabicNums = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];

function toArabicNum(n) {
    return n.toString().split('').map(d => arabicNums[parseInt(d)]).join('');
}

// ===== الوضع الداكن =====
function applyTheme() {
    const theme = localStorage.getItem('theme') || 'light';
    if (theme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }
}
applyTheme();

const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = localStorage.getItem('theme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme();
        const icon = themeToggleBtn.querySelector('i');
        if (icon) icon.className = newTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    });
    
    const currentTheme = localStorage.getItem('theme') || 'light';
    const icon = themeToggleBtn.querySelector('i');
    if (icon) icon.className = currentTheme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
}

function updateHeader(surahNameText, hizbText) {
    document.getElementById('surahNameFixed').textContent = surahNameText;
    document.getElementById('hizbInfo').textContent = hizbText;
}

function getJuzFromHizb(hizbNumber) {
    return Math.ceil(hizbNumber / 2);
}

function formatHizbText(hizbNumber) {
    const juz = getJuzFromHizb(hizbNumber);
    return `الجزء ${toArabicNum(juz)} · الحزب ${toArabicNum(hizbNumber)}`;
}

async function loadBaseData() {
    try {
        const pagesRes = await fetch('../data/json/pages.json');
        if (pagesRes.ok) allPages = await pagesRes.json();
        const ahzabRes = await fetch('../data/json/ahzab.json');
        if (ahzabRes.ok) allAhzab = await ahzabRes.json();
    } catch (e) {
        console.warn('⚠️ فشل تحميل البيانات الأساسية', e);
    }
}

function getHizbForPage(pageNum) {
    const pageInfo = allPages.find(p => parseInt(p.page_number) === pageNum);
    if (pageInfo && pageInfo.hizb_number) return parseInt(pageInfo.hizb_number);
    
    for (const hizb of allAhzab) {
        if (pageNum >= parseInt(hizb.first_page) && pageNum <= parseInt(hizb.last_page)) {
            return parseInt(hizb.hizb_number);
        }
    }
    return Math.ceil(pageNum / 2);
}

function getSurahNameForPage(pageNum) {
    const pageInfo = allPages.find(p => parseInt(p.page_number) === pageNum);
    if (pageInfo && pageInfo.page_surah_title) {
        return pageInfo.page_surah_title.replace(/^سورة\s*/, '').trim();
    }
    return surahName;
}

async function fetchPageData(pageNum) {
    const cacheKey = `page_${pageNum}`;
    if (pageCache.has(cacheKey)) return pageCache.get(cacheKey);
    
    try {
        let res = await fetch(`../data/quran/${pageNum}.json`);
        if (!res.ok) res = await fetch(`${pageNum}.json`);
        if (!res.ok) return null;
        
        const data = await res.json();
        if (pageCache.size >= CACHE_MAX_SIZE) {
            const firstKey = pageCache.keys().next().value;
            pageCache.delete(firstKey);
        }
        pageCache.set(cacheKey, data);
        return data;
    } catch (e) {
        console.error(`❌ خطأ في تحميل صفحة ${pageNum}:`, e);
        return null;
    }
}

function buildQuranLine(line) {
    if (!line.words || line.words.length === 0) return '';

    let html = '';
    let lastVerseNum = null;

    for (const word of line.words) {
        if (word.text) {
            html += `<span class="q-word">${word.text}</span> `;
        }

        if (word.is_last_word === '1' && word.verse && word.verse.verse_number) {
            const vNum = word.verse.verse_number;
            if (lastVerseNum !== vNum) {
                html += `<span class="ayah-marker"><img class="ayah-frame" src="../data/images/ayah_frame_brown.svg" alt="" /><span class="ayah-number">${toArabicNum(vNum)}</span></span>`;
                lastVerseNum = vNum;
            }
        }
    }

    return html.trim();
}

/**
 * تحسب لكل صفحة حجم الخط وارتفاع السطر المناسبين بحيث يملأ محتواها
 * (الأسطر + عنوان السورة إن وجد + الفاصل السفلي) المساحة المتاحة تماماً
 * دون أن يفيض عنها أبداً — هذا يمنع نهائياً مشكلة "قص سطر من الأسفل مع
 * ظهور سطر من صفحة تالية" التي تحدث عند استخدام حجم ثابت لا يناسب كل
 * الصفحات (فالفاتحة مثلاً 7 أسطر بينما صفحات أخرى 15 سطراً).
 */
function fitPageToViewport(pageDiv) {
    const content = pageDiv.querySelector('.page-content');
    const separator = pageDiv.querySelector('.page-separator');
    if (!content) return;

    const pageLines = content.querySelectorAll('.quran-line');
    const hasSurahHeader = !!content.querySelector('.surah-header-block');
    const lineCount = pageLines.length;
    if (lineCount === 0) return;

    // الصفحات القليلة الأسطر (كالفاتحة وبدايات السور القصيرة) تُعرض بتمركز
    // عمودي متقارب بدل الالتصاق بأعلى الصفحة مع فراغ كبير أسفلها
    const COMPACT_THRESHOLD = 10;
    content.classList.toggle('page-content--compact', lineCount <= COMPACT_THRESHOLD);

    const availableHeight = pageDiv.clientHeight;
    const separatorHeight = separator ? separator.getBoundingClientRect().height : 40;
    const surahHeaderHeight = hasSurahHeader
        ? (content.querySelector('.surah-header-block')?.getBoundingClientRect().height || 0)
        : 0;

    // المساحة الصافية المتاحة لجسم الأسطر فقط
    const usableForLines = availableHeight - separatorHeight - surahHeaderHeight;
    if (usableForLines <= 0) return;

    // نفترض أن الفجوة بين الأسطر (margin-bottom) تساوي نسبة ثابتة من ارتفاع
    // السطر نفسه (حوالي 8%)، فنحل معادلة: lineCount * h + (lineCount-1) * 0.08h = usable
    const gapRatio = 0.08;
    const idealLineHeight = usableForLines / (lineCount + (lineCount - 1) * gapRatio);

    // حدود معقولة لمنع خط أكبر مما يجب في الصفحات القصيرة (كالفاتحة) أو
    // أصغر مما يُقرأ بارتياح في الصفحات الطويلة على شاشات صغيرة جداً
    const clampedLineHeight = Math.max(30, Math.min(idealLineHeight, 58));
    const gap = clampedLineHeight * gapRatio;
    // حجم الخط أصغر قليلاً من ارتفاع السطر لإفساح مجال طبيعي للتشكيل
    const fontSize = clampedLineHeight * 0.58;

    pageDiv.style.setProperty('--quran-line-height', `${clampedLineHeight}px`);
    pageDiv.style.setProperty('--quran-line-gap', `${gap}px`);
    pageLines.forEach(line => {
        line.style.fontSize = `${fontSize}px`;
    });
}

/**
 * ضبط دقيق لعرض كل سطر قرآني بحيث يساوي بالضبط عرض السطر الأعرض (المرجع)
 * داخل نفس الصفحة — تماماً كما في رسم المصحف المطبوع حيث لا يوجد سطر أقصر
 * أو أطول من غيره. تُحسب المسافة الإضافية المطلوبة بين الكلمات (word-spacing)
 * فعلياً بعد الرسم (post-layout) بدل الاعتماد فقط على justify في CSS، لأن
 * دعم text-align-last للعربي يختلف بين المتصفحات ولا يضمن دقة على مستوى البكسل.
 */
function justifyQuranLines(pageDiv) {
    const lines = pageDiv.querySelectorAll('.quran-line');
    if (lines.length === 0) return;

    // نص العرض الكامل المتاح للسطر (عرض .page-content الفعلي)
    const containerWidth = pageDiv.querySelector('.page-content')?.clientWidth;
    if (!containerWidth) return;

    lines.forEach(line => {
        // نعيد الـ word-spacing للوضع الطبيعي قبل القياس
        line.style.wordSpacing = '0px';

        const words = line.querySelectorAll('.q-word');
        if (words.length <= 1) return; // سطر بكلمة واحدة لا يُمدَّد

        const naturalWidth = line.scrollWidth;
        const diff = containerWidth - naturalWidth;

        // لا نمدد إذا كان السطر فعلاً بعرض شبه مطابق (فرق ضئيل) أو أعرض من الحاوية
        if (Math.abs(diff) < 1) return;

        const gaps = words.length - 1;
        if (gaps <= 0) return;

        const extraPerGap = diff / gaps;
        // نحد أقصى معقول لمنع تباعد مبالغ فيه بالأسطر القصيرة جداً
        const clamped = Math.max(-2, Math.min(extraPerGap, 14));
        line.style.wordSpacing = `${clamped}px`;
    });
}

function buildSurahHeader(title) {
    return `<div class="surah-header-block"><img class="surah-frame" src="../data/images/surah_frame_brown.svg" alt="" /><span class="surah-title-text">سُورَةُ ${title}</span></div>`;
}

function buildPageSeparator(pageNum) {
    return `
        <div class="page-separator">
            <div class="page-frame-box">
                <span class="page-number-text">${toArabicNum(pageNum)}</span>
            </div>
        </div>
    `;
}

async function renderSinglePage(pageNum, index) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'quran-page';
    pageDiv.dataset.page = pageNum;
    pageDiv.dataset.index = index;
    
    const data = await fetchPageData(pageNum);
    
    if (!data) {
        pageDiv.innerHTML = `<div class="page-error">خطأ في تحميل الصفحة ${pageNum}</div>`;
        return pageDiv;
    }
    
    const lines = data.lines || [];
    let linesHtml = '';
    
    for (const line of lines) {
        if (line.is_surah_title === '1') {
            const title = line.surah_title_ar || line.surah_title || surahName;
            linesHtml += buildSurahHeader(title);
        } else {
            const lineText = buildQuranLine(line);
            if (lineText) {
                linesHtml += `<div class="quran-line">${lineText}</div>`;
            }
        }
    }
    
    pageDiv.innerHTML = `
        <div class="page-content">
            ${linesHtml}
        </div>
        ${buildPageSeparator(pageNum)}
    `;

    // القياس الفعلي يحتاج أن يكون العنصر مضافاً للـ DOM ومرئياً كي تُحسب
    // عروض الأسطر بدقة؛ لذلك نؤجل الاستدعاء لأول إطار بعد الإدراج
    requestAnimationFrame(() => requestAnimationFrame(() => {
        fitPageToViewport(pageDiv);
        justifyQuranLines(pageDiv);
    }));

    return pageDiv;
}

async function determinePageRange() {
    const cleanName = surahName.replace(/^سورة\s*/, '').replace(/^سُورَةُ\s*/, '').trim();
    
    if (allPages.length > 0) {
        const matchingPages = allPages
            .filter(p => {
                const pageTitle = (p.page_surah_title || '').replace(/^سورة\s*/, '').trim();
                return pageTitle === cleanName || pageTitle.includes(cleanName) || p.page_surah_title === surahName;
            })
            .map(p => parseInt(p.page_number))
            .sort((a, b) => a - b);
        
        if (matchingPages.length > 0) {
            pageData = matchingPages;
            return;
        }
    }
    
    let found = false;
    const searchStart = Math.max(1, startPage - 5);
    const searchEnd = Math.min(650, startPage + 50);
    
    for (let i = searchStart; i <= searchEnd; i++) {
        try {
            const data = await fetchPageData(i);
            if (!data) continue;
            const pageTitle = (data.page_surah_title || '').replace(/^سورة\s*/, '').trim();
            
            if (pageTitle === cleanName || data.page_surah_title === surahName) {
                if (!found) { pageData = []; found = true; }
                pageData.push(i);
            } else if (found && pageData.length > 5) {
                if (i - pageData[pageData.length - 1] > 5) break;
            }
        } catch (e) { continue; }
    }
    
    if (pageData.length === 0) pageData = [startPage];
}

async function renderAllPages() {
    viewer.innerHTML = '';
    
    if (pageData.length === 0) {
        viewer.innerHTML = `<div class="page-error">لم يتم العثور على صفحات لسورة ${surahName}</div>`;
        return;
    }
    
    const hizbNum = getHizbForPage(pageData[0]);
    const surahNameForPage = getSurahNameForPage(pageData[0]);
    updateHeader(surahNameForPage, formatHizbText(hizbNum));
    saveLastRead(pageData[0], surahNameForPage);
    
    for (let i = 0; i < pageData.length; i++) {
        const pageDiv = await renderSinglePage(pageData[i], i);
        viewer.appendChild(pageDiv);
    }
    
    console.log('📚 تم عرض', pageData.length, 'صفحة');
}

// ===== التمرير الصفحة بصفحة =====
function scrollToPage(index) {
    if (index < 0 || index >= pageData.length) return;
    
    const pages = document.querySelectorAll('.quran-page');
    if (!pages[index]) return;
    
    pages[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    const pageNum = pageData[index];
    const hizbNum = getHizbForPage(pageNum);
    const surahNameForPage = getSurahNameForPage(pageNum);
    updateHeader(surahNameForPage, formatHizbText(hizbNum));
    
    document.title = `خير أمة - ${surahNameForPage} (صفحة ${pageNum})`;
}

function goToNextPage() {
    if (currentPageIndex < pageData.length - 1) {
        currentPageIndex++;
        scrollToPage(currentPageIndex);
    }
}

function goToPrevPage() {
    if (currentPageIndex > 0) {
        currentPageIndex--;
        scrollToPage(currentPageIndex);
    }
}

// ===== معالجة اللمس =====
function handleTouchStart(e) {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
}

function handleTouchEnd(e) {
    const diffY = touchStartY - e.changedTouches[0].clientY;
    const diffX = touchStartX - e.changedTouches[0].clientX;
    
    if (Math.abs(diffY) < Math.abs(diffX)) return;
    if (Math.abs(diffY) < 50) return;
    
    e.preventDefault();
    if (diffY > 0) {
        goToNextPage();
    } else {
        goToPrevPage();
    }
}

// ===== معالجة عجلة الفأرة - تمرير بطيء =====
viewer.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (isScrolling) return;
    
    isScrolling = true;
    if (e.deltaY > 20) {
        goToNextPage();
    } else if (e.deltaY < -20) {
        goToPrevPage();
    }
    setTimeout(() => { isScrolling = false; }, 500);
}, { passive: false });

viewer.addEventListener('touchstart', handleTouchStart, { passive: true });
viewer.addEventListener('touchend', handleTouchEnd, { passive: false });

// ===== حفظ آخر قراءة (لعرضها في الصفحة الرئيسية) =====
function saveLastRead(pageNum, surahNameForPage) {
    try {
        const record = {
            page: pageNum,
            surahName: surahNameForPage,
            surahNumber: surahNumber,
            timestamp: Date.now(),
        };
        localStorage.setItem('lastRead', JSON.stringify(record));
    } catch (e) {
        console.warn('⚠️ تعذّر حفظ آخر قراءة', e);
    }
}

function setupScrollObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
                const pageDiv = entry.target;
                const index = parseInt(pageDiv.dataset.index);
                const pageNum = parseInt(pageDiv.dataset.page);
                
                if (index !== currentPageIndex) {
                    currentPageIndex = index;
                    
                    const hizbNum = getHizbForPage(pageNum);
                    const surahNameForPage = getSurahNameForPage(pageNum);
                    updateHeader(surahNameForPage, formatHizbText(hizbNum));
                    
                    document.title = `خير أمة - ${surahNameForPage} (صفحة ${pageNum})`;
                    saveLastRead(pageNum, surahNameForPage);
                }
            }
        });
    }, { threshold: [0.6, 0.9] });
    
    setTimeout(() => {
        document.querySelectorAll('.quran-page').forEach(page => observer.observe(page));
    }, 300);
}

// إعادة ضبط الرص عند تغيير حجم النافذة/الاتجاه (orientation change)
let resizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        document.querySelectorAll('.quran-page').forEach(pageDiv => {
            fitPageToViewport(pageDiv);
            justifyQuranLines(pageDiv);
        });
    }, 150);
});

async function init() {
    console.log('🌙 خير أمة - صفحة المصحف');
    console.log(`📖 سورة: ${surahName} (${surahType})`);
    console.log(`📄 بدء من صفحة: ${startPage}`);
    
    await loadBaseData();
    await determinePageRange();
    await renderAllPages();
    setupScrollObserver();
}

init();
