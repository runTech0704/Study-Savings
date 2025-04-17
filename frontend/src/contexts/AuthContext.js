import React, { createContext, useContext, useEffect } from 'react';
import API from '../services/api';

// 認証コンテキストの作成
const AuthContext = createContext(null);

// AuthProviderコンポーネント
export const AuthProvider = ({ children, value }) => {
  // 初期読み込み時の認証状態チェック
  useEffect(() => {
    const checkInitialAuth = async () => {
      try {
        // JWTトークンがあるか確認
        const accessToken = localStorage.getItem('access_token');
        if (accessToken) {
          console.log('JWTトークンが見つかりました。認証状態を確認します');
          try {
            await API.auth.verifyToken();
            console.log('JWT認証有効です');
          } catch (tokenError) {
            console.log('トークンが無効です。リフレッシュを試みます');
            try {
              await API.auth.refreshToken();
              console.log('トークンのリフレッシュに成功しました');
            } catch (refreshError) {
              // リフレッシュが失敗した場合はトークンを削除
              console.log('トークンのリフレッシュが失敗しました');
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
            }
          }
        } else {
          // セッション認証のチェック
          const csrftoken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='));

          // CSRFトークンがない場合のみ取得する
          if (!csrftoken) {
            console.log('CSRFトークンが見つからないため、取得します');
            await API.auth.getCSRFToken();
          }
        }
      } catch (error) {
        console.error('認証状態チェックエラー:', error);
      }
    };

    checkInitialAuth();
  }, []);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// 認証コンテキストを使用するカスタムフック
export const useAuth = () => {
  return useContext(AuthContext);
};
