
const params = new URLSearchParams(window.location.search);
const startPage = parseInt(params.get('page')) || 2;
const surahNumber = parseInt(params.get('surah')) || 1;
const surahName = decodeURIComponent(params.get('name') || 'الفاتحة');
const surahType = decodeURIComponent(params.get('type') || 'مكية');

let allPages = [];
let allAhzab = [];
let pageData = []; // كل أرقام صفحات المصحف مرتبة تسلسلياً
let currentIndex = 0; // فهرس الصفحة الحالية داخل pageData

const viewer = document.getElementById('quranViewer');
const pageCache = new Map(); // يخزن HTML بيانات JSON الخام (مو عناصر DOM)
const CACHE_MAX_SIZE = 30;

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
        if (!res.ok) {
            console.error(`❌ الملف غير موجود (${res.status}): data/quran/${pageNum}.json`);
            return { __error: 'not_found', status: res.status };
        }

        const data = await res.json();
        if (pageCache.size >= CACHE_MAX_SIZE) {
            const firstKey = pageCache.keys().next().value;
            pageCache.delete(firstKey);
        }
        pageCache.set(cacheKey, data);
        return data;
    } catch (e) {
        console.error(`❌ خطأ أثناء تحميل صفحة ${pageNum} — النوع: ${e.name} — الرسالة: ${e.message}`, e);
        return { __error: 'network', message: `${e.name}: ${e.message}` };
    }
}

function buildQuranLine(line) {
    if (!line.words || line.words.length === 0) return '';

    let html = '';
    let lastVerseNum = null;

    for (const word of line.words) {
        const vNum = word.verse ? word.verse.verse_number : null;
        if (word.text) {
            html += `<span class="q-word" data-verse="${vNum || ''}" data-surah="${word.surah_number || surahNumber}">${word.text}</span> `;
        }

        if (word.is_last_word === '1' && vNum) {
            if (lastVerseNum !== vNum) {
                html += `<span class="ayah-marker" data-verse="${vNum}"><img class="ayah-frame" src="../data/images/ayah_frame_brown.svg" alt="" /><span class="ayah-number">${toArabicNum(vNum)}</span></span>`;
                lastVerseNum = vNum;
            }
        }
    }

    return html.trim();
}

function buildSurahHeader(title) {
    return `<div class="surah-header-block"><img class="surah-frame" src="../data/images/surah_frame_brown.svg" alt="" /><span class="surah-title-text">سُورَةُ ${title}</span></div>`;
}

function buildPageSeparator(pageNum) {
    return `
        <div class="page-separator">
            <div class="page-frame-box">
                <img class="page-frame" src="../data/images/page_frame_box_brown.svg" alt="" />
                <span class="page-number-text">${toArabicNum(pageNum)}</span>
            </div>
        </div>
    `;
}

// حجم خط وارتفاع سطر ثابتان (لا يتغيران بين الصفحات) محسوبان مرة واحدة بناءً
// على حاوية العرض نفسها (لا تتأثر بشريط أدوات المتصفح لأن كل صفحة مساحتها
// ثابتة داخل .page-viewport بحجم الشاشة الكامل المُدار عبر position:fixed)
let fixedLineHeight = null;
let fixedGap = null;
let fixedFontSize = null;
const STANDARD_LINE_COUNT = 15;

function computeFixedSizesIfNeeded(pageDiv) {
    if (fixedLineHeight !== null) return;

    const separator = pageDiv.querySelector('.page-separator');
    const availableHeight = pageDiv.clientHeight;
    const separatorHeight = separator ? separator.getBoundingClientRect().height : 40;
    const usableForLines = availableHeight - separatorHeight;
    if (usableForLines <= 0) return;

    const gapRatio = 0.08;
    const idealLineHeight = usableForLines / (STANDARD_LINE_COUNT + (STANDARD_LINE_COUNT - 1) * gapRatio);
    const clampedLineHeight = Math.max(30, Math.min(idealLineHeight, 58));

    fixedLineHeight = clampedLineHeight;
    fixedGap = clampedLineHeight * gapRatio;
    fixedFontSize = clampedLineHeight * 0.58;
}

