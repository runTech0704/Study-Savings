# ビルドステージ
FROM --platform=linux/amd64 node:18-alpine as build

WORKDIR /app

# 依存パッケージをインストール
COPY package*.json ./
RUN npm install

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# 配信ステージ - プラットフォームを明示的に指定
FROM --platform=linux/amd64 nginx:alpine

# 事前にNginx設定ファイルを作成（ポート8080を使用）
RUN echo 'server { \
    listen 8080; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location ~* \.(?:jpg|jpeg|gif|png|ico|svg|woff|woff2|ttf|css|js)$ { \
        expires 1M; \
        access_log off; \
        add_header Cache-Control "public"; \
    } \
}' > /etc/nginx/conf.d/default.conf

# ビルドステージからビルドされたファイルをコピー
COPY --from=build /app/build /usr/share/nginx/html

# ポート公開
EXPOSE 8080

# Nginxを起動 - エントリポイントを使わない
CMD ["nginx", "-g", "daemon off;"]
