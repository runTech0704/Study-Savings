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