/**
 * تطبّق حجم الخط الثابت على أي صفحة، بغض النظر عن عدد أسطرها. الصفحات
 * القصيرة (الفاتحة، بدايات بعض السور) تُعرض بتمركز عمودي متقارب بدل تكبير
 * الخط لملء المساحة، تماماً كما تُعرض في تطبيقات المصحف المرجعية.
 */
function fitPageToViewport(pageDiv) {
    const content = pageDiv.querySelector('.page-content');
    if (!content) return;

    const pageLines = content.querySelectorAll('.quran-line');
    if (pageLines.length === 0) return;

    computeFixedSizesIfNeeded(pageDiv);
    if (fixedLineHeight === null) return;

    const COMPACT_THRESHOLD = 10;
    content.classList.toggle('page-content--compact', pageLines.length <= COMPACT_THRESHOLD);

    pageDiv.style.setProperty('--quran-line-height', `${fixedLineHeight}px`);
    pageDiv.style.setProperty('--quran-line-gap', `${fixedGap}px`);
    pageLines.forEach(line => {
        line.style.fontSize = `${fixedFontSize}px`;
    });
}

/**
 * ضبط دقيق لعرض كل سطر قرآني بحيث يساوي بالضبط عرض السطر الأعرض (المرجع)
 * داخل نفس الصفحة — تماماً كما في رسم المصحف المطبوع.
 */
function justifyQuranLines(pageDiv) {
    const lines = pageDiv.querySelectorAll('.quran-line');
    if (lines.length === 0) return;

    const containerWidth = pageDiv.querySelector('.page-content')?.clientWidth;
    if (!containerWidth) return;

    lines.forEach(line => {
        line.style.wordSpacing = '0px';
        const words = line.querySelectorAll('.q-word');
        if (words.length <= 1) return;

        const naturalWidth = line.scrollWidth;
        const diff = containerWidth - naturalWidth;
        if (Math.abs(diff) < 1) return;

        const gaps = words.length - 1;
        if (gaps <= 0) return;

        const extraPerGap = diff / gaps;
        const clamped = Math.max(-2, Math.min(extraPerGap, 14));
        line.style.wordSpacing = `${clamped}px`;
    });
}

/**
 * يبني HTML كامل لصفحة واحدة من بيانات JSON الخام، ويعيد نص HTML جاهز
 * (وليس عنصر DOM) — يُستخدم هذا لإدراج الصفحة داخل حاوية العرض الثابتة.
 */
function buildPageHTML(pageNum, data) {
    if (!data || data.__error) {
        const reason = data && data.__error === 'not_found'
            ? `الملف data/quran/${pageNum}.json غير موجود على الخادم`
            : `${data && data.message ? data.message : 'تعذّر الاتصال بالخادم'}`;
        return `
            <div class="page-error">
                <p>تعذّر تحميل الصفحة ${pageNum}</p>
                <p class="page-error-hint">${reason}</p>
                <button class="page-error-retry" data-retry-page="${pageNum}">
                    <i class="fa-solid fa-rotate-right"></i> إعادة المحاولة
                </button>
            </div>
        `;
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

    return `
        <div class="page-content">
            ${linesHtml}
        </div>
        ${buildPageSeparator(pageNum)}
    `;
}

/**
 * يبني عنصر DOM كاملاً لصفحة واحدة (يجلب البيانات أولاً)، ويربط زر إعادة
 * المحاولة إن فشل التحميل.
 */
async function createPageElement(pageNum) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'quran-page';
    pageDiv.dataset.page = pageNum;

    const data = await fetchPageData(pageNum);
    pageDiv.innerHTML = buildPageHTML(pageNum, data);

    const retryBtn = pageDiv.querySelector('.page-error-retry');
    if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
            pageCache.delete(`page_${pageNum}`);
            const freshData = await fetchPageData(pageNum);
            pageDiv.innerHTML = buildPageHTML(pageNum, freshData);
            settleNewPageContent(pageDiv);
            attachRetryHandlerIfNeeded(pageDiv, pageNum);
        });
    }

    return pageDiv;
}

