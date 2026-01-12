// Основной файл JavaScript для приложения
class DatingApp {
    constructor() {
        this.tg = null;
        this.currentUser = null;
        this.currentProfile = null;
        this.api = new DatingAPI();
        this.init();
    }

    async init() {
        // Инициализация Telegram Web App
        if (window.Telegram && window.Telegram.WebApp) {
            this.tg = Telegram.WebApp;
            this.tg.expand();
            this.tg.enableClosingConfirmation();
            
            // Получаем данные пользователя из Telegram
            const user = this.tg.initDataUnsafe?.user;
            if (user) {
                this.currentUser = user;
                console.log('Telegram User:', user);
                await this.checkRegistration(user);
            } else {
                this.showScreen('loadingScreen');
                setTimeout(() => this.showScreen('rulesScreen'), 1500);
            }
        } else {
            // Режим разработки (без Telegram)
            this.showScreen('rulesScreen');
            this.currentUser = {
                id: 123456789,
                first_name: 'Тест',
                username: 'test_user'
            };
        }

        this.setupEventListeners();
    }

    async checkRegistration(user) {
        try {
            const response = await this.api.getUser(user.id);
            if (response) {
                this.currentUser.profile = response;
                this.showMainApp();
            } else {
                this.showScreen('rulesScreen');
            }
        } catch (error) {
            console.log('Пользователь не зарегистрирован:', error);
            this.showScreen('rulesScreen');
        }
    }

