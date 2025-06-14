from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from models import db, User, Note
import os

app = Flask(__name__)
app.secret_key = 'your-secret-key'

# Database setup
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'calendar.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Routes
@app.route('/')
def index():
    return render_template('index.html', username=session.get('username'))

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username exists'}), 400
    user = User(username=data['username'], password=data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'Registered successfully'})

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username'], password=data['password']).first()
    if user:
        session['username'] = user.username
        return jsonify({'message': 'Login successful'})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('index'))

@app.route('/notes', methods=['GET'])
def get_notes():
    user = None
    if 'username' in session:
        user = User.query.filter_by(username=session['username']).first()
    
    all_notes = Note.query.filter_by(user_id=user.id if user else None).all()
    note_dict = {}
    for note in all_notes:
        note_dict.setdefault(note.date, []).append({'id': note.id, 'text': note.text})
    return jsonify(note_dict)

@app.route('/notes', methods=['POST'])
def add_note():
    data = request.get_json()
    date = data.get('date')
    text = data.get('text')
    username = session.get('username')

    if username:
        user = User.query.filter_by(username=username).first()
    else:
        user = None

    # 限制：未登入狀態，同一天只能寫一筆（以 user_id=None 判定）
    if not user:
        existing = Note.query.filter_by(user_id=None, date=date).first()
        if existing:
            return jsonify({'error': '未登入狀態下一天只能新增一筆備註，請登入以新增更多！'}), 403

    note = Note(user_id=user.id if user else None, date=date, text=text)
    db.session.add(note)
    db.session.commit()
    return jsonify({'message': 'Note added'})

@app.route('/notes/<int:note_id>', methods=['DELETE'])
def delete_note(note_id):
    user = None
    if 'username' in session:
        user = User.query.filter_by(username=session['username']).first()
    
    note = Note.query.get(note_id)
    if note and (user and note.user_id == user.id or (not user and note.user_id is None)):
        db.session.delete(note)
        db.session.commit()
        return jsonify({'message': 'Note deleted'})
    return jsonify({'error': 'Not found or not authorized'}), 404

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