function attachRetryHandlerIfNeeded(pageDiv, pageNum) {
    const retryBtn = pageDiv.querySelector('.page-error-retry');
    if (retryBtn) {
        retryBtn.addEventListener('click', async () => {
            pageCache.delete(`page_${pageNum}`);
            const freshData = await fetchPageData(pageNum);
            pageDiv.innerHTML = buildPageHTML(pageNum, freshData);
            settleNewPageContent(pageDiv);
            attachRetryHandlerIfNeeded(pageDiv, pageNum);
        });
    }
}

function settleNewPageContent(pageDiv) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
        fitPageToViewport(pageDiv);
        justifyQuranLines(pageDiv);
    }));
}

/**
 * يبني pageData من كل صفحات المصحف مرتبة تسلسلياً، بحيث يمكن الانتقال من
 * آخر صفحة بسورة إلى أول صفحة بالسورة التالية بنفس آلية السحب العادية.
 */
async function determinePageRange() {
    if (allPages.length > 0) {
        pageData = allPages
            .map(p => parseInt(p.page_number))
            .filter(n => !isNaN(n))
            .sort((a, b) => a - b);
        return;
    }
    const FALLBACK_TOTAL_PAGES = 604;
    pageData = Array.from({ length: FALLBACK_TOTAL_PAGES }, (_, i) => i + 1);
}

// ===== حاوية العرض: 3 صفحات فقط في الـ DOM دائماً (سابقة، حالية، تالية) =====
// هذا يبسّط كل شيء: لا حاجة لتحميل كسول معقد أو مراقبة تقاطع، فقط نستبدل
// محتوى العناصر الثلاثة عند كل تنقل.
const pageViewport = document.createElement('div');
pageViewport.className = 'page-viewport';
viewer.appendChild(pageViewport);

let slotPrev, slotCurrent, slotNext;

function updatePageHeaderInfo(pageNum) {
    const hizbNum = getHizbForPage(pageNum);
    const surahNameForPage = getSurahNameForPage(pageNum);
    updateHeader(surahNameForPage, formatHizbText(hizbNum));
    document.title = `خير أمة - ${surahNameForPage} (صفحة ${pageNum})`;
    saveLastRead(pageNum, surahNameForPage);
}

/**
 * يعيد بناء الشرائح الثلاث (سابقة/حالية/تالية) بناءً على currentIndex.
 * تُستدعى عند البدء وعند كل انتقال ناجح لصفحة جديدة.
 */
async function renderSlotsAround(index) {
    const prevNum = index > 0 ? pageData[index - 1] : null;
    const currentNum = pageData[index];
    const nextNum = index < pageData.length - 1 ? pageData[index + 1] : null;

    const [prevDiv, currentDiv, nextDiv] = await Promise.all([
        prevNum ? createPageElement(prevNum) : Promise.resolve(document.createElement('div')),
        createPageElement(currentNum),
        nextNum ? createPageElement(nextNum) : Promise.resolve(document.createElement('div')),
    ]);

    pageViewport.innerHTML = '';
    prevDiv.classList.add('page-slot', 'page-slot--prev');
    currentDiv.classList.add('page-slot', 'page-slot--current');
    nextDiv.classList.add('page-slot', 'page-slot--next');

    pageViewport.appendChild(prevDiv);
    pageViewport.appendChild(currentDiv);
    pageViewport.appendChild(nextDiv);

    slotPrev = prevDiv;
    slotCurrent = currentDiv;
    slotNext = nextDiv;

    // نضبط الموضع الأساسي فوراً وبدون أي انتقال حركي (الشريحة الوسطى تظهر
    // مباشرة داخل نافذة العرض، دون أي وميض أو حركة غير مقصودة)
    pageViewport.style.transition = 'none';
    setViewportOffset(0);

    settleNewPageContent(currentDiv);
    if (prevNum) settleNewPageContent(prevDiv);
    if (nextNum) settleNewPageContent(nextDiv);

    updatePageHeaderInfo(currentNum);
}

