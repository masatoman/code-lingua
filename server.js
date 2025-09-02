import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// セキュリティヘッダー
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"]
    }
  }
}));

// レート制限（1分間に3回まで）
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分
  max: 3, // 最大3回
  message: {
    error: '送信回数が上限に達しました。1分後に再試行してください。',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false
});

// フォーム送信にレート制限を適用
app.use('/submit', limiter);

// 静的ファイル配信
app.use(express.static(path.join(__dirname, 'dist')));

// フォームデータのパース
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// フォーム送信処理
app.post('/submit', (req, res) => {
  try {
    const { name, email, subject, message, 'bot-field': botField, timestamp, 'session-token': sessionToken } = req.body;

    // ボット検出
    if (botField) {
      console.log('🚫 ボットによる送信を検出:', { botField, ip: req.ip });
      return res.status(400).json({
        error: 'ボットによる送信が検出されました',
        type: 'bot-detected'
      });
    }

    // 入力値検証
    const validationErrors = [];

    // 名前の検証
    if (!name || name.trim().length < 2 || name.trim().length > 50) {
      validationErrors.push('お名前は2文字以上50文字以下で入力してください');
    }
    if (!/^[a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s]+$/.test(name)) {
      validationErrors.push('お名前に使用できない文字が含まれています');
    }

    // メールアドレスの検証
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      validationErrors.push('有効なメールアドレスを入力してください');
    }

    // メッセージの検証
    if (!message || message.trim().length < 10 || message.trim().length > 1000) {
      validationErrors.push('メッセージは10文字以上1000文字以下で入力してください');
    }

    // 件名の検証
    if (!subject || !['bug', 'feature', 'phrase', 'other'].includes(subject)) {
      validationErrors.push('有効な件名を選択してください');
    }

    // バリデーションエラーがある場合
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: '入力値に問題があります',
        details: validationErrors,
        type: 'validation-error'
      });
    }

    // 送信成功のログ
    console.log('✅ フォーム送信成功:', {
      name: name.trim(),
      email: email.trim(),
      subject,
      messageLength: message.trim().length,
      timestamp,
      sessionToken,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // 成功レスポンス
    res.json({
      success: true,
      message: 'お問い合わせありがとうございます！送信が完了しました。',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ フォーム処理エラー:', error);
    res.status(500).json({
      error: 'サーバー内部エラーが発生しました',
      type: 'server-error'
    });
  }
});

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPAのルーティング（すべてのGETリクエストをindex.htmlに）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 フォーム処理サーバーが起動しました: http://localhost:${PORT}`);
  console.log(`📧 フォーム送信エンドポイント: http://localhost:${PORT}/submit`);
  console.log(`🏥 ヘルスチェック: http://localhost:${PORT}/health`);
});
