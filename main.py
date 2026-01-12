from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json
from typing import List, Optional
from pydantic import BaseModel

from database import get_db, engine
from models import User, Like, Match, Visit

app = FastAPI(title="Dating WebApp API", version="1.0")

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на домен фронтенда
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модели Pydantic
class UserCreate(BaseModel):
    telegram_id: int
    username: Optional[str] = None
    name: str
    age: int
    gender: str
    show_gender: str
    country: str
    city: str
    height: Optional[int] = None
    weight: Optional[int] = None
    zodiac: Optional[str] = None
    mbti: Optional[str] = None
    subculture: Optional[str] = None
    monthly_income: Optional[int] = None
    relationship_goal: Optional[str] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = []
    favorite_artists: Optional[List[str]] = []

class UserUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    city: Optional[str] = None
    height: Optional[int] = None
    weight: Optional[int] = None
    zodiac: Optional[str] = None
    mbti: Optional[str] = None
    subculture: Optional[str] = None
    monthly_income: Optional[int] = None
    relationship_goal: Optional[str] = None
    bio: Optional[str] = None
    interests: Optional[List[str]] = None
    favorite_artists: Optional[List[str]] = None

class ProfileResponse(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    city: str
    height: Optional[int]
    weight: Optional[int]
    zodiac: Optional[str]
    mbti: Optional[str]
    subculture: Optional[str]
    monthly_income: Optional[int]
    relationship_goal: Optional[str]
    bio: Optional[str]
    interests: List[str]
    photo_ids: Optional[List[str]]
    is_premium: bool
    swipes_left: int

class SwipeRequest(BaseModel):
    target_user_id: int
    is_like: bool

# Вспомогательные функции
def reset_daily_swipes(db: Session):
    """Сбросить дневные свайпы для всех пользователей"""
    yesterday = datetime.now() - timedelta(days=1)
    users = db.query(User).filter(User.updated_at < yesterday).all()
    for user in users:
        user.swipes_today = 0
    db.commit()

# API endpoints
@app.get("/")
def read_root():
    return {"message": "Dating WebApp API", "status": "online"}

@app.get("/api/user/{telegram_id}")
def get_user(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return ProfileResponse(
        id=user.id,
        name=user.name,
        age=user.age,
        gender=user.gender,
        city=user.city,
        height=user.height,
        weight=user.weight,
        zodiac=user.zodiac,
        mbti=user.mbti,
        subculture=user.subculture,
        monthly_income=user.monthly_income,
        relationship_goal=user.relationship_goal,
        bio=user.bio,
        interests=json.loads(user.interests) if user.interests else [],
        photo_ids=json.loads(user.photo_ids) if user.photo_ids else [],
        is_premium=user.is_premium,
        swipes_left=user.swipes_limit - user.swipes_today
    )

@app.post("/api/user")
def create_user(user_data: UserCreate, db: Session = Depends(get_db)):
    # Проверяем, существует ли пользователь
    existing_user = db.query(User).filter(User.telegram_id == user_data.telegram_id).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Создаем нового пользователя
    user = User(
        telegram_id=user_data.telegram_id,
        username=user_data.username,
        name=user_data.name,
        age=user_data.age,
        gender=user_data.gender,
        show_gender=user_data.show_gender,
        country=user_data.country,
        city=user_data.city,
        height=user_data.height,
        weight=user_data.weight,
        zodiac=user_data.zodiac,
        mbti=user_data.mbti,
        subculture=user_data.subculture,
        monthly_income=user_data.monthly_income,
        relationship_goal=user_data.relationship_goal,
        bio=user_data.bio,
        interests=json.dumps(user_data.interests or []),
        favorite_artists=json.dumps(user_data.favorite_artists or []),
        photo_ids=json.dumps([]),
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"message": "User created successfully", "user_id": user.id}

@app.put("/api/user/{telegram_id}")
def update_user(telegram_id: int, user_data: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Обновляем только переданные поля
    update_data = user_data.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        if field in ['interests', 'favorite_artists']:
            setattr(user, field, json.dumps(value))
        else:
            setattr(user, field, value)
    
    db.commit()
    return {"message": "User updated successfully"}

@app.get("/api/profiles/next/{telegram_id}")
def get_next_profile(telegram_id: int, db: Session = Depends(get_db)):
    reset_daily_swipes(db)
    
    current_user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="Current user not found")
    
    # Проверяем лимит свайпов
    if current_user.swipes_today >= current_user.swipes_limit and not current_user.is_premium:
        raise HTTPException(status_code=429, detail="Daily swipe limit reached")
    
    # Получаем ID пользователей, которых уже свайпали
    swiped_users = db.query(Like.to_user_id).filter(
        Like.from_user_id == current_user.id
    ).all()
    swiped_ids = [s[0] for s in swiped_users]
    swiped_ids.append(current_user.id)
    
    # Фильтруем по предпочтениям
    gender_filter = current_user.show_gender
    if gender_filter == "all":
        gender_filter = None
    
    # Ищем следующего пользователя
    query = db.query(User).filter(
        User.is_active == True,
        User.id.notin_(swiped_ids)
    )
    
    if gender_filter:
        query = query.filter(User.gender == gender_filter)
    
    next_user = query.order_by(User.created_at.desc()).first()
    
    if not next_user:
        return {"message": "No more profiles available"}
    
    # Записываем просмотр
    visit = Visit(visitor_id=current_user.id, profile_id=next_user.id)
    db.add(visit)
    db.commit()
    
    return {
        "id": next_user.id,
        "name": next_user.name,
        "age": next_user.age,
        "gender": next_user.gender,
        "city": next_user.city,
        "country": next_user.country,
        "height": next_user.height,
        "weight": next_user.weight,
        "zodiac": next_user.zodiac,
        "mbti": next_user.mbti,
        "subculture": next_user.subculture,
        "monthly_income": next_user.monthly_income,
        "relationship_goal": next_user.relationship_goal,
        "bio": next_user.bio,
        "interests": json.loads(next_user.interests) if next_user.interests else [],
        "photo_ids": json.loads(next_user.photo_ids) if next_user.photo_ids else [],
        "swipes_left": current_user.swipes_limit - current_user.swipes_today
    }

@app.post("/api/swipe")
def swipe_profile(swipe: SwipeRequest, telegram_id: int, db: Session = Depends(get_db)):
    current_user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="Current user not found")
    
    # Проверяем лимит
    if current_user.swipes_today >= current_user.swipes_limit and not current_user.is_premium:
        raise HTTPException(status_code=429, detail="Daily swipe limit reached")
    
    # Создаем лайк/дизлайк
    like = Like(
        from_user_id=current_user.id,
        to_user_id=swipe.target_user_id,
        is_like=swipe.is_like
    )
    
    # Обновляем счетчик свайпов
    current_user.swipes_today += 1
    
    # Проверяем взаимный лайк
    mutual_like = db.query(Like).filter(
        Like.from_user_id == swipe.target_user_id,
        Like.to_user_id == current_user.id,
        Like.is_like == True
    ).first()
    
    is_match = False
    if swipe.is_like and mutual_like:
        # Создаем мэтч
        match = Match(
            user1_id=min(current_user.id, swipe.target_user_id),
            user2_id=max(current_user.id, swipe.target_user_id)
        )
        db.add(match)
        is_match = True
    
    db.add(like)
    db.commit()
    
    return {
        "success": True,
        "is_match": is_match,
        "swipes_left": current_user.swipes_limit - current_user.swipes_today
    }

@app.get("/api/matches/{telegram_id}")
def get_matches(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Находим мэтчи
    matches = db.query(Match).filter(
        (Match.user1_id == user.id) | (Match.user2_id == user.id),
        Match.is_active == True
    ).all()
    
    match_list = []
    for match in matches:
        partner_id = match.user2_id if match.user1_id == user.id else match.user1_id
        partner = db.query(User).filter(User.id == partner_id).first()
        
        if partner:
            match_list.append({
                "id": partner.id,
                "name": partner.name,
                "age": partner.age,
                "city": partner.city,
                "photo_ids": json.loads(partner.photo_ids) if partner.photo_ids else []
            })
    
    return {"matches": match_list}

@app.get("/api/stats/{telegram_id}")
def get_stats(telegram_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.telegram_id == telegram_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Количество лайков полученных
    likes_received = db.query(Like).filter(
        Like.to_user_id == user.id,
        Like.is_like == True
    ).count()
    
    # Количество просмотров профиля
    profile_visits = db.query(Visit).filter(Visit.profile_id == user.id).count()
    
    # Количество мэтчей
    matches_count = db.query(Match).filter(
        (Match.user1_id == user.id) | (Match.user2_id == user.id),
        Match.is_active == True
    ).count()
    
    return {
        "likes_received": likes_received,
        "profile_visits": profile_visits,
        "matches_count": matches_count,
        "swipes_today": user.swipes_today,
        "swipes_limit": user.swipes_limit
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)