async function renderAllPages() {
    if (pageData.length === 0) {
        pageViewport.innerHTML = `<div class="page-error">لم يتم العثور على صفحات لسورة ${surahName}</div>`;
        return;
    }

    let startIdx = pageData.indexOf(startPage);
    if (startIdx === -1) {
        startIdx = pageData.reduce((closest, p, i) =>
            Math.abs(p - startPage) < Math.abs(pageData[closest] - startPage) ? i : closest, 0);
    }
    currentIndex = startIdx;

    await renderSlotsAround(currentIndex);
}

// ===== الانتقال بين الصفحات (سحب أفقي) =====
// المصحف بالعربية: "التالي" (الصفحة برقم أكبر) هو السحب لجهة اليمين→اليسار
// (السهم »» يعني التالي)، و"السابق" هو السحب المعاكس. نستخدم CSS transform
// على page-viewport لعمل حركة انزلاقية واضحة، بدل الاعتماد على أي تمرير.
// الموضع الأساسي دائماً -1 × عرض الشاشة (بالبكسل الفعلي، وليس نسبة مئوية)
// بحيث تظهر الشريحة الوسطى (الحالية) داخل نافذة العرض؛ أثناء السحب نضيف
// إزاحة الإصبع اللحظية فوق هذا الموضع الأساسي مباشرة.
let isAnimating = false;

function getSlotWidth() {
    return viewer.clientWidth;
}

function setViewportOffset(extraPx) {
    const base = -getSlotWidth(); // إزاحة شريحة واحدة كاملة نحو اليسار
    pageViewport.style.transform = `translateX(${base + extraPx}px)`;
}

async function goToNextPage() {
    if (isAnimating || currentIndex >= pageData.length - 1) return;
    isAnimating = true;

    pageViewport.style.transition = 'transform 0.26s cubic-bezier(0.4,0,0.2,1)';
    setViewportOffset(-getSlotWidth());
    await new Promise(r => setTimeout(r, 260));

    currentIndex++;
    await renderSlotsAround(currentIndex);
    pageViewport.style.transition = 'none';
    setViewportOffset(0);

    isAnimating = false;
}

async function goToPrevPage() {
    if (isAnimating || currentIndex <= 0) return;
    isAnimating = true;

    pageViewport.style.transition = 'transform 0.26s cubic-bezier(0.4,0,0.2,1)';
    setViewportOffset(getSlotWidth());
    await new Promise(r => setTimeout(r, 260));

    currentIndex--;
    await renderSlotsAround(currentIndex);
    pageViewport.style.transition = 'none';
    setViewportOffset(0);

    isAnimating = false;
}

// ===== معالجة السحب (touch) =====
let touchStartX = 0;
let touchStartY = 0;
let touchDeltaX = 0;
const SWIPE_THRESHOLD = 60; // أقل مسافة سحب أفقية لاعتبارها "تنقّل صفحة"

function handleTouchStart(e) {
    if (isAnimating) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchDeltaX = 0;
    pageViewport.style.transition = 'none';
}

function handleTouchMove(e) {
    if (isAnimating || touchStartX === 0) return;
    const touch = e.touches[0];
    touchDeltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    // إذا كانت الحركة عمودية بوضوح أكثر من الأفقية، نتجاهلها (لا نتدخل
    // بأي سكرول عمودي محتمل داخل عناصر أخرى)
    if (Math.abs(deltaY) > Math.abs(touchDeltaX) * 1.5) return;

    e.preventDefault();
    setViewportOffset(touchDeltaX);
}

