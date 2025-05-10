#!/bin/bash

# マイグレーションを実行
echo "Running database migrations..."
cd study_project

# マイグレーションファイルの生成確認
python manage.py makemigrations

# ただし、study_trackerアプリのマイグレーションがあるか確認
python manage.py makemigrations study_tracker

# 基本テーブルのマイグレーション順序を明示的に指定
python manage.py migrate auth
python manage.py migrate contenttypes
python manage.py migrate sessions
python manage.py migrate admin

# アプリケーションのマイグレーションを実行
python manage.py migrate study_tracker

# 他のマイグレーションがあれば実行
python manage.py migrate

# Admin ユーザーを作成
python create_superuser.py

# Djangoアプリケーションを起動
echo "Starting application..."
gunicorn --bind 0.0.0.0:$PORT study_project.wsgi:application
