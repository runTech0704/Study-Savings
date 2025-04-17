# プラットフォームを明示的に指定
FROM --platform=linux/amd64 python:3.10-slim

# 環境変数の設定
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=study_project.settings \
    PORT=8080

# 作業ディレクトリの設定
WORKDIR /app

# 必要なパッケージをインストール
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 依存関係のインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY . .

# 静的ファイルの収集（本番環境用）
RUN cd study_project && python manage.py collectstatic --noinput

# ポート公開
EXPOSE 8080

# エントリポイントスクリプトに実行権限を付与
RUN chmod +x /app/entrypoint.sh

# アプリケーションの起動（マイグレーションを含む）
CMD ["/app/entrypoint.sh"]
