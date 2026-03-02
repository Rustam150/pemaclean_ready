// ===== ДАННЫЕ УСЛУГ =====
const servicesData = {
    apartment: [
        { name: "Генеральная уборка", price: 200, unit: "м²" },
        { name: "Поддерживающая уборка", price: 150, unit: "м²" },
        { name: "Уборка после ремонта", price: 250, unit: "м²" },
        { name: "Сложная уборка (после пожара)", price: 350, unit: "м²" },
        { name: "Кухня (комплексно)", price: 6000, unit: "шт" },
        { name: "Ванная (комплексно)", price: 4000, unit: "шт" }
    ],
    furniture: [
        { name: "Стул со спинкой", price: 700, unit: "шт" },
        { name: "Стул без спинки", price: 500, unit: "шт" },
        { name: "Пуфик", price: 800, unit: "шт" },
        { name: "Подушки от дивана", price: 250, unit: "шт" },
        { name: "Ковер, ковролин", price: 300, unit: "м²" },
        { name: "2-местный диван", price: 2500, unit: "шт" },
        { name: "3-местный диван", price: 3000, unit: "шт" },
        { name: "Угловой диван", price: 4000, unit: "шт" },
        { name: "П-образный диван", price: 5000, unit: "шт" },
        { name: "Кресло", price: 1000, unit: "шт" },
        { name: "Кухонный уголок", price: 2500, unit: "шт" },
        { name: "Матрас 2-спальный", price: 3500, unit: "шт" },
        { name: "Матрас 1,5-спальный", price: 2500, unit: "шт" },
        { name: "Матрас детский", price: 1500, unit: "шт" }
    ],
    windows: [
        { name: "Обычное мытье окон", price: 500, unit: "м²" },
        { name: "Мытье окон после ремонта", price: 700, unit: "м²" },
        { name: "Сложные окна (обычные)", price: 700, unit: "м²" },
        { name: "Сложные окна (после ремонта)", price: 900, unit: "м²" },
        { name: "Мытье москитных сеток", price: 100, unit: "м²" },
        { name: "Мытье оконных решеток", price: 100, unit: "м²" },
        { name: "Удаление плёнки", price: 100, unit: "м²" },
        { name: "Чистка рольставней", price: 1000, unit: "м²" },
        { name: "Чистка жалюзи", price: 200, unit: "м²" }
    ],
    house: [
        { name: "Душевая кабина", price: 1000, unit: "шт" },
        { name: "Межплиточные швы", price: 200, unit: "м²" },
        { name: "Мытье унитаза (очистка от камня)", price: 1000, unit: "шт" },
        { name: "Мытье люстры", price: 350, unit: "шт" },
        { name: "Мытье потолка", price: 50, unit: "м²" },
        { name: "Мытье пола", price: 50, unit: "м²" },
        { name: "Мытье пола после ремонта", price: 70, unit: "м²" },
        { name: "Чистка батарей (10 секций)", price: 500, unit: "шт" },
        { name: "Кухонная стеновая панель", price: 1000, unit: "шт" },
        { name: "Мытье посуды", price: 1000, unit: "час" },
        { name: "Полная чистка вытяжки", price: 1000, unit: "шт" },
        { name: "Чистка духовки", price: 1000, unit: "шт" },
        { name: "Глажка", price: 1000, unit: "час" },
        { name: "Порядок в гардеробе", price: 1000, unit: "час" },
        { name: "Пропылесосить пол (после ремонта)", price: 30, unit: "м²" },
        { name: "Постирать шторы (до 5м)", price: 1000, unit: "шт" },
        { name: "Мытье стен", price: 50, unit: "м²" },
        { name: "Мытье двора", price: 100, unit: "м²" },
        { name: "Лестничная площадка", price: 0, unit: "инд", individual: true }
    ]
};

const allServices = [...servicesData.apartment, ...servicesData.furniture, ...servicesData.windows, ...servicesData.house];

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function formatPrice(price) {
    return price.toLocaleString('ru-RU') + ' ₽';
}

function createPriceItem(service) {
    const div = document.createElement('div');
    div.className = 'price-item';
    let priceText = service.individual ? 'индивидуально' : `от ${service.price} ₽/${service.unit}`;
    div.innerHTML = `<span class="price-item-name">${service.name}</span><span class="price-item-value">${priceText}</span>`;
    return div;
}

