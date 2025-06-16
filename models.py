from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# 注意：db 應該從 app.py 傳入並初始化
# 通常 app.py 裡會寫：db = SQLAlchemy(app)
db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    notes = db.relationship('Note', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'

class Note(db.Model):
    __tablename__ = 'note'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    date = db.Column(db.String(10), nullable=False)  # 格式 YYYY-MM-DD
    text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Note {self.date} - {self.text[:10]}>'
