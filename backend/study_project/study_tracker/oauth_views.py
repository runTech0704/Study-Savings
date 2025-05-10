from django.shortcuts import redirect
from django.urls import reverse
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.decorators import login_required
import json

@require_GET
def oauth_callback_view(request):
    """
    Google OAuth認証後のコールバックを処理するビュー
    フロントエンドにリダイレクトする
    """
    # フロントエンドのURL
    frontend_url = 'https://study-savings-frontend-456434511485.asia-northeast1.run.app'
    
    # ユーザーが認証されているか確認
    if request.user.is_authenticated:
        # JWTトークンを生成
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(request.user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            import urllib.parse
            params = {
                'access_token': access_token,
                'refresh_token': refresh_token
            }
            
            query_string = urllib.parse.urlencode(params)
            redirect_url = f"{frontend_url}/?{query_string}"
            
            print(f"認証成功、JWTトークン生成完了、フロントエンドにリダイレクト: {redirect_url}")
            return redirect(redirect_url)
            
        except Exception as e:
            print(f"JWTトークン生成エラー: {str(e)}")
            return redirect(f"{frontend_url}/?auth_error=token_generation_failed")
    else:
        # 認証されていない場合はフロントエンドにエラーパラメータ付きでリダイレクト
        return redirect(f"{frontend_url}/?auth_error=not_authenticated")

@login_required
def oauth_to_jwt_view(request):
    """
    OAuth認証成功後にJWTトークンを生成し、
    フロントエンドにリダイレクトするビュー
    """
    try:
        # JWTトークンを生成
        refresh = RefreshToken.for_user(request.user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        # フロントエンドのURL
        frontend_url = 'https://study-savings-frontend-456434511485.asia-northeast1.run.app'
        
        # トークンをクエリパラメータとして渡す
        import urllib.parse
        params = {
            'access_token': access_token,
            'refresh_token': refresh_token
        }
        query_string = urllib.parse.urlencode(params)
        
        redirect_url = f"{frontend_url}/?{query_string}"
        
        return HttpResponseRedirect(redirect_url)
    except Exception as e:
        # エラーが発生した場合
        frontend_url = 'https://study-savings-frontend-456434511485.asia-northeast1.run.app'
        return redirect(f"{frontend_url}/?auth_error={str(e)}")

@csrf_exempt
def oauth_status_view(request):
    """
    OAuth認証の状態を確認するAPIエンドポイント
    """
    if request.user.is_authenticated:
        return JsonResponse({
            'authenticated': True,
            'username': request.user.username,
            'email': request.user.email
        })
    else:
        return JsonResponse({
            'authenticated': False
        })
