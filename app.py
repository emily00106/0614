from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from models import db, User, Note  # 從 models.py 引入資料庫和模型
import os

# 初始化 Flask 應用和資料庫
app = Flask(__name__)
app.secret_key = 'your-secret-key'

# 資料庫設定
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'calendar.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# 初始化資料庫
db.init_app(app)  # 確保將 app 與 db 綁定

# 設定上傳檔案的儲存路徑
UPLOAD_FOLDER = 'static/images'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

# 檢查檔案格式是否允許
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

# 初始化管理員帳號
def initialize_admin_user():
    # 確保在 Flask 應用上下文中運行
    with app.app_context():
        # 檢查是否已經有 'emily' 帳號
        admin_user = User.query.filter_by(username='emily').first()

        if admin_user:
            print("Admin user 'emily' already exists.")
        else:
            # 創建 'emily' 用戶並設置密碼
            new_admin_user = User(username='emily', password='emily', is_admin=True)

            # 將管理員用戶加入資料庫
            db.session.add(new_admin_user)
            db.session.commit()
            print("Admin user 'emily' created successfully.")

# 路由設定
@app.route('/')
def index():
    return render_template('index.html', username=session.get('username'))

# @app.route('/register', methods=['POST'])
# def register():
#     data = request.get_json()
#     if User.query.filter_by(username=data['username']).first():
#         return jsonify({'error': 'Username exists'}), 400
#     user = User(username=data['username'], password=data['password'])
#     db.session.add(user)
#     db.session.commit()
#     return jsonify({'message': 'Registered successfully'})

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        # 確保是從表單提交的資料
        username = request.form.get('username')
        password = request.form.get('password')
        
        # 確保用戶名和密碼不為空
        if not username or not password:
            return render_template('register.html', error="Username and password cannot be empty")

        # 檢查用戶名是否已存在
        if User.query.filter_by(username=username).first():
            return render_template('register.html', error="Username already exists")
        
        # 創建新用戶
        user = User(username=username, password=password)
        try:
            db.session.add(user)
            db.session.commit()
            return redirect(url_for('payment'))  # 註冊成功後跳轉到付款頁面
        except Exception as e:
            db.session.rollback()
            return render_template('register.html', error=f"Error registering user: {e}")

    return render_template('register.html')

@app.route('/payment')
def payment():
    return render_template('payment.html')

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data['username'], password=data['password']).first()
    if user:
        session['username'] = user.username
        session['is_admin'] = user.is_admin
        return jsonify({'message': 'Login successful'})
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/logout', methods=['GET'])
def logout():
    session.pop('username', None)  # 清除 username
    session.pop('is_admin', None)  # 清除 admin 權限
    return redirect(url_for('index'))  # 跳轉回首頁


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

@app.route('/admin/reset', methods=['DELETE'])
def reset_all():
    # 檢查當前用戶是否為管理員
    if session.get('username') != 'emily' or not session.get('is_admin'):
        return jsonify({'error': '只有管理員（emily）可以執行此操作'}), 403

    # 清除所有備註
    Note.query.delete()
    
    # 保留管理員帳號，刪除所有其他用戶資料
    User.query.filter(User.username != 'emily').delete()  # 刪除所有使用者資料，保留 'emily'
    
    db.session.commit()
    
    return jsonify({'message': '已重置所有備註與使用者（保留管理員 emily）'})

# # 路由處理圖片上傳
# @app.route('/upload', methods=['POST'])
# def upload_file():
#     if 'file' not in request.files:
#         return redirect(request.url)
#     file = request.files['file']
    
#     if file and allowed_file(file.filename):
#         # 取得檔案名稱
#         filename = file.filename
#         # 儲存圖片
#         file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
#         return render_template('index.html', filename=filename)
    
#     return redirect(request.url)

# 路由處理圖片上傳
@app.route('/upload', methods=['POST'])
def upload_file():
    # 確保用戶已登入
    if 'username' not in session:
        return redirect(url_for('login'))  # 未登入，跳轉到登入頁面

    # 檢查是否有檔案
    if 'file' not in request.files:
        return redirect(request.url)

    file = request.files['file']

    # 檢查檔案格式是否允許
    if file and allowed_file(file.filename):
        filename = file.filename
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)    # 儲存圖片

        # 回傳圖片的 URL
        image_url = url_for('static', filename='images/' + filename)
        
        # 上傳圖片成功，返回相同頁面，並傳遞圖片 URL 和用戶名稱
        return render_template('index.html', image_url=image_url, username=session.get('username'))

    # 如果檔案格式不符合，重定向回原頁面
    return redirect(request.url)

# 在應用啟動時初始化管理員
with app.app_context():
    db.create_all()  # 創建資料表
    initialize_admin_user()  # 初始化管理員用戶

if __name__ == '__main__':
    app.run(debug=True)
