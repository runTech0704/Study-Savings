import React, { useState, useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Card,
  CardContent,
  IconButton,
  Divider,
  Link
} from '@mui/material';
import {
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Add as AddIcon,
  AccessTime as AccessTimeIcon,
  LocalAtm as MoneyIcon
} from '@mui/icons-material';
import API from '../services/api';

// ゼロパディング関数
const padZero = (num) => {
  return num.toString().padStart(2, '0');
};

// 経過時間をフォーマット
const formatElapsedTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${padZero(hours)}:${padZero(minutes)}:${padZero(secs)}`;
};

function StudyTimer() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [currentSession, setCurrentSession] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [loading, setLoading] = useState(true);
  const [startLoading, setStartLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // 現在の勉強セッションと科目データを取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 現在のセッションを取得
        const currentRes = await API.sessions.getCurrent();
        setCurrentSession(currentRes.data.active ? currentRes.data.session : null);

        // セッションがアクティブならタイマーを設定
        if (currentRes.data.active) {
          const startTime = new Date(currentRes.data.session.start_time).getTime();
          startTimeRef.current = startTime;
          const now = new Date().getTime();
          setElapsedTime(Math.floor((now - startTime) / 1000));
          startTimer();
        } else {
          // 勉強科目のリストを取得
          const subjectsRes = await API.subjects.getAll();
          setSubjects(subjectsRes.data);

          if (subjectsRes.data.length > 0) {
            setSelectedSubject(subjectsRes.data[0].id);
          }
        }
      } catch (error) {
        console.error('データ取得エラー:', error);
        setError('データの読み込みに失敗しました。ページを再読み込みしてください。');
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // クリーンアップ関数
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // タイマーを開始
  const startTimer = () => {
    if (timerRef.current) return;

    timerRef.current = setInterval(() => {
      const startTime = startTimeRef.current;
      const now = new Date().getTime();
      setElapsedTime(Math.floor((now - startTime) / 1000));
    }, 1000);
  };

  // タイマーを停止
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 勉強セッション開始
  const handleStartSession = async () => {
    if (!selectedSubject) {
      setSnackbar({
        open: true,
        message: '勉強科目を選択してください',
        severity: 'warning'
      });
      return;
    }

    try {
      setStartLoading(true);
      const response = await API.sessions.start(selectedSubject);
      setCurrentSession(response.data);
      setNotes('');

      // タイマー開始
      const startTime = new Date(response.data.start_time).getTime();
      startTimeRef.current = startTime;
      setElapsedTime(0);
      startTimer();

      setSnackbar({
        open: true,
        message: '勉強タイマーを開始しました',
        severity: 'success'
      });
    } catch (error) {
      console.error('セッション開始エラー:', error);
      setSnackbar({
        open: true,
        message: 'タイマーの開始に失敗しました',
        severity: 'error'
      });
    } finally {
      setStartLoading(false);
    }
  };

  // 勉強セッション終了
  const handleStopSession = async () => {
    if (!currentSession) return;

    try {
      setStopLoading(true);
      const response = await API.sessions.stop(currentSession.id);
      stopTimer();
      setCurrentSession(null);

      // 学習記録が保存されたことをユーザーに通知
      const hours = response.data.duration ?
        parseFloat((new Date(response.data.duration) - new Date(0)) / 3600000).toFixed(2) :
        (elapsedTime / 3600).toFixed(2);

      const amount = response.data.earned_amount ?
        Math.round(response.data.earned_amount) :
        0;

      setSnackbar({
        open: true,
        message: `勉強記録を保存しました！ ${amount.toLocaleString()}円獲得！`,
        severity: 'success'
      });

      // 科目リストを取得
      const subjectsRes = await API.subjects.getAll();
      setSubjects(subjectsRes.data);

      if (subjectsRes.data.length > 0) {
        setSelectedSubject(subjectsRes.data[0].id);
      }

    } catch (error) {
      console.error('セッション終了エラー:', error);
      setSnackbar({
        open: true,
        message: 'タイマーの停止に失敗しました',
        severity: 'error'
      });
    } finally {
      setStopLoading(false);
    }
  };

  // 科目選択変更
  const handleSubjectChange = (event) => {
    setSelectedSubject(event.target.value);
  };

  // メモ変更
  const handleNotesChange = (event) => {
    setNotes(event.target.value);
  };

  // スナックバーを閉じる
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // 現在のセッションのメモを更新
  const updateSessionNotes = async () => {
    if (!currentSession) return;

    try {
      await API.sessions.update(currentSession.id, { 
        notes, 
        subject: currentSession.subject 
      });
      setSnackbar({
        open: true,
        message: 'メモを更新しました',
        severity: 'success'
      });
    } catch (error) {
      console.error('メモ更新エラー:', error);
      setSnackbar({
        open: true,
        message: 'メモの更新に失敗しました',
        severity: 'error'
      });
    }
  };

  // 画面表示部分
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  // 科目がない場合
  if (subjects.length === 0 && !currentSession) {
    return (
      <Box>
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
            勉強タイマーを使うには科目が必要です
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            まずは勉強する科目を登録しましょう。科目ごとに時給換算額を設定できます。
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            component={RouterLink}
            to="/subjects"
          >
            科目を追加する
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* タイマーカード */}
        <Grid item xs={12} md={currentSession ? 12 : 8}>
          <Paper
            elevation={0}
            sx={{
              p: 4,
              borderRadius: 3,
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            }}
          >
            {currentSession ? (
              <>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  現在の勉強: <strong>{currentSession.subject_name}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                  開始時間: {new Date(currentSession.start_time).toLocaleString('ja-JP')}
                </Typography>

                {/* タイマー表示 */}
                <Box sx={{ mb: 4 }}>
                  <Typography
                    variant="h1"
                    component="div"
                    sx={{
                      fontFamily: 'monospace',
                      fontWeight: 'bold',
                      fontSize: { xs: '3rem', sm: '5rem' },
                      letterSpacing: 2,
                      mb: 2
                    }}
                  >
                    {formatElapsedTime(elapsedTime)}
                  </Typography>

                  <Grid container spacing={3} justifyContent="center">
                    <Grid item>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <AccessTimeIcon color="primary" sx={{ mr: 1 }} />
                        <Typography>
                          {(elapsedTime / 3600).toFixed(2)} 時間
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <MoneyIcon color="primary" sx={{ mr: 1 }} />
                        <Typography>
                          ¥{Math.round((elapsedTime / 3600) * subjects.find(s => s.id === currentSession.subject)?.hourly_rate || 0).toLocaleString()}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>

                {/* メモ欄 */}
                <Box sx={{ mb: 4 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    id="notes"
                    label="勉強メモ"
                    value={notes}
                    onChange={handleNotesChange}
                    placeholder="学習した内容をメモしておきましょう"
                  />
                  <Box sx={{ mt: 2, textAlign: 'right' }}>
                    <Button
                      variant="outlined"
                      onClick={updateSessionNotes}
                      size="small"
                    >
                      メモを保存
                    </Button>
                  </Box>
                </Box>

                {/* 停止ボタン */}
                <Box>
                  <Button
                    variant="contained"
                    color="error"
                    size="large"
                    startIcon={<StopIcon />}
                    onClick={handleStopSession}
                    disabled={stopLoading}
                    sx={{
                      px: 4,
                      py: 1.5,
                      borderRadius: 6,
                    }}
                  >
                    {stopLoading ? <CircularProgress size={24} color="inherit" /> : '勉強終了'}
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Typography variant="h5" component="h1" sx={{ mb: 4, fontWeight: 'bold' }}>
                  勉強タイマー
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}

                <Box sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel id="subject-select-label">勉強する科目</InputLabel>
                    <Select
                      labelId="subject-select-label"
                      id="subject-select"
                      value={selectedSubject}
                      label="勉強する科目"
                      onChange={handleSubjectChange}
                    >
                      {subjects.map((subject) => (
                        <MenuItem key={subject.id} value={subject.id}>
                          {subject.name} (¥{Math.round(subject.hourly_rate).toLocaleString()}/時間)
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    fullWidth
                    startIcon={<PlayIcon />}
                    onClick={handleStartSession}
                    disabled={startLoading || !selectedSubject}
                    sx={{
                      py: 1.5,
                      borderRadius: 6,
                    }}
                  >
                    {startLoading ? <CircularProgress size={24} color="inherit" /> : '勉強開始'}
                  </Button>
                </Box>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    勉強を開始すると、時間が記録され時給換算で貯金されます。
                    <br />
                    <Link component={RouterLink} to="/subjects" underline="hover">
                      別の科目を登録
                    </Link>
                  </Typography>
                </Box>
              </>
            )}
          </Paper>
        </Grid>

        {/* 科目リスト（タイマー動作中は非表示） */}
        {!currentSession && (
          <Grid item xs={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                height: '100%',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 'medium' }}>
                登録済み科目
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {subjects.map((subject) => (
                <Box
                  key={subject.id}
                  sx={{
                    mb: 2,
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: subject.id === selectedSubject ? 'rgba(74, 144, 226, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                  onClick={() => setSelectedSubject(subject.id)}
                >
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {subject.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    時給換算: ¥{Math.round(subject.hourly_rate).toLocaleString()}
                  </Typography>
                </Box>
              ))}

              <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button
                  startIcon={<AddIcon />}
                  component={RouterLink}
                  to="/subjects"
                  size="small"
                >
                  科目を管理
                </Button>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

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

export default StudyTimer;
