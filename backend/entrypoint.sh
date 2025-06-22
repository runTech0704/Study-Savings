#!/bin/bash

# マイグレーションを実行
echo "Running database migrations..."
cd study_project

# マイグレーションファイルの生成確認
python manage.py makemigrations

# ただし、study_trackerアプリのマイグレーションがあるか確認
python manage.py makemigrations study_tracker

# 基本テーブルのマイグレーション順序を明示的に指定
python manage.py migrate contenttypes
python manage.py migrate auth
python manage.py migrate sessions
python manage.py migrate sites
python manage.py migrate admin

# アプリケーションのマイグレーションを実行
python manage.py migrate study_tracker

# 他のマイグレーションがあれば実行
python manage.py migrate

# Admin ユーザーを作成
echo "Creating superuser..."
python manage.py shell -c "
from django.contrib.auth.models import User
import os

username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@studysavings.app')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'StudySavings2025!')

if User.objects.filter(is_superuser=True).exists():
    existing_superusers = User.objects.filter(is_superuser=True)
    print(f'✅ スーパーユーザーは既に存在します ({existing_superusers.count()}人)')
    for user in existing_superusers:
        print(f'   👤 {user.username} ({user.email})')
elif User.objects.filter(username=username).exists():
    existing_user = User.objects.get(username=username)
    if not existing_user.is_superuser:
        existing_user.is_superuser = True
        existing_user.is_staff = True
        existing_user.save()
        print(f'✅ 既存ユーザー {username} をスーパーユーザーに昇格しました')
    else:
        print(f'✅ ユーザー {username} は既にスーパーユーザーです')
else:
    User.objects.create_superuser(username, email, password)
    print(f'✅ スーパーユーザーを作成しました: {username} ({email})')
"

# Djangoアプリケーションを起動
echo "Starting application..."
cd /app/study_project
gunicorn --bind 0.0.0.0:$PORT study_project.wsgi:application