function handleTouchEnd() {
    if (isAnimating || touchStartX === 0) return;

    if (Math.abs(touchDeltaX) >= SWIPE_THRESHOLD) {
        // السحب يمين→يسار (deltaX سالب): الصفحة التالية (»»)
        // السحب يسار→يمين (deltaX موجب): الصفحة السابقة (««)
        if (touchDeltaX < 0) {
            goToNextPage();
        } else {
            goToPrevPage();
        }
    } else {
        // سحب غير كافٍ للتنقل: نعيد الشريحة الحالية لموضعها الطبيعي بحركة سلسة
        pageViewport.style.transition = 'transform 0.2s ease';
        setViewportOffset(0);
    }

    touchStartX = 0;
    touchDeltaX = 0;
}

viewer.addEventListener('touchstart', handleTouchStart, { passive: true });
viewer.addEventListener('touchmove', handleTouchMove, { passive: false });
viewer.addEventListener('touchend', handleTouchEnd, { passive: true });

// دعم السحب بالفأرة أيضاً (سطح المكتب)
let mouseIsDown = false;
viewer.addEventListener('mousedown', (e) => {
    if (isAnimating) return;
    mouseIsDown = true;
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    touchDeltaX = 0;
    pageViewport.style.transition = 'none';
});
viewer.addEventListener('mousemove', (e) => {
    if (!mouseIsDown || isAnimating) return;
    touchDeltaX = e.clientX - touchStartX;
    setViewportOffset(touchDeltaX);
});
window.addEventListener('mouseup', () => {
    if (!mouseIsDown) return;
    mouseIsDown = false;
    handleTouchEnd();
});

// ===== معالجة عجلة الفأرة (تُترجم لتنقل صفحة) =====
let wheelLocked = false;
viewer.addEventListener('wheel', (e) => {
    if (isAnimating || wheelLocked) return;
    e.preventDefault();
    wheelLocked = true;
    if (e.deltaY > 20 || e.deltaX < -20) {
        goToNextPage();
    } else if (e.deltaY < -20 || e.deltaX > 20) {
        goToPrevPage();
    }
    setTimeout(() => { wheelLocked = false; }, 400);
}, { passive: false });

// ===== قائمة خيارات الآية (الضغط المطول) =====
const LONG_PRESS_MS = 480;
const LONG_PRESS_MOVE_TOLERANCE = 10;

let longPressTimer = null;
let longPressStartPos = null;
let activeVerse = null;

const ayahSheet = document.getElementById('ayahSheet');
const ayahSheetBackdrop = document.getElementById('ayahSheetBackdrop');
const ayahSheetPreview = document.getElementById('ayahSheetPreview');
const bookmarkBtn = document.getElementById('ayahActionBookmark');

function getVerseWordElements(surah, verse) {
    return Array.from(
        (slotCurrent || viewer).querySelectorAll(`.q-word[data-surah="${surah}"][data-verse="${verse}"]`)
    );
}

function highlightVerse(wordEls) {
    wordEls.forEach(el => el.classList.add('q-word--highlighted'));
}

function clearVerseHighlight() {
    viewer.querySelectorAll('.q-word--highlighted').forEach(el =>
        el.classList.remove('q-word--highlighted')
    );
}

function bookmarkKey(surah, verse) {
    return `${surah}:${verse}`;
}

function isVerseBookmarked(surah, verse) {
    try {
        const saved = JSON.parse(localStorage.getItem('bookmarkedVerses') || '[]');
        return saved.includes(bookmarkKey(surah, verse));
    } catch (e) {
        return false;
    }
}

