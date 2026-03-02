// ===== ИНИЦИАЛИЗАЦИЯ APPWRITE =====
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = 'pemaclean-reviews';
const APPWRITE_DATABASE_ID = '69a608a7001e7c65d92a';
const APPWRITE_COLLECTION_ID = 'reviews';
const APPWRITE_BUCKET_ID = 'review-photos';

// Инициализация Appwrite клиента
const { Client, Databases, Storage, ID, Query } = Appwrite;

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const storage = new Storage(client);

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function compressImage(file, maxWidth = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
        };
    });
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function isAdmin() {
    const hash = window.location.hash;
    console.log('📍 Хеш URL:', hash);
    return hash === '#admin';
}

let photoBefore = null;
let photoAfter = null;

// ===== ЗАГРУЗКА ФОТО В APPWRITE STORAGE =====
async function uploadPhoto(file) {
    try {
        const compressedBlob = await compressImage(file, 1080, 0.8);
        const fileId = ID.unique();
        const response = await storage.createFile(
            APPWRITE_BUCKET_ID,
            fileId,
            compressedBlob
        );
        
        // Получаем публичную ссылку на фото
        const fileUrl = storage.getFileView(APPWRITE_BUCKET_ID, fileId);
        return fileUrl.toString();
    } catch (error) {
        console.error('Ошибка загрузки фото:', error);
        throw error;
    }
}

// ===== ЗАГРУЗКА ОТЗЫВОВ ИЗ APPWRITE =====
async function loadReviews() {
    try {
        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID,
            [Query.orderDesc('$createdAt')]
        );
        return response.documents;
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
        return [];
    }
}

// ===== СОХРАНЕНИЕ ОТЗЫВА В APPWRITE =====
async function saveReview(name, rating, text, photoUrls = []) {
    try {
        const response = await databases.createDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID,
            ID.unique(),
            {
                name: name,
                rating: parseInt(rating),
                text: text,
                photo_urls: photoUrls
            }
        );
        return response;
    } catch (error) {
        console.error('Ошибка сохранения отзыва:', error);
        throw error;
    }
}

// ===== УДАЛЕНИЕ ОТЗЫВА ИЗ APPWRITE =====
async function deleteReviewFromAppwrite(reviewId) {
    try {
        await databases.deleteDocument(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID,
            reviewId
        );
        return true;
    } catch (error) {
        console.error('Ошибка удаления отзыва:', error);
        throw error;
    }
}

window.handlePhotoUpload = async function(input, type) {
    const file = input.files[0];
    if (!file || !file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
    }

    try {
        const previewImg = document.getElementById(type === 'before' ? 'previewBefore' : 'previewAfter');
        const uploadArea = document.getElementById(type === 'before' ? 'uploadAreaBefore' : 'uploadAreaAfter');
        const removeBtn = document.getElementById(type === 'before' ? 'removeBefore' : 'removeAfter');

        // Показываем превью
        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);

        // Сохраняем файл для последующей загрузки
        if (type === 'before') {
            photoBefore = file;
        } else {
            photoAfter = file;
        }

        if (uploadArea) {
            const placeholder = uploadArea.querySelector('.upload-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
        }

        if (removeBtn) {
            removeBtn.style.display = 'inline-flex';
        }
    } catch (error) {
        console.error('Ошибка загрузки фото:', error);
        alert('Ошибка при загрузке фото');
    }
};

window.removePhoto = function(type) {
    const previewImg = document.getElementById(type === 'before' ? 'previewBefore' : 'previewAfter');
    const uploadArea = document.getElementById(type === 'before' ? 'uploadAreaBefore' : 'uploadAreaAfter');
    const input = document.getElementById(type === 'before' ? 'photoBefore' : 'photoAfter');
    const removeBtn = document.getElementById(type === 'before' ? 'removeBefore' : 'removeAfter');

    if (type === 'before') {
        photoBefore = null;
    } else {
        photoAfter = null;
    }

    if (previewImg) {
        previewImg.src = '';
        previewImg.style.display = 'none';
    }

    if (uploadArea) {
        const placeholder = uploadArea.querySelector('.upload-placeholder');
        if (placeholder) {
            placeholder.style.display = 'flex';
        }
    }

    if (removeBtn) {
        removeBtn.style.display = 'none';
    }

    if (input) {
        input.value = '';
    }
};

async function getPhotosFromForm() {
    const photos = [];
    
    if (photoBefore) {
        try {
            const url = await uploadPhoto(photoBefore);
            photos.push(url);
        } catch (error) {
            console.error('Ошибка загрузки фото ДО:', error);
        }
    }
    
    if (photoAfter) {
        try {
            const url = await uploadPhoto(photoAfter);
            photos.push(url);
        } catch (error) {
            console.error('Ошибка загрузки фото ПОСЛЕ:', error);
        }
    }
    
    return photos;
}

