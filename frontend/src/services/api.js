import axios from 'axios';

// APIのベースURLを設定
const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// JWTトークンを取得する関数
const getJwtToken = () => {
  return localStorage.getItem('access_token');
};

// JWTトークンを設定する関数
const setJwtTokens = (access, refresh) => {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
};

// JWTトークンを削除する関数
const removeJwtTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

// CSRFトークンを取得する関数
const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

// CSRFトークン取得の最大再試行回数
const MAX_CSRF_RETRIES = 3;
let csrfRetryCount = 0;

// Axiosインスタンスの設定
const axiosInstance = axios.create({
  baseURL: baseURL,
  withCredentials: true,  // クロスオリジンリクエストにクッキーを含める
  headers: {
    'Content-Type': 'application/json',
  }
});

// リクエストインターセプター
axiosInstance.interceptors.request.use(
  async config => {
    // JWTトークンがあれば、ヘッダーに追加
    const token = getJwtToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // CSRFトークンの処理も維持（両方の認証方法をサポート）
    if (config.method === 'post' || config.method === 'put' || config.method === 'delete' || config.method === 'patch') {
      let csrfToken = getCookie('csrftoken');
      
      // CSRFトークンがない場合、取得する
      if (!csrfToken && config.url !== '/auth/csrf/' && !token) {
        try {
          console.log('CSRFトークンが見つからないため、自動的に取得します');
          // 配列循環を回避するために直接 axios を使用
          const response = await axios.get(`${baseURL}/auth/csrf/`, { 
            withCredentials: true,
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            } 
          });
          // ヘッダーから取得を試行
          csrfToken = response.headers['x-csrftoken'];
          
          // ヘッダから取得できない場合は再度Cookieをチェック
          if (!csrfToken) {
            // 少し待ってからCookieをチェック
            await new Promise(resolve => setTimeout(resolve, 100));
            csrfToken = getCookie('csrftoken');
          } else {
            // マニュアルでCookieを設定 - SameSite=Noneを使用(クロスドメイン対応)
            console.log('インターセプターでCSRFトークン設定:', csrfToken);
            document.cookie = `csrftoken=${csrfToken}; path=/; SameSite=None; Secure;`;
          }
        } catch (error) {
          console.error('CSRFトークン取得に失敗しました:', error);
        }
      }
      
      if (csrfToken && !token) {
        // バックエンドが受け付けるヘッダー名のみを使用
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // 401エラーの場合、トークンのリフレッシュを試みる
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken) {
        try {
          console.log('トークンのリフレッシュを試みます');
          const response = await axios.post(`${baseURL}/auth/token/refresh/`, {
            refresh: refreshToken
          });
          
          if (response.data.access) {
            // 新しいアクセストークンを保存
            localStorage.setItem('access_token', response.data.access);
            
            // 元のリクエストに新しいトークンを設定して再実行
            originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
            return axiosInstance(originalRequest);
          }
        } catch (refreshError) {
          console.error('トークンのリフレッシュに失敗しました:', refreshError);
          // トークンをクリアしてログイン画面にリダイレクト
          removeJwtTokens();
          window.location.href = '/login';
        }
      } else {
        // リフレッシュトークンがない場合
        console.warn('リフレッシュトークンが見つかりません');
      }
    }
    
    // エラーをコンソールに表示（デバッグ用）
    console.error('API Error:', error.response ? error.response.data : error.message);
    return Promise.reject(error);
  }
);

