import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Link, 
  Divider, 
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import API from '../services/api';

// バリデーションスキーマ
const validationSchema = yup.object({
  username: yup
    .string()
    .required('ユーザー名を入力してください')
    .min(3, 'ユーザー名は最低3文字必要です')
    .max(30, 'ユーザー名は最大30文字までです'),
  email: yup
    .string()
    .email('有効なメールアドレスを入力してください')
    .required('メールアドレスを入力してください'),
  password: yup
    .string()
    .required('パスワードを入力してください')
    .min(8, 'パスワードは最低8文字必要です'),
  password2: yup
    .string()
    .oneOf([yup.ref('password'), null], 'パスワードが一致しません')
    .required('パスワード（確認）を入力してください'),
  first_name: yup
    .string()
    .required('名前を入力してください'),
  last_name: yup
    .string()
    .required('姓を入力してください'),
});

function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ページロード時にCSRFトークンを確認
  useEffect(() => {
    const checkCSRFToken = async () => {
      // クッキーからCSRFトークンを取得できるか確認
      const csrftoken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='));

      // CSRFトークンがない場合のみ取得する
      if (!csrftoken) {
        try {
          console.log('CSRFトークンが見つからないため、取得します');
          await API.auth.getCSRFToken();
        } catch (error) {
          console.error('CSRFトークン取得エラー:', error);
        }
      }
    };
    
    checkCSRFToken();
  }, []);
  
  const formik = useFormik({
    initialValues: {
      username: '',
      email: '',
      password: '',
      password2: '',
      first_name: '',
      last_name: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setError('');
      
      try {
        console.log('登録データ送信開始:', values);
        
        // 再度CSRFトークンがあるか確認
        const csrftoken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrftoken='));
          
        if (!csrftoken) {
          console.log('登録前にCSRFトークンが見つからないため、取得します');
          await API.auth.getCSRFToken();
        }
        
        // 登録処理
        const response = await API.auth.register(values);
        console.log('登録成功:', response);
        navigate('/login', { state: { registered: true } });
      } catch (error) {
        console.error('登録エラー:', error);
        
        // エラーレスポンスペイロードがある場合
        if (error.response?.data) {
          console.log('エラーレスポンスデータ:', error.response.data);
          
          // フィールドエラーのハンドリング
          if (error.response.data.username) {
            const errorMsg = Array.isArray(error.response.data.username) 
              ? error.response.data.username.join(' ') 
              : error.response.data.username;
            setError(`ユーザー名エラー: ${errorMsg}`);
          } else if (error.response.data.email) {
            const errorMsg = Array.isArray(error.response.data.email) 
              ? error.response.data.email.join(' ') 
              : error.response.data.email;
            setError(`メールアドレスエラー: ${errorMsg}`);
          } else if (error.response.data.password) {
            const errorMsg = Array.isArray(error.response.data.password) 
              ? error.response.data.password.join(' ') 
              : error.response.data.password;
            setError(`パスワードエラー: ${errorMsg}`);
          } else if (error.response.data.error) {
            // サーバーからのカスタムエラーメッセージ
            setError(`サーバーエラー: ${error.response.data.error}`);
          } else if (error.response.status === 500) {
            setError('サーバー内部エラーが発生しました。開発者にお問い合わせください。');
          } else {
            // その他のエラー
            setError('登録に失敗しました。もう一度お試しください。');
          }
        } else if (error.message) {
          // ネットワークエラー等
          setError(`エラー: ${error.message}`);
        } else {
          setError('不明なエラーが発生しました。もう一度お試しください。');
        }
      } finally {
        setLoading(false);
      }
    },
  });
  
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minHeight: '100vh',
          pt: 8,
        }}
      >
        <Typography component="h1" variant="h4" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
          StudySavings
        </Typography>
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          勉強時間を記録して仮想的にお金を貯めよう
        </Typography>
        
        <Paper
          elevation={0}
          sx={{
            p: 4,
            width: '100%',
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Typography component="h2" variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
            新規登録
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="last_name"
                  name="last_name"
                  label="姓"
                  value={formik.values.last_name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.last_name && Boolean(formik.errors.last_name)}
                  helperText={formik.touched.last_name && formik.errors.last_name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="first_name"
                  name="first_name"
                  label="名"
                  value={formik.values.first_name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.first_name && Boolean(formik.errors.first_name)}
                  helperText={formik.touched.first_name && formik.errors.first_name}
                />
              </Grid>
            </Grid>
            
            <TextField
              fullWidth
              id="username"
              name="username"
              label="ユーザー名"
              margin="normal"
              value={formik.values.username}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.username && Boolean(formik.errors.username)}
              helperText={formik.touched.username && formik.errors.username}
            />
            
            <TextField
              fullWidth
              id="email"
              name="email"
              label="メールアドレス"
              margin="normal"
              value={formik.values.email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.email && Boolean(formik.errors.email)}
              helperText={formik.touched.email && formik.errors.email}
            />
            
            <TextField
              fullWidth
              id="password"
              name="password"
              label="パスワード"
              type="password"
              margin="normal"
              value={formik.values.password}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password && Boolean(formik.errors.password)}
              helperText={formik.touched.password && formik.errors.password}
            />
            
            <TextField
              fullWidth
              id="password2"
              name="password2"
              label="パスワード（確認）"
              type="password"
              margin="normal"
              value={formik.values.password2}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.password2 && Boolean(formik.errors.password2)}
              helperText={formik.touched.password2 && formik.errors.password2}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5 }}
            >
              {loading ? <CircularProgress size={24} /> : 'アカウント作成'}
            </Button>
          </form>
          
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              すでにアカウントをお持ちの方は{' '}
              <Link component={RouterLink} to="/login" underline="hover">
                ログイン
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Register;
