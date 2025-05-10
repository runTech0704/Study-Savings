from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.urls import reverse
from allauth.exceptions import ImmediateHttpResponse
from django.http import HttpResponseRedirect
from django.conf import settings
import json

class CustomAccountAdapter(DefaultAccountAdapter):
    """
    カスタムアカウントアダプタ - メール送信をスキップ
    """
    def send_mail(self, template_prefix, email, context):
        # メール送信をスキップ
        print(f"メール送信をスキップ: {template_prefix} to {email}")
        return

    def send_account_already_exists_mail(self, email):
        # アカウント既存メールをスキップ
        print(f"アカウント既存メールをスキップ: {email}")
        return
        
    def get_login_redirect_url(self, request):
        """
        ログイン後のリダイレクトURLを取得
        """
        # トークンを生成してフロントエンドにリダイレクト
        from rest_framework_simplejwt.tokens import RefreshToken
        import urllib.parse
        
        try:
            # トークンを生成
            refresh = RefreshToken.for_user(request.user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # フロントエンドのURL
            frontend_url = 'https://study-savings-frontend-456434511485.asia-northeast1.run.app'
            
            # クエリパラメータの生成
            params = {
                'access_token': access_token,
                'refresh_token': refresh_token
            }
            query_string = urllib.parse.urlencode(params)
            
            # リダイレクトURLを生成
            return f"{frontend_url}/?{query_string}"
        except Exception as e:
            print(f"トークン生成エラー: {str(e)}")
            # エラーが発生した場合はフロントエンドのトップページにリダイレクト
            return 'https://study-savings-frontend-456434511485.asia-northeast1.run.app/'
        
    def get_email_confirmation_url(self, request, emailconfirmation):
        """
        メール確認が必要ない場合は空のURLを返す
        """
        # メール確認をスキップ
        return ''

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    カスタムソーシャルアカウントアダプタ
    """
    def is_auto_signup_allowed(self, request, sociallogin):
        # 自動サインアップを常に許可
        return True
        
    def get_connect_redirect_url(self, request, socialaccount):
        """
        ソーシャルアカウント接続後のリダイレクトURLを取得
        """
        # トークンを生成してフロントエンドにリダイレクト
        from rest_framework_simplejwt.tokens import RefreshToken
        import urllib.parse
        
        try:
            # トークンを生成
            refresh = RefreshToken.for_user(request.user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            # フロントエンドのURL
            frontend_url = 'https://study-savings-frontend-456434511485.asia-northeast1.run.app'
            
            # クエリパラメータの生成
            params = {
                'access_token': access_token, 
                'refresh_token': refresh_token
            }
            query_string = urllib.parse.urlencode(params)
            
            # リダイレクトURLを生成
            return f"{frontend_url}/?{query_string}"
        except Exception as e:
            print(f"トークン生成エラー: {str(e)}")
            # エラーが発生した場合はフロントエンドのトップページにリダイレクト
            return 'https://study-savings-frontend-456434511485.asia-northeast1.run.app/'
    
    def pre_social_login(self, request, sociallogin):
        """
        ソーシャルログイン前のカスタム処理
        """
        # ユーザーが既に存在する場合は処理をカスタマイズ
        if sociallogin.is_existing:
            print(f"既存ユーザーが見つかりました: {sociallogin.user}")
            # 設定不要で、通常のSocialAccountの処理に委ねる
            
    def save_user(self, request, sociallogin, form=None):
        """
        カスタムユーザー保存ロジック
        """
        user = super().save_user(request, sociallogin, form)
        # 保存完了後の追加処理を行う
        print(f"ユーザーを保存しました: {user.username} ({user.email})")
        return user
        
    def populate_user(self, request, sociallogin, data):
        """
        ユーザーデータの追加処理
        """
        user = super().populate_user(request, sociallogin, data)
        return user
