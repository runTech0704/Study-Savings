import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  CircularProgress,
  LinearProgress,
  Link,
  Alert,
  useTheme,
} from '@mui/material';
import { 
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon, 
  AccessTime as AccessTimeIcon,
  Savings as SavingsIcon,
  Book as BookIcon,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import API from '../services/api';

// Chart.jsのコンポーネント登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const theme = useTheme();
  const [stats, setStats] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsRes, currentRes, subjectsRes, goalsRes] = await Promise.all([
          API.stats.get(),
          API.sessions.getCurrent(),
          API.subjects.getAll(),
          API.goals.getAll()
        ]);
        
        setStats(statsRes.data);
        setCurrentSession(currentRes.data);
        setSubjects(subjectsRes.data);
        setGoals(goalsRes.data);
      } catch (error) {
        console.error('データ取得エラー:', error);
        setError('データの読み込みに失敗しました。ページを再読み込みしてください。');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }
  
  // グラフのデータ
  const chartData = {
    labels: stats.subject_stats.map(subject => subject.name),
    datasets: [
      {
        label: '勉強時間（時間）',
        data: stats.subject_stats.map(subject => subject.total_hours),
        backgroundColor: theme.palette.primary.main,
        borderRadius: 6,
      },
    ],
  };
  
  // グラフのオプション
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.raw} 時間`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return value + ' 時間';
          }
        }
      }
    },
  };
  
  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 進行中の勉強セッション */}
      {currentSession.active && (
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mb: 3, 
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'primary.main',
            backgroundColor: 'primary.light',
            boxShadow: '0 4px 20px rgba(74, 144, 226, 0.1)',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={8}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimerIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  勉強中: {currentSession.session.subject_name}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                開始時間: {new Date(currentSession.session.start_time).toLocaleString('ja-JP')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Button 
                variant="contained" 
                component={RouterLink} 
                to="/timer"
                sx={{ fontWeight: 'bold' }}
              >
                タイマーを表示
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* 統計カード */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* 今週の勉強時間 */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 3,
              height: '100%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    今週の勉強時間
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
                    {stats.total_hours_week}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    時間
                  </Typography>
                </Box>
                <AccessTimeIcon sx={{ color: 'primary.main', opacity: 0.8, fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 今月の勉強時間 */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 3,
              height: '100%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    今月の勉強時間
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
                    {stats.total_hours_month}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    時間
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ color: 'primary.main', opacity: 0.8, fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 勉強科目数 */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 3,
              height: '100%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    勉強科目数
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
                    {subjects.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    科目
                  </Typography>
                </Box>
                <BookIcon sx={{ color: 'primary.main', opacity: 0.8, fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 総貯金額 */}
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            elevation={0} 
            sx={{ 
              borderRadius: 3,
              height: '100%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    総貯金額
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ mt: 1, fontWeight: 'bold' }}>
                    ¥{Math.round(stats.total_savings).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    円
                  </Typography>
                </Box>
                <SavingsIcon sx={{ color: 'primary.main', opacity: 0.8, fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Grid container spacing={3}>
        {/* 科目ごとの勉強時間グラフ */}
        <Grid item xs={12} md={8}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              height: '100%',
            }}
          >
            <Typography variant="h6" component="h2" sx={{ mb: 3, fontWeight: 'bold' }}>
              科目別勉強時間
            </Typography>
            
            {stats.subject_stats.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Typography variant="body1" color="text.secondary">
                  まだ勉強記録がありません。タイマーで勉強を記録しましょう！
                </Typography>
              </Box>
            ) : (
              <Box sx={{ height: 300 }}>
                <Bar data={chartData} options={chartOptions} />
              </Box>
            )}
          </Paper>
        </Grid>
        
        {/* 貯金目標進捗 */}
        <Grid item xs={12} md={4}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 3, 
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              height: '100%',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                貯金目標
              </Typography>
              <Button 
                size="small" 
                component={RouterLink} 
                to="/goals"
                sx={{ fontWeight: 'medium' }}
              >
                すべて表示
              </Button>
            </Box>
            
            {goals.length === 0 ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                <Typography variant="body1" color="text.secondary">
                  貯金目標が設定されていません。
                  <br />
                  <Link component={RouterLink} to="/goals" underline="hover">
                    新しい目標を設定しましょう
                  </Link>
                </Typography>
              </Box>
            ) : (
              <Box>
                {goals.slice(0, 3).map((goal) => (
                  <Box key={goal.id} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {goal.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Math.round(goal.progress_percentage)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={goal.progress_percentage} 
                      sx={{ height: 8, borderRadius: 4, mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      ¥{Math.round(goal.current_amount).toLocaleString()} / ¥{Math.round(goal.target_amount).toLocaleString()}
                    </Typography>
                  </Box>
                ))}
                
                {goals.length > 3 && (
                  <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Button 
                      size="small" 
                      component={RouterLink} 
                      to="/goals"
                    >
                      その他 {goals.length - 3} 件の目標を表示
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* 学習分析プロモーション */}
      {stats.total_hours_month > 0 && (
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mt: 4, 
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'primary.light',
            backgroundColor: 'rgba(74, 144, 226, 0.05)',
            boxShadow: '0 4px 20px rgba(74, 144, 226, 0.1)',
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm={8}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PsychologyIcon sx={{ color: 'primary.main', mr: 1, fontSize: 28 }} />
                <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
                  AIによる学習分析を試してみませんか？
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ mb: 2 }}>
                あなたの勉強データをAIが分析し、学習効率の向上につながるインサイトや提案を受け取ることができます。
                学習パターンの分析や次のステップの提案など、あなたの目標達成をサポートします。
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Button 
                variant="contained" 
                component={RouterLink} 
                to="/analysis"
                size="large"
                startIcon={<PsychologyIcon />}
                sx={{ 
                  px: 3,
                  py: 1.5,
                  borderRadius: 2,
                }}
              >
                学習分析を試す
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* 新規ユーザー向けガイダンス */}
      {(subjects.length === 0 || stats.total_hours_month === 0) && (
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            mt: 3, 
            borderRadius: 3,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" component="h2" sx={{ mb: 2, fontWeight: 'bold' }}>
            はじめましょう！
          </Typography>
          
          <Grid container spacing={2}>
            {subjects.length === 0 && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <BookIcon sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    勉強科目を登録しましょう
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  勉強する科目とその時給換算額を設定してください。
                </Typography>
                <Button 
                  variant="outlined" 
                  component={RouterLink} 
                  to="/subjects"
                  size="small"
                >
                  科目を登録する
                </Button>
              </Grid>
            )}
            
            {stats.total_hours_month === 0 && (
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TimerIcon sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    勉強を記録しましょう
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  勉強タイマーを使って学習時間を記録すると、時給換算で貯金されます。
                </Typography>
                <Button 
                  variant="outlined" 
                  component={RouterLink} 
                  to="/timer"
                  size="small"
                >
                  タイマーを開始する
                </Button>
              </Grid>
            )}
          </Grid>
        </Paper>
      )}
    </Box>
  );
}

export default Dashboard;
