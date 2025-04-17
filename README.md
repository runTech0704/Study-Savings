# StudySavings - 勉強時間記録・仮想貯金アプリ

StudySavingsは勉強時間を記録し、その時間を時給換算で仮想的に貯金するWebアプリケーションです。目標を設定し、勉強によって貯めたお金で達成を目指します。

## 機能

- ユーザー認証（登録・ログイン）
- 勉強科目の管理（作成・編集・削除）
- 勉強タイマー（開始・停止・メモ）
- 勉強時間の記録と時給換算による仮想貯金
- 貯金目標の設定と進捗管理
- 勉強統計（週間・月間の勉強時間、科目別統計など）
- AI学習分析（学習パターンの分析とパーソナライズされたアドバイス）

## 技術スタック

### バックエンド

- Python 3.10
- Django 4.2.x
- Django REST Framework
- PostgreSQL (Supabase)
- Google Vertex AI (Gemini モデル)

### フロントエンド

- React
- React Router
- Material-UI
- Chart.js
- React Markdown
- Formik & Yup
- Axios

### インフラ

- Google Cloud Run
- Google Vertex AI
- Supabase (PostgreSQL)
- Docker / Docker Compose

## ローカル開発環境のセットアップ

### Docker Composeを使用する方法（推奨）

1. Dockerとdocker-composeをインストールしてください
   - [Docker Desktop](https://www.docker.com/products/docker-desktop/)のインストール

2. プロジェクトをクローンまたはダウンロードして、プロジェクトディレクトリに移動
   ```bash
   git clone <リポジトリURL>
   cd study_savings_app
   ```

3. Docker Composeでアプリケーションを起動
   ```bash
   docker-compose up -d
   ```

4. ブラウザで以下のURLにアクセス:
   - フロントエンド: http://localhost:3000
   - バックエンドAPI: http://localhost:8000/api
   - 管理サイト: http://localhost:8000/admin (ユーザー名: admin, パスワード: adminpassword)

5. アプリケーションの停止
   ```bash
   docker-compose down
   ```

## AI学習分析のセットアップ

学習分析機能を有効にするには、追加で以下の設定が必要です：

1. Google Cloud Platformアカウントを取得し、プロジェクトを作成
2. Vertex AI APIを有効化
3. サービスアカウント認証情報を設定
4. バックエンドの`.env`ファイルに以下を追加：
   ```
   GCP_PROJECT_ID=your-gcp-project-id
   GCP_REGION=us-central1
   ```

詳細な手順は [AI_ANALYSIS_SETUP.md](./AI_ANALYSIS_SETUP.md) を参照してください。

## 本番環境へのデプロイ

このアプリケーションはGoogle Cloud RunとSupabaseを使用してデプロイできます。

### 前提条件

- Google Cloud Platform (GCP)アカウント
- Supabaseアカウント
- Google Cloud SDK (`gcloud` コマンド)
- Docker

### 1. Supabaseのセットアップ

1. [Supabase](https://supabase.com/)でプロジェクトを作成
2. 作成されたデータベースの接続情報を取得
3. データベースマイグレーションを実行:
   ```bash
   cd backend
   # .env ファイルを作成して接続情報を設定
   cp .env.example .env
   # 環境変数を編集
   vi .env
   # マイグレーションスクリプトを実行
   chmod +x migrate.sh
   ./migrate.sh
   ```

### 2. Google Cloud Platformのセットアップ

1. GCPプロジェクトを作成
2. 必要なAPIを有効化
   ```bash
   chmod +x setup-gcp.sh
   ./setup-gcp.sh <プロジェクトID> <リージョン>
   ```

### 3. 環境変数の設定

以下の環境変数をCloud Runサービスに設定します:

- `DATABASE_URL`: Supabaseデータベース接続URL
- `SECRET_KEY`: Djangoシークレットキー
- `DEBUG`: 通常は 'False'
- `ALLOWED_HOSTS`: デプロイ先のドメイン
- `CORS_ALLOWED_ORIGINS`: フロントエンドのURL
- `CSRF_TRUSTED_ORIGINS`: フロントエンドのURL
- `GCP_PROJECT_ID`: Google Cloud ProjectのID
- `GCP_REGION`: Vertex AIのリージョン

### 4. デプロイ

#### 手動デプロイ（推奨）

```bash
chmod +x deploy.sh
./deploy.sh <プロジェクトID> <リージョン>
```

#### Cloud Buildを使用したデプロイ（CI/CD）

1. GitHub/GitLabリポジトリを設定
2. Cloud Buildトリガーを作成:
   - ソース: リポジトリ
   - ビルド設定: `cloudbuild.yaml`

### 5. デプロイ後の確認

1. マイグレーションの実行
2. 管理者ユーザーの作成
3. サービスが正常に起動しているか確認

## アプリケーション構成

```
study_savings_app/
├── AI_ANALYSIS_SETUP.md   # AI機能のセットアップガイド
├── backend/                # Djangoバックエンド
│   ├── Dockerfile          # 本番用Dockerfile
│   ├── migrate.sh          # マイグレーションスクリプト
│   ├── cloudbuild.yaml     # Cloud Build設定
│   ├── requirements.txt    # 依存パッケージ
│   └── study_project/      # Djangoプロジェクト
│       ├── manage.py
│       ├── study_project/  # プロジェクト設定
│       └── study_tracker/  # メインアプリ
│           ├── models.py
│           ├── views.py
│           ├── urls.py
│           └── ai_services.py  # AI分析サービス
├── frontend/               # Reactフロントエンド
│   ├── Dockerfile          # 開発用Dockerfile
│   ├── Dockerfile.prod     # 本番用Dockerfile
│   ├── cloudbuild.yaml     # Cloud Build設定
│   ├── package.json
│   ├── nginx/              # Nginx設定
│   └── src/                # Reactソースコード
│       ├── pages/
│       │   ├── Dashboard.js
│       │   ├── StudyTimer.js
│       │   └── LearningAnalysis.js  # AI学習分析ページ
│       └── services/
│           └── api.js      # APIサービス
├── docker-compose.yml      # 開発環境設定
├── setup-gcp.sh            # GCP初期設定スクリプト
├── deploy.sh               # デプロイスクリプト
└── README.md
```

## ライセンス

MIT

## 作者

このアプリケーションはCloud AIによって作成されました。
