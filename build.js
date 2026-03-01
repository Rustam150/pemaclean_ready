const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔨 Запуск сборки...');

// Проверяем наличие .env
if (!process.env.ADMIN_PASSWORD) {
    console.error('❌ Ошибка: Файл .env не найден или не содержит переменных');
    process.exit(1);
}

// Читаем admin.js
let adminJs = fs.readFileSync('admin.js', 'utf8');

// Заменяем CONFIG на реальные значения из .env
adminJs = adminJs.replace(
    /const CONFIG = {[\s\S]*?};/,
    `const CONFIG = {
    ADMIN_PASSWORD: '${process.env.ADMIN_PASSWORD}',
    SUPABASE_URL: '${process.env.SUPABASE_URL}',
    SUPABASE_ANON_KEY: '${process.env.SUPABASE_ANON_KEY}'
};`
);

// Сохраняем как admin.prod.js
fs.writeFileSync('admin.prod.js', adminJs);
console.log('✅ Файл admin.prod.js создан успешно!');