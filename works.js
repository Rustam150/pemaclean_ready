// ===== ДАННЫЕ РАБОТ =====
// 6 парных работ (до/после) = 12 карточек + 3 одиночных фото (без надписей)
const worksData = [
    // ПАРНЫЕ ФОТО (до/после) - 6 работ = 12 карточек (с надписями До/После)
    // Работа 1 - Душевая кабина
    { id: 1, type: "before", image: "images/IMG-20260223-WA0004.jpg", workId: 1 },
    { id: 2, type: "after", image: "images/IMG-20260223-WA0000.jpg", workId: 1 },
    
    // Работа 2
    { id: 3, type: "before", image: "images/IMG-20260223-WA0005.jpg", workId: 2 },
    { id: 4, type: "after", image: "images/IMG-20260223-WA0001.jpg", workId: 2 },
    
    // Работа 3
    { id: 5, type: "before", image: "images/IMG-20260223-WA0002.jpg", workId: 3 },
    { id: 6, type: "after", image: "images/IMG-20260223-WA0006.jpg", workId: 3 },
    
    // Работа 4
    { id: 7, type: "before", image: "images/IMG-20260223-WA0012.jpg", workId: 4 },
    { id: 8, type: "after", image: "images/IMG-20260223-WA0003.jpg", workId: 4 },
    
    // Работа 5
    { id: 9, type: "before", image: "images/IMG-20260223-WA0009.jpg", workId: 5 },
    { id: 10, type: "after", image: "images/IMG-20260223-WA0010.jpg", workId: 5 },
    
    // Работа 6
    { id: 11, type: "before", image: "images/IMG-20260223-WA0007.jpg", workId: 6 },
    { id: 12, type: "after", image: "images/IMG-20260223-WA0011.jpg", workId: 6 },
    
    // ОДИНОЧНЫЕ ФОТО (только фото, без надписей) - 3 фото
    { id: 13, type: "single", image: "images/IMG-20260223-WA0008.jpg", workId: 7 },
     { id: 14, type: "result", image: "images/IMG-20260223-WA0013.jpg", workId: 8 },
    { id: 15, type: "result", image: "images/IMG-20260223-WA0014.jpg", workId: 9 }
];

// ===== ОТОБРАЖЕНИЕ РАБОТ =====
function displayWorks() {
    const container = document.getElementById('worksContainer');
    if (!container) return;
    
    container.innerHTML = worksData.map(item => {
        let badgeText = '';
        let badgeClass = '';
        
        if (item.type === 'before') {
            badgeText = 'До';
            badgeClass = 'before';
        } else if (item.type === 'after') {
            badgeText = 'После';
            badgeClass = 'after';
        } else {
            // Для одиночных фото не показываем надпись
            badgeText = '';
            badgeClass = '';
        }
        
        return `
            <div class="work-item" data-aos="fade-up" data-work-id="${item.workId}" data-image="${item.image}">
                <div class="work-item-image">
                    <img src="${item.image}" alt="Фото работы" loading="lazy">
                    ${badgeText ? `<span class="work-item-badge ${badgeClass}">${badgeText}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// ===== МОДАЛЬНОЕ ОКНО ДЛЯ ПРОСМОТРА ФОТО =====
function openImageModal(imageSrc) {
    const modal = document.createElement('div');
    modal.className = 'work-view-modal';
    modal.innerHTML = `
        <div class="work-view-content">
            <span class="work-view-close">&times;</span>
            <img src="${imageSrc}" alt="Просмотр фото">
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    modal.querySelector('.work-view-close').addEventListener('click', function() {
        modal.remove();
        document.body.style.overflow = 'auto';
    });
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    });
    
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.body.style.overflow = 'auto';
            document.removeEventListener('keydown', escHandler);
        }
    });
}

// ===== НАСТРОЙКА КЛИКОВ НА ФОТО =====
function setupPhotoClicks() {
    document.querySelectorAll('.work-item').forEach(item => {
        item.addEventListener('click', function() {
            const imageSrc = this.dataset.image;
            if (imageSrc) {
                openImageModal(imageSrc);
            }
        });
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, once: true });
    }
    
    displayWorks();
    setTimeout(setupPhotoClicks, 500);
});