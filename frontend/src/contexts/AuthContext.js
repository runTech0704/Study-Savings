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
            // ユーザー情報取得でトークンの有効性を確認
            await API.auth.getUser();
            console.log('JWT認証有効です');
            // valueがlogin関数を持っていれば認証状態を更新
            if (value && value.login) {
              value.login();
            }
          } catch (tokenError) {
            console.log('トークンが無効です。リフレッシュを試みます');
            try {
              await API.auth.refreshToken();
              console.log('トークンのリフレッシュに成功しました');
              if (value && value.login) {
                value.login();
              }
            } catch (refreshError) {
              // リフレッシュが失敗した場合はトークンを削除
              console.log('トークンのリフレッシュが失敗しました');
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
            }
          }
        } else {
          // Google OAuthの認証状態をチェック
          try {
            // レート制限により、GoogleOAuthチェックは必要最小限にする
            // JWTトークンがある場合はチェックしない
            /*
            const googleAuthStatus = await API.auth.checkGoogleAuthStatus();
            if (googleAuthStatus.isAuthenticated) {
              console.log('Google OAuthで認証済みです');
              // JWTトークンを取得する
              const tokenResponse = await API.auth.handleGoogleCallback();
              if (tokenResponse.success) {
                console.log('Google OAuthからJWTトークンに成功しました');
                // value.loginが存在する場合はログイン状態を更新
                if (value && value.login) {
                  value.login();
                }
              }
            }
            */
          } catch (googleAuthError) {
            console.error('Google OAuthチェックエラー:', googleAuthError);
          }

          // CSRFトークンのチェックはGoogle OAuthのために必要
          const csrftoken = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='));

          // CSRFトークンがない場合は何もしない
          // 注意: getCSRFToken メソッドは現在実装されていないためコメントアウト
          // if (!csrftoken) {
          //   console.log('CSRFトークンが見つからないため、取得します');
          //   await API.auth.getCSRFToken();
          // }
        }
      } catch (error) {
        console.error('認証状態チェックエラー:', error);
      }
    };

    checkInitialAuth();
  }, [value]);

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

// Google OAuth認証を開始する関数
export const startGoogleOAuth = () => {
  return API.auth.initiateGoogleOAuth();
};
