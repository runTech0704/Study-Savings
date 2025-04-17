#!/bin/bash

# Dockerコンテナを停止して削除
echo "Stopping and removing containers..."
docker-compose down -v

# イメージを再ビルド
echo "Rebuilding images..."
docker-compose build --no-cache

# 管理者ユーザー作成のための準備
echo "Creating a superuser for admin access..."
cat > /Users/fujiwarasatoru/study_savings_app/backend/create_superuser.py << EOF
from django.contrib.auth.models import User
from django.db import IntegrityError

try:
    User.objects.create_superuser('admin', 'admin@example.com', 'adminpassword')
    print("Superuser created successfully")
except IntegrityError:
    print("Superuser already exists")
EOF

# コンテナを起動
echo "Starting containers..."
docker-compose up -d

# しばらく待機
echo "Waiting for services to start..."
sleep 10

# 管理者ユーザーを作成
echo "Creating admin user..."
docker-compose exec backend bash -c "cd study_project && python -c 'import create_superuser'"

echo "Done! Wait a few moments for the services to fully start."
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000/api"
echo "Admin interface: http://localhost:8000/admin (username: admin, password: adminpassword)"

# コンテナのログを表示
echo "Showing container logs..."
docker-compose logs -f
