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
