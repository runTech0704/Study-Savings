import time
from django.http import JsonResponse
from django.core.cache import cache
from rest_framework import status

class RateLimitMiddleware:
    """
    レート制限のミドルウェア
    
    特定のエンドポイントへのリクエスト数を制限し、ブルートフォース攻撃や
    APIの過剰な使用を防止します。
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        # 設定
        self.rate_limit = {
            # 認証関連エンドポイント
            'auth': {
                'window': 60,  # 60秒（1分）あたり
                'max_requests': 10  # 最大10リクエスト
            },
            # API全般
            'api': {
                'window': 60,  # 60秒（1分）あたり
                'max_requests': 100  # 最大100リクエスト
            }
        }
    
    def __call__(self, request):
        # レート制限を適用するかどうかチェック
        if self._should_rate_limit(request):
            # クライアントのIPアドレスを取得
            ip = self._get_client_ip(request)
            
            # リクエストパスに基づいてリクエストタイプを決定
            request_type = 'auth' if '/auth/' in request.path else 'api'
            
            # レート制限のキーを作成
            cache_key = f"rate_limit_{request_type}_{ip}"
            
            # 現在の制限情報を取得
            rate_limit_data = cache.get(cache_key, {'requests': 0, 'reset_time': time.time() + self.rate_limit[request_type]['window']})
            
            # 時間枠をリセットする必要があるかチェック
            if time.time() > rate_limit_data['reset_time']:
                rate_limit_data = {'requests': 0, 'reset_time': time.time() + self.rate_limit[request_type]['window']}
            
            # リクエスト数を増やす
            rate_limit_data['requests'] += 1
            
            # キャッシュを更新
            cache.set(cache_key, rate_limit_data, self.rate_limit[request_type]['window'])
            
            # 制限を超えているかチェック
            if rate_limit_data['requests'] > self.rate_limit[request_type]['max_requests']:
                retry_after = int(rate_limit_data['reset_time'] - time.time())
                return JsonResponse({
                    'error': 'Too many requests',
                    'retry_after': retry_after
                }, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # 通常のリクエスト処理を続行
        return self.get_response(request)
    
    def _should_rate_limit(self, request):
        """
        リクエストがレート制限の対象かどうかを判断します。
        """
        # 認証関連エンドポイントは常にレート制限する
        if '/auth/' in request.path:
            return True
        
        # APIエンドポイントはレート制限する
        if request.path.startswith('/api/'):
            return True
        
        return False
    
    def _get_client_ip(self, request):
        """
        クライアントのIPアドレスを取得します。
        プロキシが設定されている場合はX-Forwarded-Forを参照します。
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
