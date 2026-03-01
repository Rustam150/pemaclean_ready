// ===== ADMIN PANEL MODULE (IIFE) =====
(function() {
    'use strict';

    // ===== КОНФИГУРАЦИЯ =====
    const ADMIN_PASSWORD = 'admin0987';
    const SUPABASE_URL = 'https://gxdaszzavrbrlwoqzyoe.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_sdkcgSWRjvbO8zPB22h5mQ_h9xqGwry';

    let supabaseClient = null;
    let isAuthenticated = false;

    // ===== ФУНКЦИИ ЗАЩИТЫ =====
    
    const DANGEROUS_PATTERNS = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe/gi,
        /<object/gi,
        /<embed/gi,
        /eval\(/gi,
        /expression\(/gi,
        /vbscript:/gi,
        /data:text\/html/gi
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

    // ===== ИНИЦИАЛИЗАЦИЯ SUPABASE =====
    function initSupabase() {
        if (supabaseClient) return supabaseClient;
        
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase инициализирован (admin.js)');
        } else {
            console.error('❌ Supabase SDK не загружен');
        }
        return supabaseClient;
    }

    // ===== АВТОРИЗАЦИЯ =====
    function login(password) {
        if (password === ADMIN_PASSWORD) {
            isAuthenticated = true;
            localStorage.setItem('adminAuth', 'true');
            localStorage.setItem('adminAuthTime', Date.now().toString());
            showAdminPanel();
            return true;
        } else {
            alert('❌ Неверный пароль');
            return false;
        }
    }

    window.logout = function() {
        isAuthenticated = false;
        localStorage.removeItem('adminAuth');
        localStorage.removeItem('adminAuthTime');
        location.reload();
    };

    function checkAuth() {
        const auth = localStorage.getItem('adminAuth');
        const authTime = localStorage.getItem('adminAuthTime');
        
        // Сессия действительна 24 часа
        if (auth && authTime) {
            const elapsed = Date.now() - parseInt(authTime);
            if (elapsed < 24 * 60 * 60 * 1000) {
                isAuthenticated = true;
                showAdminPanel();
                return true;
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

    // ===== УПРАВЛЕНИЕ ОТЗЫВАМИ =====
    async function loadReviews() {
        const sb = initSupabase();
        if (!sb) return;

        const reviewsList = document.getElementById('reviewsList');
        reviewsList.innerHTML = '<div class="loading">Загрузка отзывов...</div>';

        try {
            const { data, error } = await sb
                .from('reviews')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Ошибка загрузки отзывов:', error);
                reviewsList.innerHTML = '<div class="no-reviews">Ошибка при загрузке отзывов</div>';
                return;
            }

            if (!data || data.length === 0) {
                reviewsList.innerHTML = '<div class="no-reviews">Отзывов не найдено</div>';
                return;
            }

            reviewsList.innerHTML = data.map(review => {
                const photoUrls = review.photo_urls || [];
                const starsDisplay = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
                const date = new Date(review.created_at).toLocaleDateString('ru-RU');

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
                            <button class="delete-btn" onclick="deleteReview('${review.id}')">
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

        const sb = initSupabase();
        if (!sb) return;

        try {
            const { error } = await sb
                .from('reviews')
                .delete()
                .eq('id', reviewId);

            if (error) {
                console.error('❌ Ошибка удаления:', error);
                alert('Ошибка при удалении отзыва');
            } else {
                console.log('✅ Отзыв удален');
                alert('Отзыв успешно удален');
                loadReviews();
                loadStats();
            }
        } catch (err) {
            console.error('❌ Ошибка:', err);
            alert('Произошла ошибка при удалении');
        }
    };

    // ===== СТАТИСТИКА =====
    async function loadStats() {
        const sb = initSupabase();
        if (!sb) return;

        try {
            const { data, error } = await sb
                .from('reviews')
                .select('*');

            if (error || !data) {
                console.error('❌ Ошибка загрузки статистики:', error);
                return;
            }

            const totalReviews = data.length;
            const avgRating = totalReviews > 0 
                ? (data.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
                : 0;
            const reviewsWithPhotos = data.filter(r => r.photo_urls && r.photo_urls.length > 0).length;

            document.getElementById('totalReviews').textContent = totalReviews;
            document.getElementById('avgRating').textContent = avgRating;
            document.getElementById('reviewsWithPhotos').textContent = reviewsWithPhotos;
        } catch (err) {
            console.error('❌ Ошибка:', err);
        }
    }

    // ===== УПРАВЛЕНИЕ ВКЛАДКАМИ =====
    window.switchTab = function(tabName) {
        // Скрываем все вкладки
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Убираем активный класс со всех кнопок
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Показываем нужную вкладку
        document.getElementById(tabName + 'Tab').classList.add('active');

        // Добавляем активный класс нужной кнопке
        event.target.classList.add('active');

        // Загружаем данные для вкладки
        if (tabName === 'stats') {
            loadStats();
        } else if (tabName === 'reviews') {
            loadReviews();
        }
    };

    // ===== НАСТРОЙКИ =====
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

        const settings = {
            title: title,
            description: description,
            phone: phone,
            email: email
        };

        localStorage.setItem('siteSettings', JSON.stringify(settings));
        alert('Settings saved');
    };

    // ===== ИНИЦИАЛИЗАЦИЯ =====
    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ Admin panel loaded');

        // Инициализируем Supabase
        initSupabase();

        // Проверяем авторизацию
        if (checkAuth()) {
            showAdminPanel();
        } else {
            showLoginForm();
        }

        // Обработчик формы входа
        document.getElementById('loginForm').addEventListener('submit', function(e) {
            e.preventDefault();
            const password = document.getElementById('password').value;
            login(password);
        });
    });

})(); // Конец IIFE
