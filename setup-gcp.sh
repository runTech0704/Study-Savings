#!/bin/bash

# Google Cloud設定スクリプト
# 使い方: ./setup-gcp.sh プロジェクト名 リージョン

# 引数のチェック
if [ $# -lt 2 ]; then
    echo "使い方: $0 <プロジェクトID> <リージョン>"
    echo "例: $0 study-savings-12345 asia-northeast1"
    exit 1
fi

PROJECT_ID=$1
REGION=$2

# プロジェクトの設定
echo "プロジェクト $PROJECT_ID を設定中..."
gcloud config set project $PROJECT_ID

# 必要なAPIを有効化
echo "必要なAPIを有効化中..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Artifact Registryリポジトリの作成
echo "コンテナリポジトリを作成中..."
gcloud artifacts repositories create study-savings-repo \
    --repository-format=docker \
    --location=$REGION \
    --description="Study Savings App Containers"

# サービスアカウントの作成（オプション）
echo "サービスアカウントを作成中..."
gcloud iam service-accounts create study-savings-sa \
    --display-name="Study Savings Service Account"

# 環境変数の設定
echo "環境変数をSecret Managerに登録中..."
# 以下、実際の値に置き換える必要があります
DATABASE_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres"
SECRET_KEY="your-secret-key-here"
ALLOWED_HOSTS="study-savings-backend.run.app,your-domain.com"
CORS_ALLOWED_ORIGINS="https://your-frontend-domain.com"
CSRF_TRUSTED_ORIGINS="https://your-frontend-domain.com"

# シークレットの作成
echo "SECRET_KEY" | gcloud secrets create django-secret-key --data-file=-
echo "$DATABASE_URL" | gcloud secrets create database-url --data-file=-
echo "$ALLOWED_HOSTS" | gcloud secrets create allowed-hosts --data-file=-
echo "$CORS_ALLOWED_ORIGINS" | gcloud secrets create cors-allowed-origins --data-file=-
echo "$CSRF_TRUSTED_ORIGINS" | gcloud secrets create csrf-trusted-origins --data-file=-

echo "GCPの設定が完了しました！"
echo "次のステップ: Cloud Buildを使ってデプロイしてください"
