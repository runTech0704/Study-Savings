#!/bin/bash

# データベースマイグレーションスクリプト
# 使い方: ./migrate.sh

# .envファイルの確認
if [ ! -f .env ]; then
    echo ".envファイルが見つかりません。"
    echo "データベース接続情報を含む.envファイルを作成してください。"
    exit 1
fi

# マイグレーションの実行
echo "データベースマイグレーションを実行中..."
cd study_project
python manage.py makemigrations study_tracker
python manage.py migrate

# 管理者ユーザーの作成（オプション）
read -p "管理者ユーザーを作成しますか？ (y/n): " create_admin
if [ "$create_admin" = "y" ]; then
    python manage.py createsuperuser
fi

echo "マイグレーションが完了しました！"