    setupEventListeners() {
        // Принятие правил
        document.getElementById('acceptRules').addEventListener('click', () => {
            this.showScreen('regStep1');
        });

        // Регистрация - Шаг 1
        const regInputs = document.querySelectorAll('#regStep1 input, #regStep1 select');
        regInputs.forEach(input => {
            input.addEventListener('input', this.validateStep1.bind(this));
        });

        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.validateStep1();
            });
        });

        document.querySelectorAll('.show-gender-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.show-gender-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.validateStep1();
            });
        });

        document.getElementById('regCountry').addEventListener('change', (e) => {
            const cityInput = document.getElementById('regCity');
            cityInput.disabled = !e.target.value;
            if (e.target.value) {
                cityInput.placeholder = 'Введите ваш город';
            }
            this.validateStep1();
        });

        document.getElementById('nextStep1').addEventListener('click', () => {
            this.saveStep1();
            this.showScreen('regStep2');
        });

        // Навигация
        document.getElementById('menuBtn').addEventListener('click', () => {
            document.getElementById('sideMenu').classList.add('active');
        });

        document.getElementById('closeMenu').addEventListener('click', () => {
            document.getElementById('sideMenu').classList.remove('active');
        });

        // Действия с карточкой
        document.getElementById('likeBtn').addEventListener('click', () => this.handleSwipe(true));
        document.getElementById('dislikeBtn').addEventListener('click', () => this.handleSwipe(false));

        // Нижняя навигация
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.showSection(section);
                
                // Обновляем активные кнопки
                document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        // Меню
        document.querySelectorAll('.menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const action = e.currentTarget.dataset.action;
                this.handleMenuAction(action);
                document.getElementById('sideMenu').classList.remove('active');
            });
        });

        // Модальные окна
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.hideModal());
        });

        document.getElementById('modalOverlay').addEventListener('click', () => this.hideModal());
    }

    validateStep1() {
        const name = document.getElementById('regName').value.trim();
        const age = document.getElementById('regAge').value;
        const gender = document.querySelector('.gender-btn.active');
        const showGender = document.querySelector('.show-gender-btn.active');
        const country = document.getElementById('regCountry').value;
        const city = document.getElementById('regCity').value.trim();

        const isValid = name.length >= 2 && 
                       age >= 18 && age <= 100 &&
                       gender && showGender &&
                       country && city.length >= 2;

        document.getElementById('nextStep1').disabled = !isValid;
    }

    async saveStep1() {
        const userData = {
            telegram_id: this.currentUser.id,
            username: this.currentUser.username,
            name: document.getElementById('regName').value.trim(),
            age: parseInt(document.getElementById('regAge').value),
            gender: document.querySelector('.gender-btn.active').dataset.gender,
            show_gender: document.querySelector('.show-gender-btn.active').dataset.show,
            country: document.getElementById('regCountry').value,
            city: document.getElementById('regCity').value.trim()
        };

        try {
            const response = await this.api.createUser(userData);
            this.currentUser.profile = response;
            console.log('Пользователь создан:', response);
        } catch (error) {
            console.error('Ошибка создания пользователя:', error);
            alert('Ошибка при создании профиля. Попробуйте еще раз.');
        }
    }

    async showMainApp() {
        this.showScreen('mainApp');
        await this.loadNextProfile();
        await this.updateStats();
    }

    async loadNextProfile() {
        try {
            this.currentProfile = await this.api.getNextProfile(this.currentUser.id);
            
            if (this.currentProfile.message) {
                // Нет больше анкет
                this.showNoProfiles();
                return;
            }

            // Обновляем интерфейс
            document.getElementById('profileName').textContent = 
                `${this.currentProfile.name}, ${this.currentProfile.age}`;
            document.getElementById('profileLocation').textContent = 
                `${this.currentProfile.city}, ${this.currentProfile.country}`;
            
            if (this.currentProfile.height) {
                document.getElementById('profileHeight').textContent = this.currentProfile.height;
            }
            
            if (this.currentProfile.weight) {
                document.getElementById('profileWeight').textContent = this.currentProfile.weight;
            }
            
            if (this.currentProfile.monthly_income) {
                document.getElementById('profileIncome').textContent = 
                    this.formatIncome(this.currentProfile.monthly_income);
            }
            
            if (this.currentProfile.zodiac) {
                document.getElementById('zodiacBadge').textContent = 
                    `${this.getZodiacSymbol(this.currentProfile.zodiac)} ${this.currentProfile.zodiac}`;
            }
            
            if (this.currentProfile.mbti) {
                document.getElementById('mbtiBadge').textContent = this.currentProfile.mbti;
            }
            
            if (this.currentProfile.subculture) {
                document.getElementById('profileSubculture').textContent = this.currentProfile.subculture;
            }
            
            if (this.currentProfile.relationship_goal) {
                document.getElementById('profileGoal').textContent = this.currentProfile.relationship_goal;
            }
            
            if (this.currentProfile.bio) {
                document.getElementById('profileBio').textContent = this.currentProfile.bio;
            }
            
            // Обновляем интересы
            const interestsContainer = document.getElementById('interestsContainer');
            interestsContainer.innerHTML = '';
            
            if (this.currentProfile.interests && this.currentProfile.interests.length > 0) {
                this.currentProfile.interests.forEach(interest => {
                    const chip = document.createElement('div');
                    chip.className = 'interest-chip';
                    chip.textContent = interest;
                    interestsContainer.appendChild(chip);
                });
            }
            
            // Обновляем счетчик свайпов
            if (this.currentProfile.swipes_left !== undefined) {
                document.getElementById('swipeCount').textContent = this.currentProfile.swipes_left;
            }
            
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
            this.showNoProfiles();
        }
    }

    async handleSwipe(isLike) {
        if (!this.currentProfile) return;
        
        try {
            const response = await this.api.swipeProfile(
                this.currentUser.id,
                this.currentProfile.id,
                isLike
            );
            
            // Обновляем счетчик
            document.getElementById('swipeCount').textContent = response.swipes_left;
            
            if (response.is_match) {
                this.showMatchNotification(this.currentProfile.name);
            }
            
            // Загружаем следующую анкету
            setTimeout(() => {
                this.loadNextProfile();
            }, 500);
            
        } catch (error) {
            console.error('Ошибка свайпа:', error);
            
            if (error.message.includes('limit')) {
                alert('Достигнут дневной лимит свайпов. Купите Премиум для безлимитного доступа.');
            }
        }
    }

    showMatchNotification(name) {
        document.getElementById('matchName').textContent = `Вы понравились ${name}`;
        document.getElementById('matchNotification').classList.add('active');
        
        document.getElementById('continueBtn').addEventListener('click', () => {
            document.getElementById('matchNotification').classList.remove('active');
        });
        
        document.getElementById('sendMessageBtn').addEventListener('click', () => {
            alert('Функция чата будет доступна в следующем обновлении!');
            document.getElementById('matchNotification').classList.remove('active');
        });
    }

    async updateStats() {
        try {
            const stats = await this.api.getStats(this.currentUser.id);
            
            document.getElementById('likesBadge').textContent = stats.likes_received || 0;
            document.getElementById('matchesBadge').textContent = stats.matches_count || 0;
            document.getElementById('visitorsBadge').textContent = stats.profile_visits || 0;
            
            // Для экрана профиля
            document.getElementById('myLikesCount').textContent = stats.likes_received || 0;
            document.getElementById('myVisitsCount').textContent = stats.profile_visits || 0;
            document.getElementById('myMatchesCount').textContent = stats.matches_count || 0;
            
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    showSection(section) {
        // Здесь будет логика переключения между разделами
        console.log('Показать раздел:', section);
        
        switch(section) {
            case 'feed':
                this.loadNextProfile();
                break;
            case 'likes':
                this.showLikesScreen();
                break;
            case 'matches':
                this.showMatchesScreen();
                break;
            case 'profile':
                this.showProfileScreen();
                break;
        }
    }

    showLikesScreen() {
        // Логика отображения лайков
        alert('Раздел "Лайки" в разработке');
    }

    async showMatchesScreen() {
        try {
            const matches = await this.api.getMatches(this.currentUser.id);
            console.log('Мэтчи:', matches);
            alert(`У вас ${matches.matches?.length || 0} мэтчей`);
        } catch (error) {
            console.error('Ошибка загрузки мэтчей:', error);
        }
    }

    showProfileScreen() {
        if (this.currentUser.profile) {
            document.getElementById('myProfileName').textContent = 
                `${this.currentUser.profile.name}, ${this.currentUser.profile.age}`;
            document.getElementById('myProfileLocation').textContent = 
                `${this.currentUser.profile.city}, ${this.currentUser.profile.country}`;
        }
        this.showScreen('profileScreen');
    }

    handleMenuAction(action) {
        switch(action) {
            case 'myProfile':
                this.showProfileScreen();
                break;
            case 'editProfile':
                this.showEditModal();
                break;
            case 'buyPremium':
                this.showPremiumModal();
                break;
            case 'logout':
                if (confirm('Вы уверены, что хотите выйти?')) {
                    location.reload();
                }
                break;
            default:
                alert(`Функция "${action}" в разработке`);
        }
    }

    showEditModal() {
        // Логика отображения модального окна редактирования
        alert('Редактирование профиля в разработке');
    }

    showPremiumModal() {
        alert('Премиум функции:\n• Безлимитные свайпы\n• Видим, кто лайкнул\n• Приоритет в ленте\n• Расширенные фильтры');
    }

    showNoProfiles() {
        // Показать сообщение, что анкет больше нет
        document.getElementById('profileName').textContent = 'Анкет больше нет';
        document.getElementById('profileBio').textContent = 'Заходите позже или измените фильтры поиска.';
        document.getElementById('interestsContainer').innerHTML = '';
    }

    formatIncome(income) {
        if (income >= 1000000) {
            return `${(income / 1000000).toFixed(1)}M ₽`;
        } else if (income >= 1000) {
            return `${(income / 1000).toFixed(0)}K ₽`;
        }
        return `${income} ₽`;
    }

    getZodiacSymbol(zodiac) {
        const symbols = {
            'Овен': '♈', 'Телец': '♉', 'Близнецы': '♊',
            'Рак': '♋', 'Лев': '♌', 'Дева': '♍',
            'Весы': '♎', 'Скорпион': '♏', 'Стрелец': '♐',
            'Козерог': '♑', 'Водолей': '♒', 'Рыбы': '♓'
        };
        return symbols[zodiac] || '♈';
    }

    hideModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.getElementById('modalOverlay').classList.remove('active');
    }
}

class DatingAPI {
    constructor() {
        this.baseURL = 'https://qe-flame.vercel.app/'; // Замените на ваш URL бэкенда
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`; 
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP error ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async getUser(telegramId) {
        return this.request(`/api/user/${telegramId}`);
    }

    async createUser(userData) {
        return this.request('/api/user', {
            method: 'POST',
            body: JSON.stringify(userData),
        });
    }

    async getNextProfile(telegramId) {
        return this.request(`/api/profiles/next/${telegramId}`);
    }

    async swipeProfile(telegramId, targetUserId, isLike) {
        return this.request(`/api/swipe?telegram_id=${telegramId}`, {
            method: 'POST',
            body: JSON.stringify({
                target_user_id: targetUserId,
                is_like: isLike,
            }),
        });
    }

    async getMatches(telegramId) {
        return this.request(`/api/matches/${telegramId}`);
    }

    async getStats(telegramId) {
        return this.request(`/api/stats/${telegramId}`);
    }
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
    window.app = new DatingApp();
});