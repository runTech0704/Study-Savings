# 学習分析機能のセットアップガイド

このガイドでは、StudySavingsアプリにVertex AIを活用した「学習分析」機能を追加するための手順を説明します。

## 1. 前提条件

- Google Cloud Platformのアカウントが必要です
- プロジェクトが作成されており、課金が有効になっていること
- Google Cloud CLIがインストールされていること（推奨）

## 2. Google Cloud設定

### 2.1 APIの有効化

以下のAPIを有効にしてください：

- Vertex AI API
- Generative Language API

GCPコンソールまたは以下のコマンドで有効化できます：

```bash
gcloud services enable aiplatform.googleapis.com
gcloud services enable language.googleapis.com
```

### 2.2 サービスアカウント設定

Vertex AIにアクセスするためのサービスアカウントを作成し、必要な権限を付与します：

1. GCPコンソールで「IAMと管理」→「サービスアカウント」に移動
2. 「サービスアカウントを作成」をクリック
3. 名前を入力（例: "study-savings-ai"）して「作成して続行」
4. 以下の役割を追加:
   - `roles/aiplatform.user`
   - `roles/serviceusage.serviceUsageConsumer`
5. 「完了」をクリック

### 2.3 認証情報の取得

サービスアカウントのキーファイルを作成し、安全に保管してください：

1. 作成したサービスアカウントの詳細ページに移動
2. 「鍵」タブをクリック
3. 「鍵を追加」→「新しい鍵を作成」→「JSON」を選択
4. ダウンロードしたJSONファイルは安全に保管してください

## 3. バックエンド設定

### 3.1 依存関係のインストール

バックエンドディレクトリに移動し、必要なパッケージをインストールします：

```bash
cd backend
pip install -r requirements.txt
```

### 3.2 環境変数の設定

`.env`ファイルに以下の変数を追加します：

```
GCP_PROJECT_ID=your-gcp-project-id
GCP_REGION=us-central1
```

> **重要**: GCP_REGIONは`us-central1`を使用してください。これはGemini 1.5モデルが確実に利用できるリージョンです。他のリージョン（特にasia-northeast1など）では一部のモデルが使用できない場合があります。

または、Cloud Runを使用している場合は、環境変数を設定してください。

### 3.3 認証設定

開発環境では、Google Cloud SDKを使用してアプリケーションデフォルト認証情報を設定します：

```bash
gcloud auth application-default login
```

本番環境では、サービスアカウントキーファイルへのパスを環境変数で指定します：

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-keyfile.json
```

または、Cloud Runを使用している場合は、サービスアカウントを割り当てます。

## 4. フロントエンド設定

### 4.1 依存関係のインストール

フロントエンドディレクトリに移動し、必要なパッケージをインストールします：

```bash
cd frontend
npm install
```

## 5. 動作確認

アプリケーションを起動し、学習分析機能が正常に動作することを確認します：

1. バックエンドの起動：
   ```bash
   cd backend
   python study_project/manage.py runserver
   ```

2. フロントエンドの起動：
   ```bash
   cd frontend
   npm start
   ```

3. ブラウザで「http://localhost:3000」にアクセスし、サイドバーメニューから「学習分析」を選択
4. 学習目的を入力して分析を実行

## 6. トラブルシューティング

### モデルアクセスエラー

「Model not found」または「Project is not allowed to use Publisher Model」というエラーが表示される場合：

1. `ai_services.py`ファイルでモデル名を確認します。現在設定されているモデルは `gemini-1.5-pro` です。
2. リージョン設定が正しいか確認します。現在は `us-central1` を推奨しています。
3. モデル名や利用可能なリージョンはGoogle Cloudの更新により変更される可能性があります。最新の情報については[Vertex AI Documentaion](https://cloud.google.com/vertex-ai/docs/generative-ai/learn/models)を参照してください。
4. 別のモデルを試す場合は、`ai_services.py`の `get_gemini_model()` と `generate_response()` 関数のデフォルトパラメータを変更します。選択肢は以下の通りです：
   - `gemini-1.5-pro` (より高度な機能)
   - `gemini-1.5-flash` (より高速)
   - `gemini-1.0-pro` (以前のバージョン)

### 認証エラー

バックエンドのログで認証エラーが表示される場合：

- `GOOGLE_APPLICATION_CREDENTIALS`環境変数が正しく設定されているか確認
- サービスアカウントに適切な権限が付与されているか確認
- GCPプロジェクトIDが正しいか確認

### APIアクセスエラー

「API not enabled」エラーが表示される場合：

- GCPコンソールで必要なAPIが有効になっているか確認
- GCPプロジェクトで課金が有効になっているか確認

## 7. 本番環境へのデプロイ

本番環境にデプロイする際の追加設定：

1. 環境変数の設定：
   - Cloud Runのサービス設定で環境変数を設定
   - `GCP_PROJECT_ID`、`GCP_REGION`を適切な値に設定

2. サービスアカウントの割り当て：
   - Cloud Runサービスに、Vertex AIにアクセスできる権限を持つサービスアカウントを割り当て

詳細は、`deploy.sh`スクリプトを参照してください。

## 8. コスト管理

Vertex AI Geminiモデルの使用にはコストが発生します。予算を管理するために：

- GCPコンソールで予算アラートを設定
- 必要に応じてAPIリクエストに上限を設定
- 開発・テスト環境とプロダクション環境で別々のGCPプロジェクトを使用することを検討

## 9. 高度なカスタマイズ

学習分析機能をさらにカスタマイズするには：

- `ai_services.py`のプロンプトテンプレートを調整
- 異なるGeminiモデルバリエーションを試す
- レスポンスキャッシュを実装してコストを削減

さらに詳しい情報は、[Vertex AI公式ドキュメント](https://cloud.google.com/vertex-ai/docs)を参照してください。
