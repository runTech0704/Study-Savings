#!/usr/bin/env python
import os
import sys
import psycopg2
from dotenv import load_dotenv

# .envファイルから環境変数を読み込む
load_dotenv()

# DATABASE_URLを取得
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    print("DATABASE_URLが設定されていません")
    sys.exit(1)

print(f"解析するDB URL: {db_url}")

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
    
    print(f"接続情報: host={hostname}, port={port}, database={database}, user={username}")
    
    # データベースに接続
    print("データベースに接続しています...")
    conn = psycopg2.connect(**db_config)
    conn.autocommit = True
    cursor = conn.cursor()
    
    # データベースの全テーブルを取得
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
    
    # 全テーブルをドロップ
    if tables:
        table_names = ', '.join(f'"{table[0]}"' for table in tables)
        cursor.execute(f"DROP TABLE IF EXISTS {table_names} CASCADE;")
        print("\nデータベーステーブルを削除しました。")
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
