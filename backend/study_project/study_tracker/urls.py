"""
URL configuration for study_tracker app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from . import views
# OAuth関連の追加ビューをインポート
from .oauth_views import oauth_callback_view, oauth_to_jwt_view, oauth_status_view

# APIルーターの設定
router = DefaultRouter()
router.register(r'subjects', views.SubjectViewSet, basename='subject')
router.register(r'sessions', views.StudySessionViewSet, basename='study-session')
router.register(r'goals', views.SavingsGoalViewSet, basename='savings-goal')

# 認証状態をチェックするエンドポイント
def check_auth(request):
    """
    認証状態をチェックするエンドポイント
    JWTトークンやセッション認証など、複数の認証方式に対応
    """
    from django.http import JsonResponse
    import logging
    
    logger = logging.getLogger('study_tracker')
    
    # セッション認証の状態確認
    if request.user.is_authenticated:
        logger.info(f"認証状態チェック: ユーザー {request.user.username} は認証済み")
        return JsonResponse({
            "isAuthenticated": True, 
            "username": request.user.username,
            "authType": "session" if not request.auth else "jwt"
        })
    
    # Django AllAuthの状態も確認
    from allauth.socialaccount.models import SocialAccount
    social_accounts = []
    
    # SocialAccount をチェック（allauth認証の場合）
    if hasattr(request, 'session') and request.session.session_key:
        # セッションがあり、ユーザーがログインしているか確認
        from django.contrib.sessions.models import Session
        from django.contrib.auth.models import User
        
        try:
            session = Session.objects.get(session_key=request.session.session_key)
            session_data = session.get_decoded()
            uid = session_data.get('_auth_user_id')
            
            if uid:
                user = User.objects.get(id=uid)
                # SocialAccountの確認
                social_accounts = list(SocialAccount.objects.filter(user=user).values('provider'))
                
                logger.info(f"認証状態チェック: allauth経由でユーザー {user.username} は認証済み")
                return JsonResponse({
                    "isAuthenticated": True,
                    "username": user.username,
                    "authType": "social",
                    "socialAccounts": social_accounts
                })
        except Exception as e:
            logger.error(f"認証状態チェックエラー: {str(e)}")
            pass
    
    logger.info("認証状態チェック: 認証されていません")
    return JsonResponse({
        "isAuthenticated": False,
        "authType": "none",
        "social_accounts": social_accounts
    })

# Google OAuthコールバック後にトークンを取得するカスタムエンドポイント
def oauth_to_jwt(request):
    """
    OAuth認証後にJWTトークンを取得する特別なエンドポイント
    セッション認証が成功している場合にトークンを発行します
    """
    from django.http import JsonResponse
    import logging
    from rest_framework_simplejwt.tokens import RefreshToken
    
    logger = logging.getLogger('study_tracker')
    
    if not request.user.is_authenticated:
        logger.error("OAuthトークン変換: ユーザーは認証されていません")
        return JsonResponse({
            "success": False,
            "error": "認証されていません。先にGoogle認証を完了してください。"
        }, status=401)
    
    try:
        user = request.user
        # JWTトークンを生成
        refresh = RefreshToken.for_user(user)
        
        logger.info(f"OAuthトークン変換: ユーザー {user.username} のJWTトークンを生成しました")
        
        return JsonResponse({
            "success": True,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "username": user.username,
                "email": user.email
            }
        })
    except Exception as e:
        logger.error(f"OAuthトークン変換エラー: {str(e)}")
        return JsonResponse({
            "success": False,
            "error": f"トークンの生成中にエラーが発生しました: {str(e)}"
        }, status=500)

urlpatterns = [
    path('', include(router.urls)),
    
    # JWT認証用エンドポイント
    path('auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('auth/oauth-to-jwt/', oauth_to_jwt, name='oauth-to-jwt'),
    
    # OAuth関連のカスタムエンドポイント
    path('auth/oauth-callback/', oauth_callback_view, name='oauth-callback'),
    path('auth/oauth-jwt-redirect/', oauth_to_jwt_view, name='oauth-jwt-redirect'),
    path('auth/oauth-status/', oauth_status_view, name='oauth-status'),
    
    # ユーザー認証関連のエンドポイント
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/logout/', views.LogoutView.as_view(), name='logout'),
    path('auth/check/', check_auth, name='check-auth'),
    
    # ユーザー情報
    path('user/', views.UserView.as_view(), name='user'),
    
    # 統計と分析
    path('stats/', views.StatsView.as_view(), name='stats'),
    path('analyze-learning/', views.analyze_learning_view, name='analyze-learning'),
]