function populatePriceGrids() {
    const grids = {
        'apartment-prices': servicesData.apartment,
        'furniture-prices': servicesData.furniture,
        'windows-prices': servicesData.windows,
        'house-prices': servicesData.house
    };
    for (const [id, services] of Object.entries(grids)) {
        const grid = document.getElementById(id);
        if (grid) {
            grid.innerHTML = '';
            services.forEach(service => grid.appendChild(createPriceItem(service)));
        }
    }
}

function populateCalculator() {
    const select = document.getElementById('serviceSelect');
    if (!select) return;
    select.innerHTML = '';
    allServices.forEach((service, index) => {
        const option = document.createElement('option');
        option.value = index;
        let priceText = service.individual ? 'цена договорная' : `${service.price} ₽/${service.unit}`;
        option.textContent = `${service.name} — ${priceText}`;
        select.appendChild(option);
    });
}

function updateCalculator() {
    const select = document.getElementById('serviceSelect');
    const quantity = parseFloat(document.getElementById('quantityInput')?.value) || 1;
    const priceElement = document.getElementById('calculatedPrice');
    if (!select || !priceElement) return;
    if (select.selectedIndex === -1) return;
    const service = allServices[select.selectedIndex];
    if (service.individual) {
        priceElement.textContent = 'по договоренности';
        return;
    }
    const total = service.price * quantity;
    priceElement.textContent = formatPrice(total);
}

// ===== ПРОВЕРКА АДМИНА =====
function isAdmin() {
    const hash = window.location.hash;
    const isAdminMode = hash === '#admin';
    if (isAdminMode) {
        document.body.classList.add('admin-mode');
    } else {
        document.body.classList.remove('admin-mode');
    }
    return isAdminMode;
}

// ===== СОЦСЕТИ =====
function openInstagram() {
    const username = 'pema_cleaning';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        window.location.href = `instagram://user?username=${username}`;
        setTimeout(() => window.open(`https://instagram.com/${username}`, '_blank'), 1000);
    } else {
        window.open(`https://instagram.com/${username}`, '_blank');
    }
}

function openWhatsApp() {
    const phone = '79885784206';
    const message = 'Здравствуйте! Хочу заказать уборку';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        window.location.href = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
        setTimeout(() => window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank'), 1000);
    } else {
        window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
    }
}

// ===== МОБИЛЬНОЕ МЕНЮ =====
function setupMobileMenu() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            navLinks.classList.toggle('show');
        });
        
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('show');
            });
        });
        
        document.addEventListener('click', function(e) {
            if (!navLinks.contains(e.target) && !menuBtn.contains(e.target)) {
                navLinks.classList.remove('show');
            }
        });
    }
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    const isMainPage = !path.includes('reviews.html') && !path.includes('works.html');
    
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, once: true });
    }
    
    setupMobileMenu();
    
    document.getElementById('instagramBtn')?.addEventListener('click', (e) => { e.preventDefault(); openInstagram(); });
    document.getElementById('instagramFooter')?.addEventListener('click', (e) => { e.preventDefault(); openInstagram(); });
    document.getElementById('whatsappBtn')?.addEventListener('click', (e) => { e.preventDefault(); openWhatsApp(); });
    document.getElementById('whatsappFooter')?.addEventListener('click', (e) => { e.preventDefault(); openWhatsApp(); });
    
    if (isMainPage) {
        populatePriceGrids();
        populateCalculator();
        updateCalculator();
        
        document.getElementById('serviceSelect')?.addEventListener('change', updateCalculator);
        document.getElementById('quantityInput')?.addEventListener('input', updateCalculator);
        
        document.getElementById('orderFromCalculator')?.addEventListener('click', function() {
            const select = document.getElementById('serviceSelect');
            const quantity = document.getElementById('quantityInput')?.value;
            const price = document.getElementById('calculatedPrice')?.textContent;
            if (!select || select.selectedIndex === -1) return;
            const service = allServices[select.selectedIndex];
            const message = `Здравствуйте! Хочу заказать уборку:\nУслуга: ${service.name}\nКоличество: ${quantity} ${service.unit}\nСтоимость: ${price}`;
            const phone = '79885784206';
            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
        });
    }
});

window.scrollTo(0, 0);
