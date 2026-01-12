// Дополнительные API функции
class DatingAPI {
    // ... (основные методы из app.js)

    async updateUser(telegramId, userData) {
        return this.request(`/api/user/${telegramId}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    }

    async uploadPhoto(telegramId, file) {
        const formData = new FormData();
        formData.append('photo', file);
        
        return this.request(`/api/user/${telegramId}/photo`, {
            method: 'POST',
            body: formData,
        });
    }

    async getVisitors(telegramId) {
        return this.request(`/api/visitors/${telegramId}`);
    }

    async getConversations(telegramId) {
        return this.request(`/api/conversations/${telegramId}`);
    }

    async sendMessage(conversationId, message) {
        return this.request(`/api/messages/${conversationId}`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        });
    }
}

// Константы для приложения
const CONSTANTS = {
    INTERESTS: [
        "CS:GO", "Minecraft", "Программирование", "Аниме", "Музыка", "Спорт",
        "Кино", "Путешествия", "Книги", "Фотография", "Готовка", "Искусство",
        "Наука", "Танцы", "Игры", "Кофе", "Технологии", "Дизайн",
        "Балинсиага", "Brawl Stars", "Deadlock", "DIY", "Dota 2", "FL Studio",
        "Fortnite", "Hello Kitty", "K-pop", "LoL", "Looksmaxxing", "MLBB"
    ],
    
    SUBCULTURES: [
        "Не указывать", "Альтушка", "Анимешник", "Гот", "Гранж", "Гяру",
        "Джирай кей", "Дрилл", "Дрип", "Крипли няши", "Кэжуал", "Металлист",
        "Мори кей", "Неформал", "Нормис", "Ниша", "Панк", "Репер",
        "Скейтер", "Скинхед", "Скуф", "Фембой", "Фрик", "Хиппи", "Эмо"
    ],
    
    ZODIAC_SIGNS: [
        "Овен", "Телец", "Близнецы", "Рак", "Лев", "Дева",
        "Весы", "Скорпион", "Стрелец", "Козерог", "Водолей", "Рыбы"
    ],
    
    MBTI_TYPES: [
        "ISTJ", "ISFJ", "INFJ", "INTJ", "ISTP", "ISFP",
        "INFP", "INTP", "ESTP", "ESFP", "ENFP", "ENTP",
        "ESTJ", "ESFJ", "ENFJ", "ENTJ"
    ],
    
    RELATIONSHIP_GOALS: [
        "Дружба", "Отношения", "Свидания", "Флирт"
    ]
};

// Вспомогательные функции
function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) {
        return `${minutes} мин назад`;
    } else if (hours < 24) {
        return `${hours} ч назад`;
    } else if (days === 1) {
        return 'Вчера';
    } else {
        return `${days} дн назад`;
    }
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DatingAPI, CONSTANTS };
}