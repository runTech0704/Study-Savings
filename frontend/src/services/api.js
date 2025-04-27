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

// Axiosインスタンスの設定
const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// リクエストインターセプター - リクエスト送信前に実行
axiosInstance.interceptors.request.use(
  async config => {
    // JWTトークンがあれば、ヘッダーに追加
    const token = getJwtToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター - レスポンス受信時に実行
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
        window.location.href = '/login';
      }
    }
    
    // エラーをコンソールに表示
    if (process.env.NODE_ENV !== 'production') {
      console.error('API Error:', error.response ? error.response.data : error.message);
    }
    return Promise.reject(error);
  }
);

const API = {
  // 認証関連
  auth: {
    // ユーザー登録
    register: async (userData) => {
      try {
        console.log('新規ユーザー登録リクエスト');
        return await axios.post(`${baseURL}/auth/register/`, userData);
      } catch (error) {
        console.error('ユーザー登録エラー:', error);
        throw error;
      }
    },
    
    // ログイン処理
    login: async (credentials) => {
      try {
        console.log('ログインリクエスト送信:', credentials.username);
        const response = await axios.post(`${baseURL}/auth/login/`, credentials);
        
        // トークンを保存
        if (response.data.access && response.data.refresh) {
          setJwtTokens(response.data.access, response.data.refresh);
          console.log('JWTトークンを保存しました');
        }
        
        return response;
      } catch (error) {
        console.error('ログインエラー:', error);
        throw error;
      }
    },
    
    // ログアウト処理
    logout: async () => {
      try {
        // JWTの場合、サーバー側でのログアウト処理は必要最小限
        const response = await axiosInstance.post('/auth/logout/');
        
        // クライアント側でトークンを削除
        removeJwtTokens();
        console.log('JWTトークンを削除しました');
        
        return response;
      } catch (error) {
        // エラーが発生しても、クライアント側のトークンは削除する
        removeJwtTokens();
        console.log('ログアウト処理中にエラーが発生しましたが、トークンは削除されました');
        return { data: { message: 'ログアウトしました。' } };
      }
    },
    
    // JWTトークンのリフレッシュ
    refreshToken: async () => {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        return Promise.reject('リフレッシュトークンがありません');
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
        return Promise.reject('トークンがありません');
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
      // JWT認証があるかチェック
      const token = getJwtToken();
      if (token) {
        try {
          // JWTで認証されているかどうかチェック
          await API.auth.verifyToken();
          console.log('JWT認証有効');
          
          // ユーザー情報取得
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
            // リフレッシュに失敗した場合、トークンを削除
            console.error('トークンのリフレッシュに失敗しました:', refreshError);
            removeJwtTokens();
            return { data: { isAuthenticated: false } };
          }
        }
      }
      
      // トークンがない場合は未認証
      return { data: { isAuthenticated: false } };
    },
    
    // ユーザー情報を取得
    getUser: () => axiosInstance.get('/user/'),
    
    // ユーザー情報を更新
    updateUser: (userData) => axiosInstance.put('/user/', userData),
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
    getLearningAnalysis: (studyPurpose) => axiosInstance.post('/analyze-learning/', { study_purpose: studyPurpose }),
  },
};

export default API;
