from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(Integer, unique=True, index=True)
    username = Column(String(100))
    name = Column(String(50))
    age = Column(Integer)
    gender = Column(String(20))  # male/female/other
    show_gender = Column(String(20))  # male/female/all
    country = Column(String(100))
    city = Column(String(100))
    height = Column(Integer)  # in cm
    weight = Column(Integer)  # in kg
    zodiac = Column(String(20))
    mbti = Column(String(10))
    subculture = Column(String(50))
    monthly_income = Column(Integer)
    relationship_goal = Column(String(50))  # friendship/dating/relationship/flirt
    bio = Column(Text)
    interests = Column(JSON)  # List of interests
    favorite_artists = Column(JSON)  # List of artists
    photo_ids = Column(JSON)  # List of Telegram file_ids
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)
    swipes_today = Column(Integer, default=0)
    swipes_limit = Column(Integer, default=60)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

class Like(Base):
    __tablename__ = "likes"
    
    id = Column(Integer, primary_key=True, index=True)
    from_user_id = Column(Integer, index=True)
    to_user_id = Column(Integer, index=True)
    is_like = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, index=True)
    user1_id = Column(Integer, index=True)
    user2_id = Column(Integer, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)

class Visit(Base):
    __tablename__ = "visits"
    
    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(Integer, index=True)
    profile_id = Column(Integer, index=True)
    created_at = Column(DateTime, default=datetime.now)