async function displayReviews() {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading">Загрузка отзывов...</div>';
    
    const reviews = await loadReviews();
    const admin = isAdmin();
    
    if (reviews.length === 0) {
        container.innerHTML = '<div class="no-reviews">Пока нет отзывов. Будьте первым!</div>';
        return;
    }
    
    container.innerHTML = reviews.map(review => {
        const hasPhotos = review.photo_urls && review.photo_urls.length > 0;
        const photosHtml = hasPhotos ? (review.photo_urls.length === 1 ? 
            `<div class="review-photos"><div class="review-photo-item review-photo-single" onclick="openFullscreen('${review.photo_urls[0]}', 'Фото')">
                <img src="${review.photo_urls[0]}" alt="photo">
                <span class="review-photo-label">Фото</span>
            </div></div>` : 
            `<div class="review-photos">
                <div class="review-photo-item" onclick="openFullscreen('${review.photo_urls[0]}', 'До')">
                    <img src="${review.photo_urls[0]}" alt="до">
                    <span class="review-photo-label">До</span>
                </div>
                <div class="review-photo-item" onclick="openFullscreen('${review.photo_urls[1]}', 'После')">
                    <img src="${review.photo_urls[1]}" alt="после">
                    <span class="review-photo-label">После</span>
                </div>
            </div>`) : '';
        
        const starsDisplay = '★'.repeat(review.rating) + '☆'.repeat(5-review.rating);
        const date = new Date(review.$createdAt).toLocaleDateString('ru-RU');
        
        return `
            <div class="review-card" data-aos="fade-up">
                <div class="review-header">
                    <div class="review-avatar">${getInitials(review.name)}</div>
                    <div>
                        <h4>${review.name}</h4>
                        <div class="review-stars">${starsDisplay}</div>
                    </div>
                </div>
                <p class="review-text">"${review.text}"</p>
                ${photosHtml}
                <div class="review-footer">
                    <span class="review-date">${date}</span>
                    ${admin ? `<button class="delete-review-btn" onclick="deleteReview('${review.$id}')"><i class="fas fa-trash"></i> Удалить</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.deleteReview = async function(reviewId) {
    console.log('🗑️ Попытка удалить отзыв:', reviewId);
    
    if (!isAdmin()) {
        console.log('❌ Не админ');
        alert('У вас нет прав для удаления');
        return;
    }
    
    if (confirm('Удалить этот отзыв?')) {
        try {
            await deleteReviewFromAppwrite(reviewId);
            await displayReviews();
            console.log('✅ Отзыв удален');
        } catch (error) {
            console.error('❌ Ошибка удаления:', error);
            alert('Ошибка при удалении отзыва');
        }
    }
};

function openFullscreen(imgSrc, label) {
    const modal = document.createElement('div');
    modal.className = 'fullscreen-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close-modal">&times;</span>
            <img src="${imgSrc}" alt="${label}">
            <div class="modal-label">${label}</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM загружен');
    
    if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, once: true });
    }
    
    displayReviews();
    
    if (window.location.hash === '#admin') {
        setTimeout(() => alert('Режим администратора: кнопки удаления активны'), 500);
    }
    
    document.getElementById('reviewForm')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('reviewName')?.value.trim();
        const rating = document.getElementById('reviewRating')?.value;
        const text = document.getElementById('reviewText')?.value.trim();
        
        if (!name || !text) {
            alert('Пожалуйста, заполните все поля');
            return;
        }
        
        try {
            const photoUrls = await getPhotosFromForm();
            await saveReview(name, rating, text, photoUrls);
            
            // Сброс формы
            this.reset();
            
            // Сброс фото
            photoBefore = null;
            photoAfter = null;
            
            const previewBefore = document.getElementById('previewBefore');
            const previewAfter = document.getElementById('previewAfter');
            const uploadAreaBefore = document.getElementById('uploadAreaBefore');
            const uploadAreaAfter = document.getElementById('uploadAreaAfter');
            const removeBefore = document.getElementById('removeBefore');
            const removeAfter = document.getElementById('removeAfter');
            const photoBeforeInput = document.getElementById('photoBefore');
            const photoAfterInput = document.getElementById('photoAfter');

            if (previewBefore) previewBefore.style.display = 'none';
            if (previewAfter) previewAfter.style.display = 'none';
            
            if (uploadAreaBefore) {
                const ph = uploadAreaBefore.querySelector('.upload-placeholder');
                if (ph) ph.style.display = 'flex';
            }
            if (uploadAreaAfter) {
                const ph = uploadAreaAfter.querySelector('.upload-placeholder');
                if (ph) ph.style.display = 'flex';
            }
            
            if (removeBefore) removeBefore.style.display = 'none';
            if (removeAfter) removeAfter.style.display = 'none';
            if (photoBeforeInput) photoBeforeInput.value = '';
            if (photoAfterInput) photoAfterInput.value = '';
            
            await displayReviews();
            alert('✅ Спасибо за ваш отзыв!');
            
        } catch (error) {
            console.error('Ошибка:', error);
            alert('❌ Ошибка при сохранении отзыва');
        }
    });
});