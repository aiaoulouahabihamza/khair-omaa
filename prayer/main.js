/**
 * خير أمة - صفحة أوقات الصلاة
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

// ===== التاريخ =====
function updateDate() {
    const now = new Date();
    document.getElementById('currentDate').textContent = 
        now.toLocaleDateString('ar-EG', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
}
updateDate();

// ===== قائمة المدن =====
const cities = [
    { name: 'مكة المكرمة', country: 'SA' },
    { name: 'المدينة المنورة', country: 'SA' },
    { name: 'الرياض', country: 'SA' },
    { name: 'جدة', country: 'SA' },
    { name: 'الدمام', country: 'SA' },
    { name: 'القاهرة', country: 'EG' },
    { name: 'الإسكندرية', country: 'EG' },
    { name: 'الدار البيضاء', country: 'MA' },
    { name: 'الرباط', country: 'MA' },
    { name: 'مراكش', country: 'MA' },
    { name: 'طنجة', country: 'MA' },
    { name: 'فاس', country: 'MA' },
    { name: 'تونس', country: 'TN' },
    { name: 'الجزائر', country: 'DZ' },
    { name: 'وهران', country: 'DZ' },
    { name: 'طرابلس', country: 'LY' },
    { name: 'الخرطوم', country: 'SD' },
    { name: 'دمشق', country: 'SY' },
    { name: 'بيروت', country: 'LB' },
    { name: 'عمان', country: 'JO' },
    { name: 'بغداد', country: 'IQ' },
    { name: 'الكويت', country: 'KW' },
    { name: 'الدوحة', country: 'QA' },
    { name: 'مسقط', country: 'OM' },
    { name: 'صنعاء', country: 'YE' },
    { name: 'أبو ظبي', country: 'AE' },
    { name: 'دبي', country: 'AE' },
    { name: 'المنامة', country: 'BH' },
];

let currentCity = JSON.parse(localStorage.getItem('prayerCity')) || cities[0];
let countdownInterval = null;
let refreshInterval = null;

document.getElementById('cityDisplay').textContent = currentCity.name;

// ===== جلب المواقيت =====
async function fetchPrayerTimes(city, date = null) {
    const targetDate = date || new Date();
    const day = targetDate.getDate().toString().padStart(2, '0');
    const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
    const year = targetDate.getFullYear();
    const dateStr = `${day}-${month}-${year}`;
    
    const url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${encodeURIComponent(city.name)}&country=${city.country}&method=2`;
    
    showStatus('loading', 'جاري تحميل المواقيت...');
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('فشل الاتصال بالخادم');
        
        const data = await response.json();
        if (data.code !== 200) throw new Error(data.status || 'خطأ في البيانات');
        
        const timings = data.data.timings;
        
        displayPrayerTimes(timings);
        showStatus('success', `تم التحديث - ${city.name}`);
        return true;
    } catch (error) {
        console.error('خطأ:', error);
        showStatus('error', error.message || 'حدث خطأ');
        return false;
    }
}

// ===== عرض المواقيت =====
const prayerNames = {
    Fajr: 'الفجر',
    Sunrise: 'الشروق',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء'
};

const prayerKeys = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function displayPrayerTimes(timings) {
    prayerKeys.forEach(key => {
        const timeElement = document.getElementById(`${key}Time`);
        if (timeElement && timings[key]) {
            timeElement.textContent = timings[key];
        }
    });
    
    const now = new Date();
    const prayerTimes = {};
    prayerKeys.forEach(key => {
        if (timings[key]) {
            const timeParts = timings[key].split(':');
            const date = new Date();
            date.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0);
            prayerTimes[key] = date;
        }
    });
    
    let nextPrayer = null;
    let nextPrayerKey = null;
    
    for (const key of prayerKeys) {
        if (prayerTimes[key] && prayerTimes[key] > now) {
            nextPrayer = prayerTimes[key];
            nextPrayerKey = key;
            break;
        }
    }
    
    if (!nextPrayer) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (timings.Fajr) {
            const timeParts = timings.Fajr.split(':');
            tomorrow.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0);
            nextPrayer = tomorrow;
            nextPrayerKey = 'Fajr';
        }
    }
    
    if (nextPrayer && nextPrayerKey) {
        document.getElementById('nextPrayerName').textContent = prayerNames[nextPrayerKey] || nextPrayerKey;
        document.getElementById('nextPrayerTime').textContent = timings[nextPrayerKey] || '--:--';
        updateCountdown(nextPrayer);
        
        document.querySelectorAll('.prayer-item').forEach(el => {
            el.classList.remove('active');
            const prayerKey = el.dataset.prayer;
            if (prayerKey === nextPrayerKey) {
                el.classList.add('active');
            }
        });
    }
    
    prayerKeys.forEach(key => {
        const remainingElement = document.getElementById(`${key}Remaining`);
        if (remainingElement && prayerTimes[key]) {
            const remaining = getTimeRemaining(prayerTimes[key]);
            if (remaining && remaining.total > 0) {
                const hours = remaining.hours > 0 ? `${remaining.hours}س ` : '';
                const minutes = remaining.minutes > 0 ? `${remaining.minutes}د ` : '';
                const seconds = remaining.seconds > 0 ? `${remaining.seconds}ث` : '';
                remainingElement.textContent = hours + minutes + seconds || '0ث';
            } else {
                const isPast = prayerTimes[key] < new Date();
                remainingElement.textContent = isPast ? 'تم' : '--';
            }
        }
    });
}

function getTimeRemaining(targetTime) {
    const now = new Date();
    const diff = targetTime - now;
    if (diff <= 0) return null;
    return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        total: diff
    };
}

function updateCountdown(targetTime) {
    if (countdownInterval) clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        const remaining = getTimeRemaining(targetTime);
        const element = document.getElementById('nextPrayerCountdown');
        
        if (remaining && remaining.total > 0) {
            const h = remaining.hours.toString().padStart(2, '0');
            const m = remaining.minutes.toString().padStart(2, '0');
            const s = remaining.seconds.toString().padStart(2, '0');
            element.textContent = `${h}:${m}:${s}`;
        } else {
            element.textContent = '00:00:00';
            clearInterval(countdownInterval);
            refreshPrayerTimes();
        }
    }, 1000);
}

// ===== تحديث المواقيت =====
async function refreshPrayerTimes() {
    await fetchPrayerTimes(currentCity);
}

// ===== حالة الموقع =====
function showStatus(type, message) {
    const statusElement = document.getElementById('locationStatus');
    const dot = statusElement.querySelector('.status-dot');
    const text = statusElement.querySelector('.status-text');
    
    dot.className = 'status-dot';
    if (type === 'loading') dot.classList.add('loading');
    else if (type === 'success') dot.classList.add('success');
    else if (type === 'error') dot.classList.add('error');
    
    text.textContent = message;
}

// ===== تحديد الموقع =====
function detectLocation() {
    showStatus('loading', 'جاري تحديد الموقع...');
    
    if (!navigator.geolocation) {
        showStatus('error', 'المتصفح لا يدعم تحديد الموقع');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            showStatus('loading', 'جاري تحديد المدينة...');
            
            try {
                const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ar`);
                const data = await response.json();
                let cityName = data.city || data.locality || data.principalSubdivision || 'موقعي';
                let countryCode = data.countryCode || 'MA';
                
                let foundCity = cities.find(c => c.name === cityName);
                if (!foundCity) {
                    foundCity = { name: cityName, country: countryCode };
                    cities.push(foundCity);
                }
                
                currentCity = foundCity;
                localStorage.setItem('prayerCity', JSON.stringify(currentCity));
                document.getElementById('cityDisplay').textContent = cityName;
                
                showStatus('success', `تم تحديد الموقع: ${cityName}`);
                await refreshPrayerTimes();
            } catch (error) {
                console.error('خطأ:', error);
                currentCity = cities[0];
                localStorage.setItem('prayerCity', JSON.stringify(currentCity));
                document.getElementById('cityDisplay').textContent = currentCity.name;
                showStatus('error', 'تعذر تحديد المدينة، تم استخدام مكة');
                await refreshPrayerTimes();
            }
        },
        (error) => {
            console.error('خطأ:', error);
            let message = 'تعذر تحديد الموقع';
            if (error.code === 1) message = 'تم رفض إذن الموقع';
            else if (error.code === 2) message = 'تعذر الوصول إلى الموقع';
            else if (error.code === 3) message = 'انتهت مهلة تحديد الموقع';
            
            showStatus('error', message);
            currentCity = cities[0];
            localStorage.setItem('prayerCity', JSON.stringify(currentCity));
            document.getElementById('cityDisplay').textContent = currentCity.name;
            refreshPrayerTimes();
        }
    );
}

// ===== تغيير المدينة =====
const cityModal = document.getElementById('cityModal');
const cityModalClose = document.getElementById('cityModalClose');
const cityModalInput = document.getElementById('cityModalInput');
const citySuggestions = document.getElementById('citySuggestions');

function openCityModal() {
    cityModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    cityModalInput.value = '';
    cityModalInput.focus();
    showCitySuggestions('');
}

function closeCityModal() {
    cityModal.classList.remove('active');
    document.body.style.overflow = '';
}

document.getElementById('changeCityBtn').addEventListener('click', openCityModal);
cityModalClose.addEventListener('click', closeCityModal);
cityModal.addEventListener('click', (e) => {
    if (e.target === cityModal) closeCityModal();
});

cityModalInput.addEventListener('input', function() {
    showCitySuggestions(this.value);
});

function showCitySuggestions(query) {
    const filtered = cities.filter(city => city.name.includes(query) || query === '');
    
    if (filtered.length === 0) {
        citySuggestions.innerHTML = `
            <div style="width:100%;text-align:center;color:var(--color-text-lighter);padding:12px;">
                لا توجد نتائج
            </div>
        `;
        return;
    }
    
    citySuggestions.innerHTML = filtered.map(city => `
        <button class="city-suggestion" data-city="${city.name}" data-country="${city.country}">
            ${city.name}
        </button>
    `).join('');
    
    document.querySelectorAll('.city-suggestion').forEach(btn => {
        btn.addEventListener('click', function() {
            const name = this.dataset.city;
            const country = this.dataset.country;
            currentCity = cities.find(c => c.name === name && c.country === country) || { name, country };
            localStorage.setItem('prayerCity', JSON.stringify(currentCity));
            document.getElementById('cityDisplay').textContent = name;
            closeCityModal();
            showStatus('success', `تم التغيير إلى: ${name}`);
            refreshPrayerTimes();
        });
    });
}

document.getElementById('detectLocationModalBtn').addEventListener('click', () => {
    closeCityModal();
    detectLocation();
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

// ===== التهيئة =====
async function init() {
    await refreshPrayerTimes();
    
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(() => {
        refreshPrayerTimes();
        updateDate();
    }, 300000);
    
    setTimeout(() => {
        if (!localStorage.getItem('prayerCity')) {
            detectLocation();
        }
    }, 3000);
}

init();

console.log('🌙 خير أمة - صفحة أوقات الصلاة');
console.log(`المدينة: ${currentCity.name}`);