const API = {
  // 認証関連
  auth: {
    // CSRFトークンを取得するメソッド（従来の認証用）
    getCSRFToken: async () => {
      try {
        csrfRetryCount = 0;
        console.log('エンドポイントを呼び出してCSRFトークンを取得しています...');
        
        // モバイルブラウザでも動作するようにオプションを調整
        const response = await axios.get(`${baseURL}/auth/csrf/`, {
          withCredentials: true,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          }
        });
        
        // レスポンスヘッダーからCSRFトークンを取得
        const csrfToken = response.headers['x-csrftoken'];
        if (csrfToken) {
          console.log('X-CSRFTokenヘッダーからトークンを取得しました:', csrfToken);
          // SameSite=Noneを使用してクロスドメインでも動作するようにする
          document.cookie = `csrftoken=${csrfToken}; path=/; SameSite=None; Secure;`;
        } else {
          console.log('CookieからCSRFトークンを取得しています...');
          // Cookieから取得を試行
          const cookieToken = getCookie('csrftoken');
          if (cookieToken) {
            console.log('Cookieからトークンを取得しました:', cookieToken);
          } else {
            console.warn('レスポンスからCSRFトークンを取得できませんでした');
          }
        }
        
        return response;
      } catch (error) {
        console.error('CSRFトークン取得エラー:', error);
        if (csrfRetryCount < MAX_CSRF_RETRIES) {
          csrfRetryCount++;
          console.log(`CSRFトークン取得再試行 (${csrfRetryCount}/${MAX_CSRF_RETRIES})`);
          return API.auth.getCSRFToken();
        }
        throw error;
      }
    },
    
    // JWT認証用の新しいメソッド
    loginJWT: async (credentials) => {
      try {
        console.log('JWTログインを試みます:', credentials.username);
        const response = await axios.post(`${baseURL}/auth/login-jwt/`, credentials);
        
        // トークンを保存
        if (response.data.access && response.data.refresh) {
          setJwtTokens(response.data.access, response.data.refresh);
          console.log('JWTトークンを保存しました');
        }
        
        return response;
      } catch (error) {
        console.error('JWTログインエラー:', error);
        throw error;
      }
    },
    
    // JWTログアウト処理
    logoutJWT: () => {
      removeJwtTokens();
      console.log('JWTトークンを削除しました');
      return Promise.resolve({ data: { message: 'ログアウトしました。' } });
    },
    
    // JWTトークンのリフレッシュ
    refreshToken: async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        return Promise.reject('No refresh token available');
      }
      
      try {
        const response = await axios.post(`${baseURL}/auth/token/refresh/`, {
          refresh: refreshToken
        });
        
        if (response.data.access) {
          localStorage.setItem('access_token', response.data.access);
        }
        
        return response;
      } catch (error) {
        console.error('トークンのリフレッシュに失敗しました:', error);
        removeJwtTokens(); // 失敗した場合はトークンを削除
        throw error;
      }
    },
    
    // トークン検証
    verifyToken: async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        return Promise.reject('No token available');
      }
      
      try {
        return await axios.post(`${baseURL}/auth/token/verify/`, {
          token: token
        });
      } catch (error) {
        console.error('トークンの検証に失敗しました:', error);
        throw error;
      }
    },
    
    // 認証状態をチェックするメソッド
    checkAuth: async () => {
      // JWT認証があれば、それを使用
      const token = getJwtToken();
      if (token) {
        try {
          // JWTで認証されているかどうかチェック
          await API.auth.verifyToken();
          console.log('JWT認証有効');
          // ユーザー情報取得（必要な場合）
          const userResponse = await axiosInstance.get('/user/');
          return {
            data: {
              isAuthenticated: true,
              username: userResponse.data.username,
              authType: 'jwt'
            }
          };
        } catch (error) {
          console.error('JWT認証チェックエラー:', error);
          // JWTトークンが無効な場合、リフレッシュを試みる
          try {
            await API.auth.refreshToken();
            return {
              data: {
                isAuthenticated: true,
                authType: 'jwt'
              }
            };
          } catch (refreshError) {
            console.error('トークンのリフレッシュにも失敗しました:', refreshError);
            removeJwtTokens();
            return { data: { isAuthenticated: false } };
          }
        }
      }
      
      // JWTがない場合は当初のセッション認証を使用
      try {
        const response = await axiosInstance.get('/auth/check/');
        return response;
      } catch (error) {
        console.error('認証状態チェックエラー:', error);
        return { data: { isAuthenticated: false } };
      }
    },
    register: async (userData) => {
      try {
        // JWTの場合は直接リクエスト
        console.log('新規ユーザー登録のためのリクエストを送信します');
        return await axios.post(`${baseURL}/auth/register/`, userData);
      } catch (error) {
        console.error('ユーザー登録エラー:', error);
        throw error;
      }
    },
    getUser: () => axiosInstance.get('/user/'),
    updateUser: (userData) => axiosInstance.put('/user/', userData),
  },
  
  // 科目関連
  subjects: {
    getAll: () => axiosInstance.get('/subjects/'),
    getById: (id) => axiosInstance.get(`/subjects/${id}/`),
    create: async (subjectData) => {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        await API.auth.getCSRFToken();
      }
      return axiosInstance.post('/subjects/', subjectData);
    },
    update: async (id, subjectData) => {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        await API.auth.getCSRFToken();
      }
      return axiosInstance.put(`/subjects/${id}/`, subjectData);
    },
    delete: async (id) => {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        await API.auth.getCSRFToken();
      }
      return axiosInstance.delete(`/subjects/${id}/`);
    },
  },
  
  // 勉強セッション関連
  sessions: {
    getAll: () => axiosInstance.get('/sessions/'),
    getById: (id) => axiosInstance.get(`/sessions/${id}/`),
    create: async (sessionData) => {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        await API.auth.getCSRFToken();
      }
      return axiosInstance.post('/sessions/', sessionData);
    },
    update: async (id, sessionData) => {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        await API.auth.getCSRFToken();
      }
      return axiosInstance.put(`/sessions/${id}/`, sessionData);
    },
    delete: async (id) => {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        await API.auth.getCSRFToken();
      }
      return axiosInstance.delete(`/sessions/${id}/`);
    },
    start: async (subjectId) => {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        await API.auth.getCSRFToken();
      }
      return axiosInstance.post('/sessions/start/', { subject: subjectId });
    },
    stop: async (sessionId) => {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        await API.auth.getCSRFToken();
      }
      return axiosInstance.post(`/sessions/${sessionId}/stop/`);
    },
    getCurrent: () => axiosInstance.get('/sessions/current/'),
  },
  
  // 貯金目標関連
  goals: {
    getAll: () => axiosInstance.get('/goals/'),
    getById: (id) => axiosInstance.get(`/goals/${id}/`),
    create: async (goalData) => {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        await API.auth.getCSRFToken();
      }
      return axiosInstance.post('/goals/', goalData);
    },
    update: async (id, goalData) => {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        await API.auth.getCSRFToken();
      }
      return axiosInstance.put(`/goals/${id}/`, goalData);
    },
    delete: async (id) => {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        await API.auth.getCSRFToken();
      }
      return axiosInstance.delete(`/goals/${id}/`);
    },
  },
  
  // 統計関連
  stats: {
    get: () => axiosInstance.get('/stats/'),
  },
  
  // 学習分析関連
  analysis: {
    getLearningAnalysis: async (studyPurpose) => {
      const csrfToken = getCookie('csrftoken');
      if (!csrfToken) {
        await API.auth.getCSRFToken();
      }
      return axiosInstance.post('/analyze-learning/', { study_purpose: studyPurpose });
    },
  },
};

export default API;
