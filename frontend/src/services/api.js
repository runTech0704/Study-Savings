import axios from 'axios';

// APIのベースURLを設定
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// リトライ設定
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

// キャッシュ設定
const CACHE_DURATION = 30000; // 30秒
const getWithCache = (key, fetchData, duration = CACHE_DURATION) => {
  // キャッシュからデータを取得
  const cachedData = sessionStorage.getItem(key);
  if (cachedData) {
    const data = JSON.parse(cachedData);
    const now = new Date().getTime();

    // キャッシュが有効期限内か確認
    if (now - data.timestamp < duration) {
      console.log(`Cache hit for ${key}`);
      return Promise.resolve(data.value);
    }
    console.log(`Cache expired for ${key}`);
  }

  // キャッシュがないか期限切れの場合はデータを取得してキャッシュ
  return fetchData().then(response => {
    const dataToCache = {
      value: response.data,
      timestamp: new Date().getTime()
    };
    sessionStorage.setItem(key, JSON.stringify(dataToCache));
    return response.data;
  });
};

// Axiosインスタンスの設定
const axiosInstance = axios.create({
  baseURL: baseURL,
  withCredentials: process.env.REACT_APP_API_CREDENTIALS === 'include',  // 環境変数に基づいてクッキーを含めるかどうかを決定
  headers: {
    'Content-Type': 'application/json',
  },
  // タイムアウト設定
  timeout: 30000, // 30秒
});

// リクエストインターセプター（認証トークンの追加）
axiosInstance.interceptors.request.use(
  config => {
    // JWTトークンが存在する場合はAuthorizationヘッダーに追加
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('リクエストにトークンを追加しました:', config.url);
    } else {
      console.log('JWTトークンがありません', config.url);
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// リトライロジックを実装するインターセプター
axiosInstance.interceptors.response.use(
  response => response,
  async (error) => {
    // リクエスト設定を取得
    const { config } = error;

    // リトライカウンターがまだ設定されていなければ0に設定
    config.retryCount = config.retryCount || 0;

    // 429エラーかつリトライ回数が上限未満の場合
    if (error.response?.status === 429 && config.retryCount < MAX_RETRIES) {
      // リトライカウンターをインクリメント
      config.retryCount += 1;

      // 遅延を設定（指数バックオフ）
      const delay = RETRY_DELAY * (2 ** config.retryCount);

      // 指定時間待機
      await new Promise(resolve => setTimeout(resolve, delay));

      // リクエストを再試行
      return axiosInstance(config);
    }

    // その他のエラーまたはリトライ回数が上限に達した場合はエラーを返す
    return Promise.reject(error);
  }
);

// レスポンスインターセプター（認証エラーの処理）
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    // 認証エラー（401）の場合
    if (error.response && error.response.status === 401) {
      console.warn('認証が必要です');
      // 認証エラーを通知するなどの処理を追加可能
    }
    return Promise.reject(error);
  }
);

