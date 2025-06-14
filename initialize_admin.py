from app import app, db
from models import User

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

if __name__ == '__main__':
    initialize_admin_user()  # 創建 admin 用戶
