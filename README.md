# StudySavings - 勉強時間記録・仮想貯金アプリ

[StudySavings](https://study-savings-frontend-456434511485.asia-northeast1.run.app/) は勉強時間を記録し、その時間を時給換算で仮想的に貯金するWebアプリケーションです。目標を設定し、勉強によって貯めたお金で達成を目指します。


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
- Google Secret Manager（機密情報管理）

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
- Google Secret Manager
- Supabase (PostgreSQL)
- Docker / Docker Compose

## アプリケーション構成

```
study_savings_app/
├── AI_ANALYSIS_SETUP.md   # AI機能のセットアップガイド
├── backend/                # Djangoバックエンド
│   ├── Dockerfile          # 本番用Dockerfile
│   ├── migrate.sh          # マイグレーションスクリプト
│   ├── cloudbuild.yaml     # Cloud Build設定
│   ├── requirements.txt    # 依存パッケージ
│   ├── env-vars.yaml       # 非機密環境変数設定
│   ├── .env.example        # 環境変数サンプル
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
│   ├── .env.example        # 環境変数サンプル
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
├── deploy.sh               # Secret Managerを使用したデプロイスクリプト
├── create-secrets.sh       # Secret Manager用シークレット作成スクリプト
├── make_scripts_executable.sh  # スクリプト権限付与
└── README.md
```

## シークレット管理

本アプリケーションはGoogle Secret Managerを使用して機密情報を管理しています。
非機密情報は`env-vars.yaml`ファイルで管理し、機密情報のみSecret Managerに保存します。

### 必要なシークレット

以下のシークレットをSecret Managerに登録する必要があります：

1. `secret-key` - Django SECRET_KEY
2. `database-url` - データベース接続文字列
3. `jwt-secret-key` - JWT認証用の秘密鍵

### シークレットの作成方法

`create-secrets.sh` スクリプトを使用して機密情報のシークレットを作成できます：

```bash
# スクリプトに実行権限を付与
chmod +x create-secrets.sh

# シークレット作成の実行
./create-secrets.sh プロジェクトID
```

### デプロイ時のシークレット使用

`deploy.sh` スクリプトはデプロイ時に：
- 非機密情報は`env-vars.yaml`から設定
- 機密情報はSecret Managerから取得

```bash
# スクリプトに実行権限を付与
chmod +x make_scripts_executable.sh
./make_scripts_executable.sh

# デプロイの実行
./deploy.sh プロジェクトID リージョン
```

## ライセンス

MIT