const API = {
  // 認証関連
  auth: {
    // CSRFトークンを取得するメソッド
    getCSRFToken: () => axiosInstance.get('/auth/csrf/'),

    // 認証状態をチェックするメソッド - 直接JWTトークンでチェック
    checkAuth: () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        // トークンがあれば検証を試行
        try {
          return axiosInstance.get('/auth/verify/', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }).then(() => {
            return { data: { isAuthenticated: true } };
          }).catch(() => {
            return { data: { isAuthenticated: false } };
          });
        } catch (error) {
          console.warn('認証状態チェックエラー:', error);
          return { data: { isAuthenticated: false } };
        }
      }
      // トークンがない場合は未認証
      return Promise.resolve({ data: { isAuthenticated: false } });
    },

    // JWTトークンの検証
    verifyToken: () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        return Promise.reject(new Error('トークンがありません'));
      }

      // トークンの検証（実際にはリソースへのアクセスで確認）
      return axiosInstance.get('/user/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(response => {
        console.log('トークン検証成功 - ユーザー情報取得成功');
        return response;
      });
    },

    // JWTトークンのリフレッシュ
    refreshToken: () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        return Promise.reject(new Error('リフレッシュトークンがありません'));
      }
      return axiosInstance.post('/auth/token/refresh/', {
        refresh: refreshToken
      }).then(response => {
        if (response.data.access) {
          localStorage.setItem('access_token', response.data.access);
          console.log('新しいトークンを取得しました:', response.data.access.slice(0, 15) + '...');
          return response;
        }
        return Promise.reject(new Error('新しいトークンがありません'));
      });
    },

    // ログイン処理 - キャッシュをクリア
    login: (credentials) => {
      // キャッシュをクリア
      sessionStorage.removeItem('auth_status');
      sessionStorage.removeItem('user_profile');
      return axiosInstance.post('/auth/login/', credentials)
        .then(response => {
          // レスポンスからJWTトークンを取得して保存
          if (response.data.access && response.data.refresh) {
            localStorage.setItem('access_token', response.data.access);
            localStorage.setItem('refresh_token', response.data.refresh);
            console.log('APIでトークンが保存されました:', response.data.access);
          }
          return response;
        });
    },

    // ログアウト処理 - キャッシュをクリア
    logout: () => {
      // キャッシュとトークンをクリア
      sessionStorage.removeItem('auth_status');
      sessionStorage.removeItem('user_profile');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      console.log('ログアウト時にJWTトークンを削除しました');
      return axiosInstance.post('/auth/logout/');
    },

    // ユーザー登録
    register: (userData) => axiosInstance.post('/auth/register/', userData),

    // ユーザー情報取得 - キャッシュを使用
    getUser: () => {
      return getWithCache('user_profile', () => axiosInstance.get('/user/'), 300000); // 5分のキャッシュ
    },

    // ユーザー情報更新 - キャッシュをクリア
    updateUser: (userData) => {
      // キャッシュをクリア
      sessionStorage.removeItem('user_profile');
      return axiosInstance.put('/user/', userData);
    },

    // Google OAuth関連のメソッドを追加
    // Google OAuth認証の開始
    initiateGoogleOAuth: () => {
      // Google OAuthのリダイレクトURLを取得して、ポップアップで開く
      const redirectUri = `${window.location.origin}/google-callback`;
      // APIのベースURLを使用してGoogleログインURLを構築
      const googleAuthUrl = `${baseURL.replace('/api', '')}/accounts/google/login/?process=login&next=${encodeURIComponent(redirectUri)}&prompt=select_account`;
      
      console.log('Google認証URL:', googleAuthUrl);

      // ポップアップの中央に表示するための計算
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      // ポップアップを開く
      const popup = window.open(
        googleAuthUrl,
        'googleOAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // ポップアップがブロックされていないか確認
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        console.error('ポップアップがブロックされています');
        alert('ポップアップがブロックされています。このサイトのポップアップを許可してください。');
        return false;
      }

      return true;
    },

    // Google OAuth認証後の処理
    handleGoogleCallback: async () => {
      try {
        // キャッシュをクリア
        sessionStorage.removeItem('auth_status');
        sessionStorage.removeItem('user_profile');

        console.log('Googleコールバック処理開始');

        // まず認証状態をチェック
        console.log('認証状態をチェック中...');
        const response = await axios.get(`${baseURL}/auth/check/`, { 
          withCredentials: true,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          } 
        });
        
        console.log('認証状態レスポンス:', response.data);

        if (response.data.isAuthenticated) {
          console.log('認証済みです。新しいカスタムエンドポイントでJWTトークンを取得します');
          
          // 新しいカスタムエンドポイントを使ってJWTトークンを取得
          try {
            const tokenResponse = await axios.get(`${baseURL}/auth/oauth-to-jwt/`, {
              withCredentials: true,
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });

            console.log('JWTトークンレスポンス:', tokenResponse.data);

            if (tokenResponse.data.success && tokenResponse.data.access && tokenResponse.data.refresh) {
              // JWTトークンをローカルストレージに保存
              localStorage.setItem('access_token', tokenResponse.data.access);
              localStorage.setItem('refresh_token', tokenResponse.data.refresh);
              console.log('JWTトークンを保存しました');
              return { success: true, user: tokenResponse.data.user, token: tokenResponse.data };
            } else {
              console.error('トークンレスポンスにトークンがありません');
              return { success: false, error: 'トークンレスポンスが無効です' };
            }
          } catch (tokenError) {
            console.error('トークン取得エラー:', tokenError);
            console.error('エラーデータ:', tokenError.response?.data);
            
            // バックアップとして、以前のメソッドを試行
            console.log('バックアップメソッドを試行中...');
            try {
              const legacyTokenResponse = await axios.post(`${baseURL}/auth/token/`, {
                username: response.data.username,
                password: ""  // OAuthの場合は空のパスワードでも認証される
              }, {
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-cache'
                }
              });

              if (legacyTokenResponse.data.access && legacyTokenResponse.data.refresh) {
                localStorage.setItem('access_token', legacyTokenResponse.data.access);
                localStorage.setItem('refresh_token', legacyTokenResponse.data.refresh);
                console.log('バックアップ方法でJWTトークンを保存しました');
                return { success: true, user: response.data, token: legacyTokenResponse.data };
              }
            } catch (backupError) {
              console.error('バックアップ方法も失敗:', backupError);
            }
            
            return { success: false, error: 'トークンの取得に失敗しました: ' + (tokenError.response?.data?.detail || tokenError.message) };
          }
        } else {
          console.error('認証されていません');
          return { success: false, error: '認証状態の確認に失敗しました' };
        }
      } catch (error) {
        console.error('Google認証コールバック処理エラー:', error);
        console.error('エラーデータ:', error.response?.data);
        return { success: false, error: '認証処理中にエラーが発生しました: ' + (error.response?.data?.detail || error.message) };
      }
    },

    // Google OAuth状態のチェック - キャッシュを使用
    checkGoogleAuthStatus: async () => {
      try {
        return getWithCache('google_auth_status', () => axios.get(`${baseURL}/auth/check/`, { withCredentials: true }), 60000); // 1分のキャッシュ
      } catch (error) {
        console.error('Google認証状態確認エラー:', error);
        return { isAuthenticated: false };
      }
    },
  },

  // 科目関連
  subjects: {
    getAll: () => axiosInstance.get('/subjects/'),
    getById: (id) => axiosInstance.get(`/subjects/${id}/`),
    create: (subjectData) => axiosInstance.post('/subjects/', subjectData),
    update: (id, subjectData) => axiosInstance.put(`/subjects/${id}/`, subjectData),
    delete: (id) => axiosInstance.delete(`/subjects/${id}/`),
  },

  // 勉強セッション関連
  sessions: {
    getAll: () => axiosInstance.get('/sessions/'),
    getById: (id) => axiosInstance.get(`/sessions/${id}/`),
    create: (sessionData) => axiosInstance.post('/sessions/', sessionData),
    update: (id, sessionData) => axiosInstance.put(`/sessions/${id}/`, sessionData),
    delete: (id) => axiosInstance.delete(`/sessions/${id}/`),
    start: (subjectId) => axiosInstance.post('/sessions/start/', { subject: subjectId }),
    stop: (sessionId) => axiosInstance.post(`/sessions/${sessionId}/stop/`),
    getCurrent: () => axiosInstance.get('/sessions/current/'),
  },

  // 貯金目標関連
  goals: {
    getAll: () => axiosInstance.get('/goals/'),
    getById: (id) => axiosInstance.get(`/goals/${id}/`),
    create: (goalData) => axiosInstance.post('/goals/', goalData),
    update: (id, goalData) => axiosInstance.put(`/goals/${id}/`, goalData),
    delete: (id) => axiosInstance.delete(`/goals/${id}/`),
  },

  // 統計関連
  stats: {
    get: () => axiosInstance.get('/stats/'),
  },

  // 学習分析関連
  analysis: {
    // 学習分析を取得
    getLearningAnalysis: (purpose) => axiosInstance.post('/analyze-learning/', { purpose }),
  },
};

export default API;
