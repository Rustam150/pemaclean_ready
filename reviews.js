const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = 'pemaclean-reviews';
const APPWRITE_DATABASE_ID = '69a608a7001e7c65d92a';
const APPWRITE_COLLECTION_ID = 'reviews';
const APPWRITE_BUCKET_ID = 'review-photos';

const { Client, Databases, Storage, ID, Query } = Appwrite;

const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

const databases = new Databases(client);
const storage = new Storage(client);

const REVIEWS_PER_PAGE = 10;
let loadedCount = 0;
let hasMore = true;
let isLoading = false;

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
    return window.location.hash === '#admin';
}

let photoBefore = null;
let photoAfter = null;

async function uploadPhoto(file) {
    try {
        const compressedBlob = await compressImage(file, 1080, 0.8);
        const fileId = ID.unique();
        
        // Конвертируем Blob в File для Appwrite
        const compressedFile = new File(
            [compressedBlob],
            file.name || `photo-${Date.now()}.jpg`,
            { type: compressedBlob.type || 'image/jpeg' }
        );
        
        await storage.createFile(
            APPWRITE_BUCKET_ID,
            fileId,
            compressedFile
        );
        
        return storage.getFileView(APPWRITE_BUCKET_ID, fileId).toString();
    } catch (error) {
        console.error('Ошибка загрузки фото:', error);
        throw error;
    }
}

async function loadReviews(limit = REVIEWS_PER_PAGE, offset = 0) {
    try {
        const queries = [
            Query.orderDesc('$createdAt'),
            Query.limit(limit),
            Query.offset(offset)
        ];
        
        const response = await databases.listDocuments(
            APPWRITE_DATABASE_ID,
            APPWRITE_COLLECTION_ID,
            queries
        );
        
        hasMore = response.total > (offset + limit);
        return response.documents;
    } catch (error) {
        console.error('Ошибка загрузки отзывов:', error);
        return [];
    }
}

async function saveReview(name, rating, text, photoUrls = []) {
    try {
        return await databases.createDocument(
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
    } catch (error) {
        console.error('Ошибка сохранения отзыва:', error);
        throw error;
    }
}

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

function renderReview(review, admin) {
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
}

async function displayReviews(append = false) {
    const container = document.getElementById('reviewsContainer');
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const statusEl = document.getElementById('loadMoreStatus');
    
    if (!container) return;
    
    if (!append) {
        container.innerHTML = '<div class="loading">Загрузка отзывов...</div>';
        loadedCount = 0;
    }
    
    if (isLoading) return;
    isLoading = true;
    
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
    }
    
    const admin = isAdmin();
    const reviews = await loadReviews(REVIEWS_PER_PAGE, loadedCount);
    
    if (reviews.length === 0 && !append) {
        container.innerHTML = '<div class="no-reviews">Пока нет отзывов. Будьте первым!</div>';
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        isLoading = false;
        return;
    }
    
    if (!append) {
        container.innerHTML = '';
    }
    
    reviews.forEach(review => {
        container.insertAdjacentHTML('beforeend', renderReview(review, admin));
    });
    
    loadedCount += reviews.length;
    
    if (loadMoreBtn) {
        if (hasMore) {
            loadMoreBtn.style.display = 'inline-flex';
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Загрузить ещё';
            if (statusEl) statusEl.textContent = `Показано ${loadedCount} из ${reviews.length > 0 ? 'многих' : loadedCount} отзывов`;
        } else {
            loadMoreBtn.style.display = 'none';
            if (statusEl) statusEl.textContent = `Все отзывы загружены (${loadedCount})`;
        }
    }
    
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
    
    isLoading = false;
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

        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewImg) {
                previewImg.src = e.target.result;
                previewImg.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);

        if (type === 'before') {
            photoBefore = file;
        } else {
            photoAfter = file;
        }

        if (uploadArea) {
            const placeholder = uploadArea.querySelector('.upload-placeholder');
            if (placeholder) placeholder.style.display = 'none';
        }
        if (removeBtn) removeBtn.style.display = 'inline-flex';
        
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

    if (type === 'before') photoBefore = null;
    else photoAfter = null;

    if (previewImg) {
        previewImg.src = '';
        previewImg.style.display = 'none';
    }
    if (uploadArea) {
        const placeholder = uploadArea.querySelector('.upload-placeholder');
        if (placeholder) placeholder.style.display = 'flex';
    }
    if (removeBtn) removeBtn.style.display = 'none';
    if (input) input.value = '';
};

async function getPhotosFromForm() {
    const photos = [];
    if (photoBefore) {
        try { photos.push(await uploadPhoto(photoBefore)); } 
        catch (error) { console.error('Ошибка загрузки фото ДО:', error); }
    }
    if (photoAfter) {
        try { photos.push(await uploadPhoto(photoAfter)); } 
        catch (error) { console.error('Ошибка загрузки фото ПОСЛЕ:', error); }
    }
    return photos;
}

window.deleteReview = async function(reviewId) {
    if (!isAdmin()) {
        alert('У вас нет прав для удаления');
        return;
    }
    
    if (confirm('Удалить этот отзыв?')) {
        try {
            await deleteReviewFromAppwrite(reviewId);
            loadedCount = 0;
            hasMore = true;
            await displayReviews(false);
        } catch (error) {
            console.error('Ошибка удаления:', error);
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
    
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            modal.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    if (typeof AOS !== 'undefined') AOS.init({ duration: 800, once: true });
    
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            displayReviews(true);
        });
    }
    
    displayReviews(false);
    
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
            
            this.reset();
            photoBefore = null;
            photoAfter = null;
            
            ['Before', 'After'].forEach(suffix => {
                const preview = document.getElementById(`preview${suffix}`);
                const area = document.getElementById(`uploadArea${suffix}`);
                const remove = document.getElementById(`remove${suffix}`);
                const input = document.getElementById(`photo${suffix}`);
                
                if (preview) preview.style.display = 'none';
                if (area) {
                    const ph = area.querySelector('.upload-placeholder');
                    if (ph) ph.style.display = 'flex';
                }
                if (remove) remove.style.display = 'none';
                if (input) input.value = '';
            });
            
            loadedCount = 0;
            hasMore = true;
            await displayReviews(false);
            alert('✅ Спасибо за ваш отзыв!');
            
        } catch (error) {
            console.error('Ошибка:', error);
            alert('❌ Ошибка при сохранении отзыва');
        }
    });
});