function toggleBookmark(surah, verse) {
    let saved = [];
    try {
        saved = JSON.parse(localStorage.getItem('bookmarkedVerses') || '[]');
    } catch (e) { saved = []; }

    const key = bookmarkKey(surah, verse);
    const idx = saved.indexOf(key);
    if (idx === -1) {
        saved.push(key);
    } else {
        saved.splice(idx, 1);
    }
    localStorage.setItem('bookmarkedVerses', JSON.stringify(saved));
    return idx === -1;
}

function openAyahSheet(surah, verse) {
    const wordEls = getVerseWordElements(surah, verse);
    if (wordEls.length === 0) return;

    clearVerseHighlight();
    highlightVerse(wordEls);
    activeVerse = { surah, verse, wordEls };

    const verseText = wordEls.map(el => el.textContent.trim()).join(' ');
    ayahSheetPreview.textContent = verseText;

    bookmarkBtn.classList.toggle('is-saved', isVerseBookmarked(surah, verse));

    ayahSheetBackdrop.classList.add('is-open');
    ayahSheet.classList.add('is-open');
}

function closeAyahSheet() {
    ayahSheetBackdrop.classList.remove('is-open');
    ayahSheet.classList.remove('is-open');
    clearVerseHighlight();
    activeVerse = null;
}

function clearLongPressTimer() {
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
    longPressStartPos = null;
}

viewer.addEventListener('touchstart', (e) => {
    const wordEl = e.target.closest('.q-word');
    if (!wordEl || !wordEl.dataset.verse) return;

    const touch = e.touches[0];
    longPressStartPos = { x: touch.clientX, y: touch.clientY };

    longPressTimer = setTimeout(() => {
        if (navigator.vibrate) navigator.vibrate(15);
        openAyahSheet(wordEl.dataset.surah, wordEl.dataset.verse);
        longPressTimer = null;
    }, LONG_PRESS_MS);
}, { passive: true });

viewer.addEventListener('touchmove', (e) => {
    if (!longPressStartPos || !longPressTimer) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - longPressStartPos.x);
    const dy = Math.abs(touch.clientY - longPressStartPos.y);
    if (dx > LONG_PRESS_MOVE_TOLERANCE || dy > LONG_PRESS_MOVE_TOLERANCE) {
        clearLongPressTimer();
    }
}, { passive: true });

viewer.addEventListener('touchend', clearLongPressTimer, { passive: true });
viewer.addEventListener('touchcancel', clearLongPressTimer, { passive: true });

ayahSheetBackdrop.addEventListener('click', closeAyahSheet);

bookmarkBtn.addEventListener('click', () => {
    if (!activeVerse) return;
    const added = toggleBookmark(activeVerse.surah, activeVerse.verse);
    bookmarkBtn.classList.toggle('is-saved', added);
    bookmarkBtn.querySelector('span').textContent = added
        ? 'تمت الإضافة للمرجعية'
        : 'حفظ كعلامة مرجعية';
    setTimeout(() => {
        if (bookmarkBtn.querySelector('span')) {
            bookmarkBtn.querySelector('span').textContent = 'حفظ كعلامة مرجعية';
        }
    }, 1500);
});

document.getElementById('ayahActionCopy').addEventListener('click', () => {
    if (!activeVerse) return;
    const text = ayahSheetPreview.textContent;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
    }
    closeAyahSheet();
});

document.getElementById('ayahActionShare').addEventListener('click', () => {
    if (!activeVerse) return;
    const text = ayahSheetPreview.textContent;
    if (navigator.share) {
        navigator.share({ text }).catch(() => {});
    } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(() => {});
    }
    closeAyahSheet();
});

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

// إعادة ضبط الرص عند تغيير حجم النافذة/الاتجاه فقط (لا علاقة له الآن بشريط
// أدوات المتصفح لأن الصفحة تُدار بـ position:fixed بارتفاع ثابت فعلياً)
let resizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        fixedLineHeight = null; // نسمح بإعادة حساب كاملة عند تغيّر حجم حقيقي
        [slotPrev, slotCurrent, slotNext].forEach(pageDiv => {
            if (!pageDiv) return;
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
}

init();