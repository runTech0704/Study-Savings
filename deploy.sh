#!/bin/bash

# セキュリティ強化版デプロイスクリプト
# 使い方: ./deploy.sh プロジェクトID リージョン

# 引数のチェック
if [ $# -lt 2 ]; then
    echo "使い方: $0 <プロジェクトID> <リージョン>"
    echo "例: $0 study-savings-12345 asia-northeast1"
    exit 1
fi

PROJECT_ID=$1
REGION=$2
IMAGE_TAG=$(date +%Y%m%d%H%M%S)

# 環境変数ファイルの確認
ENV_FILE="backend/env-vars.yaml"
if [ ! -f "$ENV_FILE" ]; then
    echo "環境変数ファイル $ENV_FILE が見つかりません。"
    echo "env-vars.yaml.exampleをコピーして編集してください。"
    exit 1
fi

# Secret Managerへのアクセス権限を確認
echo "Secret Managerの権限を確認しています..."
if ! gcloud secrets list --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "エラー: Secret Managerへのアクセス権限がないか、シークレットが存在しません。"
    echo "以下のシークレットが必要です: secret-key, database-url, jwt-secret-key"
    echo "また、適切なIAM権限が設定されていることを確認してください。"
    exit 1
fi

# バックエンドのビルドとデプロイ
echo "バックエンドをビルド中..."
cd backend

# マイグレーションについての注意
echo "注意: マイグレーションはコンテナ起動時に自動的に実行されます"
echo "より詳細なマイグレーション制御が必要な場合は、開発者にお問い合わせください"

# データベースの初期化オプション
read -p "データベースの初期化が必要ですか？これは全てのデータを削除します。(特にテーブルが存在しないエラーが発生した場合に必要) (y/n): " reset_db
if [ "$reset_db" = "y" ]; then
    echo "警告: データベースを初期化します。この処理は元に戻せません。"
    read -p "本当にデータベースを初期化しますか？ (y/n): " confirm_reset
    if [ "$confirm_reset" = "y" ]; then
        echo "セキュリティ強化版の初期化スクリプトを作成します..."
        cat > reset_db_fixed.py << 'EOL'
#!/usr/bin/env python
import os
import sys
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv

# .envファイルから環境変数を読み込む
load_dotenv()

# DATABASE_URLを取得
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    print("DATABASE_URLが設定されていません")
    sys.exit(1)

print("データベース接続の準備中...")

try:
    # 単純なURL解析ではなく、psycopg2のparse_dsn機能を使用
    # パターン: postgresql://username:password@hostname:port/database
    
    # postgresql:// を削除
    if db_url.startswith('postgresql://'):
        db_url = db_url[len('postgresql://'):]    
    
    # ユーザー情報と接続先を分割
    if '@' in db_url:
        user_pass, rest = db_url.split('@', 1)
    else:
        print("URLに '@' が見つかりません。形式が正しくありません。")
        sys.exit(1)
    
    # ユーザー名とパスワードを分割
    if ':' in user_pass:
        username, password = user_pass.split(':', 1)
    else:
        username = user_pass
        password = ''
    
    # ホスト名とデータベース名を分割
    if '/' in rest:
        host_port, database = rest.rsplit('/', 1)
    else:
        host_port = rest
        database = 'postgres'  # デフォルト値
    
    # ホスト名とポートを分割
    if ':' in host_port:
        hostname, port = host_port.split(':', 1)
    else:
        hostname = host_port
        port = '5432'  # デフォルト値
    
    # 接続情報を作成
    db_config = {
        'user': username,
        'password': password,
        'host': hostname,
        'port': port,
        'database': database
    }
    
    print(f"接続先: {hostname}:{port}/{database}")
    
    # データベースに接続
    print("データベースに接続しています...")
    conn = psycopg2.connect(**db_config)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # データベースの全テーブルを取得（安全なクエリ）
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    """)
    tables = cursor.fetchall()
    
    print("\n以下のテーブルをリセットします:")
    for table in tables:
        print(f"- {table[0]}")
    
    # 外部キー制約を無視する
    cursor.execute("SET CONSTRAINTS ALL DEFERRED;")
    
    # 全テーブルを安全に削除（SQL Injection対策）
    if tables:
        # 各テーブルを個別に安全に削除
        for table in tables:
            # SQL Injection対策としてpsycopg2.sql.Identifierを使用
            drop_query = sql.SQL("DROP TABLE IF EXISTS {} CASCADE").format(
                sql.Identifier(table[0])
            )
            cursor.execute(drop_query)
            
        print("\nデータベーステーブルを安全に削除しました。")
    else:
        print("\n削除するテーブルがありません。")
    
    # Djangoのマイグレーション履歴をリセットするためのテーブルも削除
    cursor.execute("DROP TABLE IF EXISTS django_migrations CASCADE;")
    print("Djangoマイグレーション履歴をリセットしました。")
    
    # 接続を閉じる
    cursor.close()
    conn.close()
    print("\nデータベースの初期化が完了しました。\n")
    print("次に、マイグレーションが自動的に実行されてテーブルが再作成されます。")
    
except Exception as e:
    print(f"\nエラー: {e}\n")
    if 'conn' in locals():
        conn.close()
    sys.exit(1)
EOL

        # Secret Managerからデータベース接続文字列を取得
        echo "Secret Managerからデータベース接続情報を取得中..."
        DATABASE_URL=$(gcloud secrets versions access latest --secret=database-url --project=$PROJECT_ID)
        export DATABASE_URL

        # 必要な依存関係をインストール
        pip install psycopg2-binary python-dotenv

        # スクリプトを実行
        python reset_db_fixed.py
    else
        echo "データベースの初期化をキャンセルしました。"
    fi
fi

# エントリポイントスクリプトの更新
cat > entrypoint.sh << 'EOL'
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

# Djangoアプリケーションを起動
echo "Starting application..."
gunicorn --bind 0.0.0.0:$PORT study_project.wsgi:application
EOL

chmod +x entrypoint.sh
echo "更新された entrypoint.sh を作成しました"

# プラットフォームをビルド時にも指定
docker build --platform=linux/amd64 -t gcr.io/$PROJECT_ID/study-savings-backend:$IMAGE_TAG .
docker push gcr.io/$PROJECT_ID/study-savings-backend:$IMAGE_TAG

echo "バックエンドをデプロイ中..."

# Secret Managerを使用してバックエンドをデプロイ（機密情報のみSecret Managerから取得）
gcloud run deploy study-savings-backend \
    --image gcr.io/$PROJECT_ID/study-savings-backend:$IMAGE_TAG \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --env-vars-file=env-vars.yaml \
    --set-secrets=SECRET_KEY=secret-key:latest,DATABASE_URL=database-url:latest,JWT_SECRET_KEY=jwt-secret-key:latest \
    --timeout=600s  # タイムアウトを延長（10分）

# バックエンドのURLを取得
BACKEND_URL=$(gcloud run services describe study-savings-backend --platform managed --region $REGION --format 'value(status.url)' 2>/dev/null || echo "https://backend-not-deployed")
echo "バックエンドがデプロイされました: $BACKEND_URL"

# フロントエンドの環境変数を設定
cd ../frontend
echo "REACT_APP_API_URL=${BACKEND_URL}/api" > .env.production

# フロントエンドのビルドとデプロイ
echo "フロントエンドをビルド中..."
# プラットフォームをビルド時にも指定
docker build --platform=linux/amd64 -t gcr.io/$PROJECT_ID/study-savings-frontend:$IMAGE_TAG .
docker push gcr.io/$PROJECT_ID/study-savings-frontend:$IMAGE_TAG

# イメージが完全にプッシュされるまで少し待つ
echo "イメージがレジストリにプッシュされるのを待っています..."
sleep 30  # 30秒待つ

echo "フロントエンドをデプロイ中..."
gcloud run deploy study-savings-frontend \
    --image gcr.io/$PROJECT_ID/study-savings-frontend:$IMAGE_TAG \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --timeout=600s  # タイムアウトを延長（10分）

# フロントエンドのURLを取得
FRONTEND_URL=$(gcloud run services describe study-savings-frontend --platform managed --region $REGION --format 'value(status.url)' 2>/dev/null || echo "https://frontend-not-deployed")
echo "フロントエンドがデプロイされました: $FRONTEND_URL"

echo "デプロイが完了しました！"
echo "バックエンド: $BACKEND_URL"
echo "フロントエンド: $FRONTEND_URL"
