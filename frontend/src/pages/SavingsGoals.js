import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button,
  IconButton,
  Card,
  CardContent,
  CardActions,
  LinearProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  Divider
} from '@mui/material';
import { 
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import API from '../services/api';

// バリデーションスキーマ
const validationSchema = yup.object({
  title: yup
    .string()
    .required('目標タイトルを入力してください')
    .max(200, 'タイトルは200文字以内で入力してください'),
  target_amount: yup
    .number()
    .required('目標金額を入力してください')
    .positive('0より大きい値を入力してください')
    .max(10000000, '目標金額は1000万円以内で入力してください'),
  deadline: yup
    .date()
    .nullable()
    .min(new Date(), '期限は今日以降の日付を選択してください'),
});

function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // データ取得
  const fetchData = async () => {
    try {
      setLoading(true);
      const [goalsRes, statsRes] = await Promise.all([
        API.goals.getAll(),
        API.stats.get()
      ]);
      setGoals(goalsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('データ取得エラー:', error);
      setError('データの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  // フォーム設定
  const formik = useFormik({
    initialValues: {
      title: '',
      target_amount: '',
      deadline: '',
      current_amount: 0,
      is_achieved: false,
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      try {
        if (selectedGoal) {
          // 更新
          await API.goals.update(selectedGoal.id, values);
          setSnackbar({ open: true, message: '貯金目標を更新しました', severity: 'success' });
        } else {
          // 新規作成
          await API.goals.create(values);
          setSnackbar({ open: true, message: '新しい貯金目標を作成しました', severity: 'success' });
        }
        setOpenDialog(false);
        setSelectedGoal(null);
        fetchData();
      } catch (error) {
        console.error('貯金目標保存エラー:', error);
        setSnackbar({ open: true, message: '貯金目標の保存に失敗しました', severity: 'error' });
      }
    },
  });
  
  // ダイアログを開く
  const handleOpenDialog = (goal = null) => {
    if (goal) {
      setSelectedGoal(goal);
      formik.setValues({
        title: goal.title,
        target_amount: goal.target_amount,
        deadline: goal.deadline || '',
        current_amount: goal.current_amount,
        is_achieved: goal.is_achieved,
      });
    } else {
      setSelectedGoal(null);
      formik.resetForm();
    }
    setOpenDialog(true);
  };
  
  // ダイアログを閉じる
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedGoal(null);
    formik.resetForm();
  };
  
  // 削除ダイアログを開く
  const handleOpenDeleteDialog = (goal) => {
    setSelectedGoal(goal);
    setOpenDeleteDialog(true);
  };
  
  // 削除ダイアログを閉じる
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setSelectedGoal(null);
  };
  
  // 目標削除
  const handleDeleteGoal = async () => {
    try {
      await API.goals.delete(selectedGoal.id);
      setSnackbar({ open: true, message: '貯金目標を削除しました', severity: 'success' });
      setOpenDeleteDialog(false);
      fetchData();
    } catch (error) {
      console.error('目標削除エラー:', error);
      setSnackbar({ open: true, message: '貯金目標の削除に失敗しました', severity: 'error' });
    }
  };
  
  // 目標達成状態の切り替え
  const handleToggleAchieved = async (goal) => {
    try {
      const updatedGoal = { ...goal, is_achieved: !goal.is_achieved };
      await API.goals.update(goal.id, updatedGoal);
      
      if (!goal.is_achieved) {
        setSnackbar({ open: true, message: '貯金目標を達成しました！おめでとうございます！', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: '貯金目標を未達成に戻しました', severity: 'info' });
      }
      
      fetchData();
    } catch (error) {
      console.error('目標状態変更エラー:', error);
      setSnackbar({ open: true, message: '貯金目標の状態変更に失敗しました', severity: 'error' });
    }
  };
  
  // スナックバーを閉じる
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };
  
  if (loading && goals.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
          貯金目標
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          新しい目標
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* 総貯金額カード */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 4,
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
              総貯金額
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 1 }}>
              ¥{stats ? Math.round(stats.total_savings).toLocaleString() : '0'}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              勉強時間の時給換算による仮想的な貯金額です。この金額を目標達成のために使いましょう。
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      {goals.length === 0 ? (
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            borderRadius: 3,
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'medium' }}>
            まだ貯金目標がありません
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            「新しい目標」ボタンをクリックして、貯金目標を設定しましょう。
            勉強時間によって貯められた金額で目標を達成できます。
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            新しい目標を追加
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {goals.map((goal) => (
            <Grid item xs={12} sm={6} md={4} key={goal.id}>
              <Card 
                elevation={0} 
                sx={{ 
                  borderRadius: 3,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                  position: 'relative',
                  ...(goal.is_achieved && {
                    borderColor: 'success.main',
                    borderWidth: 1,
                    borderStyle: 'solid',
                  }),
                }}
              >
                {goal.is_achieved && (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: 16, 
                      right: 16,
                      display: 'flex',
                      alignItems: 'center',
                      color: 'success.main',
                    }}
                  >
                    <CheckCircleIcon sx={{ mr: 0.5 }} fontSize="small" />
                    <Typography variant="body2" fontWeight="medium">
                      達成済み
                    </Typography>
                  </Box>
                )}
                
                <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'medium', mb: 1, pr: goal.is_achieved ? 7 : 0 }}>
                    {goal.title}
                  </Typography>
                  
                  {goal.deadline && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      期限: {format(parseISO(goal.deadline), 'yyyy年MM月dd日', { locale: ja })}
                    </Typography>
                  )}
                  
                  <Box sx={{ mt: 3, mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        進捗
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Math.round(goal.progress_percentage)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={goal.progress_percentage} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        backgroundColor: 'rgba(0, 0, 0, 0.08)',
                      }}
                    />
                  </Box>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      現在の金額
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                      ¥{Math.round(goal.current_amount).toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      / ¥{Math.round(goal.target_amount).toLocaleString()}
                    </Typography>
                  </Box>
                </CardContent>
                
                <Divider />
                
                <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                  <Box>
                    <IconButton 
                      size="small"
                      onClick={() => handleOpenDialog(goal)}
                      color="primary"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small"
                      onClick={() => handleOpenDeleteDialog(goal)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  
                  <Button 
                    size="small"
                    onClick={() => handleToggleAchieved(goal)}
                    color={goal.is_achieved ? "inherit" : "success"}
                    variant={goal.is_achieved ? "text" : "contained"}
                  >
                    {goal.is_achieved ? '未達成に戻す' : '達成済みにする'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* 目標作成・編集ダイアログ */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle>
            {selectedGoal ? '貯金目標を編集' : '新しい貯金目標を作成'}
          </DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              id="title"
              name="title"
              label="目標タイトル"
              value={formik.values.title}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.title && Boolean(formik.errors.title)}
              helperText={formik.touched.title && formik.errors.title}
              placeholder="例: 新しいパソコン購入、旅行資金など"
            />
            
            <TextField
              fullWidth
              margin="normal"
              id="target_amount"
              name="target_amount"
              label="目標金額"
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">¥</InputAdornment>,
              }}
              value={formik.values.target_amount}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.target_amount && Boolean(formik.errors.target_amount)}
              helperText={formik.touched.target_amount && formik.errors.target_amount}
            />
            
            {selectedGoal && (
              <TextField
                fullWidth
                margin="normal"
                id="current_amount"
                name="current_amount"
                label="現在の金額"
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                value={formik.values.current_amount}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.current_amount && Boolean(formik.errors.current_amount)}
                helperText={formik.touched.current_amount && formik.errors.current_amount}
              />
            )}
            
            <TextField
              fullWidth
              margin="normal"
              id="deadline"
              name="deadline"
              label="目標期限 (任意)"
              type="date"
              value={formik.values.deadline}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.deadline && Boolean(formik.errors.deadline)}
              helperText={formik.touched.deadline && formik.errors.deadline}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCloseDialog}>キャンセル</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={!formik.isValid || formik.isSubmitting}
            >
              {selectedGoal ? '更新' : '作成'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      
      {/* 削除確認ダイアログ */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>貯金目標を削除しますか？</DialogTitle>
        <DialogContent>
          <DialogContentText>
            「{selectedGoal?.title}」を削除します。この操作は元に戻せません。
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDeleteDialog}>キャンセル</Button>
          <Button onClick={handleDeleteGoal} color="error">
            削除
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* スナックバー */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default SavingsGoals;
