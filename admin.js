(function() {
    'use strict';

    const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
    const APPWRITE_PROJECT_ID = 'pemaclean-reviews';
    const APPWRITE_DATABASE_ID = '69a608a7001e7c65d92a';
    const APPWRITE_COLLECTION_ID = 'reviews';

    const { Client, Databases, Account, Query } = Appwrite;
    const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
    const databases = new Databases(client);
    const account = new Account(client);

    let isAuthenticated = false;
    let currentUser = null;

    const DANGEROUS_PATTERNS = [
        /<script[^>]*>.*?<\/script>/gi, /javascript:/gi, /on\w+\s*=/gi,
        /<iframe/gi, /<object/gi, /<embed/gi, /eval\(/gi, /expression\(/gi,
        /vbscript:/gi, /data:text\/html/gi
    ];

    function containsDangerousCode(input) {
        if (typeof input !== 'string') return false;
        return DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
    }

    function sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    function validateAndCleanInput(input, maxLength = 500) {
        if (typeof input !== 'string') return '';
        if (containsDangerousCode(input)) {
            alert('⚠️ Ислам сац везар хьо');
            console.warn('🚨 Попытка инъекции:', input);
            return null;
        }
        let cleaned = sanitizeInput(input);
        cleaned = cleaned.substring(0, maxLength).trim();
        return cleaned;
    }

    async function login(email, password) {
        try {
            await account.createEmailPasswordSession(email, password);
            const user = await account.get();
            isAuthenticated = true;
            currentUser = user;
            localStorage.setItem('adminAuth', 'true');
            localStorage.setItem('adminAuthTime', Date.now().toString());
            showAdminPanel();
            return true;
        } catch (error) {
            console.error('❌ Ошибка входа:', error);
            const errorEl = document.getElementById('loginError');
            if (errorEl) {
                errorEl.textContent = '❌ Неверный email или пароль';
            }
            return false;
        }
    }

    async function logout() {
        try {
            await account.deleteSession('current');
        } catch (e) {
            console.error('Ошибка выхода:', e);
        }
        isAuthenticated = false;
        currentUser = null;
        localStorage.removeItem('adminAuth');
        localStorage.removeItem('adminAuthTime');
        location.reload();
    }

    async function checkAuth() {
        const auth = localStorage.getItem('adminAuth');
        const authTime = localStorage.getItem('adminAuthTime');
        
        if (auth && authTime) {
            const elapsed = Date.now() - parseInt(authTime);
            if (elapsed < 24 * 60 * 60 * 1000) {
                try {
                    const user = await account.get();
                    isAuthenticated = true;
                    currentUser = user;
                    showAdminPanel();
                    return true;
                } catch (e) {
                    console.log('Сессия истекла:', e);
                    localStorage.removeItem('adminAuth');
                    localStorage.removeItem('adminAuthTime');
                }
            }
        }
        return false;
    }

    function showAdminPanel() {
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadReviews();
        loadStats();
        loadSettings();
    }

    function showLoginForm() {
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('adminPanel').style.display = 'none';
    }

    async function loadReviews() {
        const reviewsList = document.getElementById('reviewsList');
        reviewsList.innerHTML = '<div class="loading">Загрузка отзывов...</div>';

        try {
            const response = await databases.listDocuments(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ID,
                [Query.orderDesc('$createdAt')]
            );

            const data = response.documents;

            if (!data || data.length === 0) {
                reviewsList.innerHTML = '<div class="no-reviews">Отзывов не найдено</div>';
                return;
            }

            reviewsList.innerHTML = data.map(review => {
                const photoUrls = review.photo_urls || [];
                const starsDisplay = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
                const date = new Date(review.$createdAt).toLocaleDateString('ru-RU');

                let photosHtml = '';
                if (photoUrls.length > 0) {
                    photosHtml = `
                        <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
                            ${photoUrls.map((url, idx) => `
                                <img src="${url}" alt="photo-${idx}" style="max-width: 100px; max-height: 100px; border-radius: 5px; cursor: pointer;" onclick="window.open('${url}', '_blank')">
                            `).join('')}
                        </div>
                    `;
                }

                return `
                    <div class="review-item">
                        <div class="review-item-content">
                            <div class="review-item-header">
                                <span class="review-item-name">${review.name}</span>
                                <span class="review-item-rating">${starsDisplay}</span>
                            </div>
                            <p class="review-item-text">"${review.text}"</p>
                            ${photosHtml}
                            <span class="review-item-date">${date}</span>
                        </div>
                        <div class="review-item-actions">
                            <button class="delete-btn" onclick="deleteReview('${review.$id}')">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (err) {
            console.error('❌ Ошибка:', err);
            reviewsList.innerHTML = '<div class="no-reviews">Произошла ошибка</div>';
        }
    }

    window.deleteReview = async function(reviewId) {
        if (!confirm('Вы уверены, что хотите удалить этот отзыв?')) return;

        try {
            await databases.deleteDocument(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ID,
                reviewId
            );
            console.log('✅ Отзыв удален');
            alert('Отзыв успешно удален');
            loadReviews();
            loadStats();
        } catch (err) {
            console.error('❌ Ошибка удаления:', err);
            alert('Ошибка при удалении отзыва');
        }
    };

    async function loadStats() {
        try {
            const response = await databases.listDocuments(
                APPWRITE_DATABASE_ID,
                APPWRITE_COLLECTION_ID,
                []
            );
            const data = response.documents;

            const totalReviews = data.length;
            const avgRating = totalReviews > 0 
                ? (data.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
                : 0;
            const reviewsWithPhotos = data.filter(r => r.photo_urls && r.photo_urls.length > 0).length;

            document.getElementById('totalReviews').textContent = totalReviews;
            document.getElementById('avgRating').textContent = avgRating;
            document.getElementById('reviewsWithPhotos').textContent = reviewsWithPhotos;
        } catch (err) {
            console.error('❌ Ошибка статистики:', err);
        }
    }

    window.switchTab = function(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(tabName + 'Tab').classList.add('active');
        event.target.classList.add('active');
        if (tabName === 'stats') loadStats();
        else if (tabName === 'reviews') loadReviews();
    };

    function loadSettings() {
        const settings = JSON.parse(localStorage.getItem('siteSettings') || '{}');
        document.getElementById('siteTitle').value = settings.title || 'PemaCleaning';
        document.getElementById('siteDescription').value = settings.description || 'Премиальный клининг в Ростове-на-Дону';
        document.getElementById('sitePhone').value = settings.phone || '';
        document.getElementById('siteEmail').value = settings.email || '';
    }

    window.saveSettings = function() {
        let title = document.getElementById('siteTitle').value;
        let description = document.getElementById('siteDescription').value;
        let phone = document.getElementById('sitePhone').value;
        let email = document.getElementById('siteEmail').value;

        title = validateAndCleanInput(title, 100);
        description = validateAndCleanInput(description, 500);
        phone = validateAndCleanInput(phone, 50);
        email = validateAndCleanInput(email, 100);

        if (!title || !description) {
            alert('Error: Invalid data');
            return;
        }

        const settings = { title, description, phone, email };
        localStorage.setItem('siteSettings', JSON.stringify(settings));
        alert('Settings saved');
    };

    document.addEventListener('DOMContentLoaded', async function() {
        console.log('✅ Admin panel loaded');
        
        const authChecked = await checkAuth();
        if (authChecked) {
            showAdminPanel();
        } else {
            showLoginForm();
        }

        document.getElementById('loginForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await login(email, password);
        });
    });

})();