"""
Django settings for study_project project.
"""

from pathlib import Path
import os
import dj_database_url
from dotenv import load_dotenv

# .env ファイルから環境変数を読み込む
load_dotenv()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY')

# SECRET_KEYが環境変数から取得できない場合は、エラーを発生させる
if not SECRET_KEY:
    import sys
    print('ERROR: SECRET_KEY environment variable is not set!')
    # 開発環境でのみランダムなキーを生成し、警告を表示
    if os.environ.get('DEBUG', 'False') == 'True':
        import secrets
        SECRET_KEY = secrets.token_hex(32)
        print('WARNING: Using a randomly generated SECRET_KEY. Do not use this in production!')
    else:
        sys.exit(1)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt.token_blacklist',  # JWTトークンブラックリスト
    'corsheaders',
    'study_tracker',
    'whitenoise.runserver_nostatic',  # 静的ファイル配信
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # CORSミドルウェアを最初に配置
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',  # 静的ファイル配信用ミドルウェア
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware', 
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'study_tracker.middleware.RateLimitMiddleware',  # レート制限ミドルウェア
]

ROOT_URLCONF = 'study_project.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'study_project.wsgi.application'


# Database
# https://docs.djangoproject.com/en/4.2/ref/settings/#databases
# PostgreSQLデータベース設定 (Supabase)
DATABASE_URL = os.environ.get('DATABASE_URL')

DATABASES = {
    'default': dj_database_url.config(
        default=DATABASE_URL,
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
LANGUAGE_CODE = 'ja'
TIME_ZONE = 'Asia/Tokyo'
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# WhiteNoise圧縮・キャッシュ設定
WHITENOISE_MANIFEST_STRICT = False
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS settings - 本番環境でのクロスドメインに対応
CORS_ALLOW_ALL_ORIGINS = False  # すべてのオリジンを許可しない
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,https://study-savings-frontend-456434511485.asia-northeast1.run.app').split(',')

# CSRF設定
CSRF_TRUSTED_ORIGINS = os.environ.get('CSRF_TRUSTED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000,https://study-savings-frontend-456434511485.asia-northeast1.run.app').split(',')

# Cookie認証のための設定
CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ['Content-Type', 'X-CSRFToken']

# CORSを許可するメソッド
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# 許可するヘッダー
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-csrf-token',  # 追加
    'x-requested-with',
]

# 本番環境と開発環境で共通のCookie設定
CSRF_COOKIE_SECURE = True  # HTTPSでのみ送信
SESSION_COOKIE_SECURE = True  # HTTPSでのみ送信

# セキュリティを強化するためにSameSiteをLaxに設定
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SAMESITE = 'Lax'

# iPhone用に選択的にCookieを送信する設定
CSRF_COOKIE_DOMAIN = None
SESSION_COOKIE_DOMAIN = None

# セッション設定 - JWT認証では必要ないが、Django管理画面用に残しておく
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_NAME = 'sessionid'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_AGE = 60 * 60 * 24 * 1  # 1日に短縮
SESSION_COOKIE_SECURE = True
# CSRF設定
CSRF_COOKIE_HTTPONLY = False  # JavaScriptからアクセスできるようにFalse
CSRF_COOKIE_NAME = 'csrftoken'
CSRF_USE_SESSIONS = False  # Cookieに保存
CSRF_COOKIE_DOMAIN = None

# クロスドメインでのCSRF対策の改善
CSRF_HEADER_NAME = 'HTTP_X_CSRFTOKEN'  # 標準ヘッダー名
CSRF_FAILURE_VIEW = 'django.views.csrf.csrf_failure'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',  # 基本的に認証必要
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',  # JWT認証のみサポート
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
}

# JWT設定
from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),  # アクセストークンの有効期間（セキュリティ向上のため短縮）
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),  # リフレッシュトークンの有効期間
    'ROTATE_REFRESH_TOKENS': True,  # リフレッシュトークンのローテーション
    'BLACKLIST_AFTER_ROTATION': True,  # ブラックリスト機能を有効化
    'UPDATE_LAST_LOGIN': True,  # 最終ログイン時間を更新
    'ALGORITHM': 'HS256',  # 署名アルゴリズム
    'SIGNING_KEY': os.environ.get('JWT_SECRET_KEY', SECRET_KEY),  # JWT用の個別の署名キーを使用（環境変数から取得）
    'AUTH_HEADER_TYPES': ('Bearer',),  # 認証ヘッダーのタイプ
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',  # 認証ヘッダーの名前
    'USER_ID_FIELD': 'id',  # ユーザーIDフィールド
    'USER_ID_CLAIM': 'user_id',  # ユーザーIDクレーム
}

# ロギング設定
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
        'study_tracker': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}

# セキュリティ設定（本番環境用）
if not DEBUG:
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    X_FRAME_OPTIONS = 'DENY'
    # Cloud Run環境ではロードバランサーがリダイレクトを処理するため、このオプションを無効化
    SECURE_SSL_REDIRECT = False

# Vertex AI設定
GCP_PROJECT_ID = os.environ.get('GCP_PROJECT_ID', '')
GCP_REGION = os.environ.get('GCP_REGION', 'us-central1')
