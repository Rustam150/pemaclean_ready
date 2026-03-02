// ===== REVIEWS MODULE (IIFE) =====
// Это изолированный модуль, чтобы избежать конфликтов переменных
(function() {
    'use strict';

    // ===== КОНФИГУРАЦИЯ SUPABASE =====
    const SUPABASE_URL = '/supabase-api';
    const SUPABASE_ANON_KEY = 'sb_publishable_sdkcgSWRjvbO8zPB22h5mQ_h9xqGwry';

    // Инициализация клиента Supabase
    let supabaseClient = null;

    function initSupabase() {
        if (supabaseClient) return supabaseClient;
        
        if (window.supabase) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase инициализирован');
        } else {
            console.error('❌ Supabase SDK не загружен. Проверьте подключение скрипта в HTML.');
        }
        return supabaseClient;
    }

    // ===== ФУНКЦИИ ЗАЩИТЫ И ВАЛИДАЦИИ =====
    
    // Паттерны для обнаружения вредоносного кода
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
        /data:text\/html/gi,
        /<img[^>]*on/gi,
        /<svg[^>]*on/gi,
        /alert\(/gi,
        /confirm\(/gi,
        /prompt\(/gi
    ];

    // Функция для проверки на опасный контент
    function containsDangerousCode(input) {
        if (typeof input !== 'string') return false;
        return DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
    }

    // Функция для санитизации HTML
    function sanitizeInput(input) {
        if (typeof input !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    // Функция для валидации и очистки текста
    function validateAndCleanInput(input, maxLength = 1000) {
        if (typeof input !== 'string') return '';
        
        // Проверяем на опасный код
        if (containsDangerousCode(input)) {
            alert('⚠️ Ислам сац везар хьо');
            console.warn('🚨 Попытка инъекции вредоносного кода:', input);
            return null;
        }
        
        // Санитизируем
        let cleaned = sanitizeInput(input);
        
        // Обрезаем до максимальной длины
        cleaned = cleaned.substring(0, maxLength).trim();
        
        return cleaned;
    }

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
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }

    // Переменные для хранения выбранных файлов
    let photoBeforeFile = null;
    let photoAfterFile = null;

    // Функция для обработки выбора фото
    window.handlePhotoUpload = async function(input, type) {
        const file = input.files[0];
        if (!file || !file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение');
            return;
        }

        const previewImg = document.getElementById(type === 'before' ? 'previewBefore' : 'previewAfter');
        const uploadArea = document.getElementById(type === 'before' ? 'uploadAreaBefore' : 'uploadAreaAfter');
        const removeBtn = document.getElementById(type === 'before' ? 'removeBefore' : 'removeAfter');

        // Показываем превью (локально через URL.createObjectURL)
        if (previewImg && uploadArea && removeBtn) {
            previewImg.src = URL.createObjectURL(file);
            previewImg.style.display = 'block';
            uploadArea.querySelector('.upload-placeholder').style.display = 'none';
            removeBtn.style.display = 'block';
        }

        // Сохраняем файл для последующей загрузки
        if (type === 'before') {
            photoBeforeFile = file;
        } else {
            photoAfterFile = file;
        }
    };

    // Функция для удаления выбранного фото
    window.removePhoto = function(type) {
        const previewImg = document.getElementById(type === 'before' ? 'previewBefore' : 'previewAfter');
        const uploadArea = document.getElementById(type === 'before' ? 'uploadAreaBefore' : 'uploadAreaAfter');
        const removeBtn = document.getElementById(type === 'before' ? 'removeBefore' : 'removeAfter');
        const input = document.getElementById(type === 'before' ? 'photoBefore' : 'photoAfter');

        if (previewImg && uploadArea && removeBtn && input) {
            previewImg.src = '';
            previewImg.style.display = 'none';
            uploadArea.querySelector('.upload-placeholder').style.display = 'flex';
            removeBtn.style.display = 'none';
            input.value = '';
        }

        if (type === 'before') {
            photoBeforeFile = null;
        } else {
            photoAfterFile = null;
        }
    };

    // Функция загрузки изображения в Supabase Storage
    async function uploadToSupabase(file, type) {
        if (!file) return null;
        
        const sb = initSupabase();
        if (!sb) {
            console.error('❌ Supabase не инициализирован');
            return null;
        }
        
        try {
            // Сжимаем перед загрузкой
            const compressedBlob = await compressImage(file);
            const fileExt = 'jpg';
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}_${type}.${fileExt}`;
            const filePath = `reviews/${fileName}`;

            console.log(`📤 Загружаем файл: ${filePath}`);

            const { data, error } = await sb.storage
                .from('review-photos')
                .upload(filePath, compressedBlob);

            if (error) {
                console.error('❌ Ошибка загрузки в Storage:', error);
                return null;
            }

            console.log('✅ Файл загружен:', data);

            const { data: publicUrlData } = sb.storage
                .from('review-photos')
                .getPublicUrl(filePath);

            console.log('🔗 Публичный URL:', publicUrlData.publicUrl);
            return publicUrlData.publicUrl;
        } catch (err) {
            console.error('❌ Ошибка при загрузке:', err);
            return null;
        }
    }

    // ===== РАБОТА С ДАННЫМИ =====

    async function loadReviews() {
        const sb = initSupabase();
        if (!sb) {
            console.error('❌ Supabase не инициализирован');
            return [];
        }
        
        try {
            console.log('📥 Загружаем отзывы из Supabase...');
            const { data, error } = await sb
                .from('reviews')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Ошибка загрузки отзывов:', error);
                return [];
            }
            
            console.log(`✅ Загружено отзывов: ${data ? data.length : 0}`, data);
            return data || [];
        } catch (err) {
            console.error('❌ Ошибка при загрузке отзывов:', err);
            return [];
        }
    }

    async function deleteReview(reviewId) {
        if (window.location.hash !== '#admin') {
            alert('У вас нет прав для удаления');
            return;
        }
        
        const sb = initSupabase();
        if (!sb) {
            alert('Supabase не инициализирован');
            return;
        }
        
        if (confirm('Удалить этот отзыв?')) {
            try {
                const { error } = await sb
                    .from('reviews')
                    .delete()
                    .eq('id', reviewId);

                if (error) {
                    console.error('❌ Ошибка удаления:', error);
                    alert('Ошибка при удалении: ' + error.message);
                } else {
                    console.log('✅ Отзыв удален');
                    displayReviews();
                }
            } catch (err) {
                console.error('❌ Ошибка при удалении отзыва:', err);
                alert('Произошла ошибка при удалении отзыва');
            }
        }
    }

    // Экспортируем функцию в глобальную область для использования в onclick
    window.deleteReview = deleteReview;

    async function displayReviews() {
        const container = document.getElementById('reviewsContainer');
        if (!container) return;
        
        container.innerHTML = '<div class="loading">Загрузка отзывов...</div>';
        
        const reviews = await loadReviews();
        const admin = window.location.hash === '#admin';
        
        if (reviews.length === 0) {
            container.innerHTML = '<div class="no-reviews">Пока нет отзывов. Будьте первым!</div>';
            return;
        }
        
        container.innerHTML = reviews.map(review => {
            const photoUrls = review.photo_urls || [];
            const hasPhotos = photoUrls && photoUrls.length > 0;
            
            let photosHtml = '';
            if (hasPhotos) {
                if (photoUrls.length === 1) {
                    photosHtml = `
                        <div class="review-photos">
                            <div class="review-photo-item review-photo-single">
                                <img src="${photoUrls[0]}" alt="photo" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%23999%22%3EФото%3C/text%3E%3C/svg%3E'">
                                <span class="review-photo-label">Фото</span>
                            </div>
                        </div>`;
                } else {
                    photosHtml = `
                        <div class="review-photos">
                            <div class="review-photo-item">
                                <img src="${photoUrls[0]}" alt="до" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%23999%22%3EДо%3C/text%3E%3C/svg%3E'">
                                <span class="review-photo-label">До</span>
                            </div>
                            <div class="review-photo-item">
                                <img src="${photoUrls[1]}" alt="после" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%23999%22%3EПосле%3C/text%3E%3C/svg%3E'">
                                <span class="review-photo-label">После</span>
                            </div>
                        </div>`;
                }
            }
            
            const starsDisplay = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            const date = new Date(review.created_at).toLocaleDateString('ru-RU');
            
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
                        ${admin ? `<button class="delete-review-btn" onclick="deleteReview('${review.id}')"><i class="fas fa-trash"></i> Удалить</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Переинициализируем AOS для новых элементов
        if (typeof AOS !== 'undefined') {
            AOS.refresh();
        }
    }

    // ===== ИНИЦИАЛИЗАЦИЯ =====

    document.addEventListener('DOMContentLoaded', function() {
        console.log('✅ DOM загружен (reviews.js)');
        
        // Инициализируем Supabase
        initSupabase();
        
        if (typeof AOS !== 'undefined') {
            AOS.init({ duration: 800, once: true });
        }
        
        // Отображаем отзывы при загрузке страницы
        displayReviews();
        
        if (window.location.hash === '#admin') {
            console.log('👑 Режим администратора активен');
        }
        
        const form = document.getElementById('reviewForm');
        if (form) {
            form.addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const sb = initSupabase();
                if (!sb) {
                    alert('Supabase не инициализирован. Проверьте конфигурацию.');
                    return;
                }
                
                const submitBtn = form.querySelector('.btn-submit-review');
                const originalBtnText = submitBtn.innerHTML;
                
                let name = document.getElementById('reviewName')?.value.trim();
                const rating = document.getElementById('reviewRating')?.value;
                let text = document.getElementById('reviewText')?.value.trim();
                
                // Валидируем и очищаем данные
                name = validateAndCleanInput(name, 100);
                text = validateAndCleanInput(text, 1000);
                
                if (!name || !text) {
                    alert('Пожалуйста, заполните имя и текст отзыва');
                    return;
                }

                try {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Публикация...';

                    console.log('📝 Начинаем добавление отзыва...');

                    // 1. Загружаем фото в Storage
                    const photoUrls = [];
                    if (photoBeforeFile) {
                        console.log('📤 Загружаем фото ДО...');
                        const url = await uploadToSupabase(photoBeforeFile, 'before');
                        if (url) {
                            photoUrls.push(url);
                            console.log('✅ Фото ДО загружено');
                        }
                    }
                    if (photoAfterFile) {
                        console.log('📤 Загружаем фото ПОСЛЕ...');
                        const url = await uploadToSupabase(photoAfterFile, 'after');
                        if (url) {
                            photoUrls.push(url);
                            console.log('✅ Фото ПОСЛЕ загружено');
                        }
                    }

                    // 2. Сохраняем отзыв в Database
                    console.log('💾 Сохраняем отзыв в базу данных...');
                    const { data, error } = await sb
                        .from('reviews')
                        .insert([
                            { 
                                name, 
                                rating: parseInt(rating), 
                                text, 
                                photo_urls: photoUrls.length > 0 ? photoUrls : null
                            }
                        ]);

                    if (error) {
                        console.error('❌ Ошибка при сохранении отзыва:', error);
                        throw error;
                    }

                    console.log('✅ Отзыв успешно сохранен:', data);

                    // 3. Сброс формы и обновление
                    form.reset();
                    window.removePhoto('before');
                    window.removePhoto('after');
                    
                    const ratingSelect = document.getElementById('reviewRating');
                    if (ratingSelect) ratingSelect.value = '5';
                    
                    alert('Спасибо за ваш отзыв!');
                    await displayReviews();

                } catch (err) {
                    console.error('❌ Ошибка при отправке:', err);
                    alert('Произошла ошибка при отправке отзыва. Проверьте консоль браузера для деталей.');
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            });
        }
    });

})(); // Конец IIFE
