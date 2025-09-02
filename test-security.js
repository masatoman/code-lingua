#!/usr/bin/env node

/**
 * Code Lingua セキュリティ機能テストスクリプト
 * 
 * 使用方法:
 * 1. プレビューサーバーを起動: npm run preview
 * 2. このスクリプトを実行: node test-security.js
 */

import http from 'http';

const BASE_URL = 'http://localhost:4173';
const TEST_CASES = [
  {
    name: '正常な送信テスト',
    data: {
      'form-name': 'contact',
      'name': 'テスト太郎',
      'email': 'test@example.com',
      'subject': 'feature',
      'message': 'これはテストメッセージです。10文字以上の長いメッセージを送信しています。',
      'timestamp': Date.now(),
      'session-token': 'test-token-123'
    },
    expected: 'success'
  },
  {
    name: 'ボットフィールドテスト（スパム検出）',
    data: {
      'form-name': 'contact',
      'name': 'ボット',
      'email': 'bot@example.com',
      'subject': 'other',
      'message': 'スパムメッセージ',
      'bot-field': 'I am a bot', // ボットフィールドに値を設定
      'timestamp': Date.now(),
      'session-token': 'bot-token'
    },
    expected: 'bot-detected'
  },
  {
    name: '短い名前テスト（バリデーションエラー）',
    data: {
      'form-name': 'contact',
      'name': 'A', // 1文字（制限: 2文字以上）
      'email': 'test@example.com',
      'subject': 'bug',
      'message': 'これはテストメッセージです。10文字以上の長いメッセージを送信しています。',
      'timestamp': Date.now(),
      'session-token': 'test-token-456'
    },
    expected: 'validation-error'
  },
  {
    name: '無効なメールアドレステスト',
    data: {
      'form-name': 'contact',
      'name': 'テスト太郎',
      'email': 'invalid-email', // 無効なメール形式
      'subject': 'feature',
      'message': 'これはテストメッセージです。10文字以上の長いメッセージを送信しています。',
      'timestamp': Date.now(),
      'session-token': 'test-token-789'
    },
    expected: 'validation-error'
  },
  {
    name: '短いメッセージテスト',
    data: {
      'form-name': 'contact',
      'name': 'テスト太郎',
      'email': 'test@example.com',
      'subject': 'other',
      'message': '短い', // 制限: 10文字以上
      'timestamp': Date.now(),
      'session-token': 'test-token-101'
    },
    expected: 'validation-error'
  }
];

// URLSearchParamsのポリフィル（Node.js 10未満対応）
function buildQueryString(data) {
  return Object.keys(data)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join('&');
}

// HTTPリクエスト送信
function sendRequest(data, testName) {
  return new Promise((resolve, reject) => {
    const postData = buildQueryString(data);
    
    const options = {
      hostname: 'localhost',
      port: 4173,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'X-Requested-With': 'XMLHttpRequest'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
          testName: testName
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// テスト実行
async function runTests() {
  console.log('🔒 Code Lingua セキュリティ機能テスト開始\n');
  
  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    console.log(`📋 テスト ${i + 1}: ${testCase.name}`);
    
    try {
      const result = await sendRequest(testCase.data, testCase.name);
      
      console.log(`   ステータスコード: ${result.statusCode}`);
      console.log(`   期待結果: ${testCase.expected}`);
      
      // 結果の判定
      if (result.statusCode === 200) {
        if (testCase.expected === 'success') {
          console.log('   ✅ 正常な送信テスト: 成功');
        } else {
          console.log('   ⚠️  予期しない成功: バリデーションが機能していない可能性');
        }
      } else if (result.statusCode === 400) {
        if (testCase.expected === 'validation-error') {
          console.log('   ✅ バリデーションエラー: 成功');
        } else {
          console.log('   ⚠️  予期しないバリデーションエラー');
        }
      } else {
        console.log(`   ❓ 予期しないステータス: ${result.statusCode}`);
      }
      
    } catch (error) {
      console.log(`   ❌ エラー: ${error.message}`);
    }
    
    console.log(''); // 空行
  }
  
  console.log('🧪 セキュリティテスト完了');
  console.log('\n📝 手動テストも実行してください:');
  console.log('1. ブラウザで http://localhost:4173 にアクセス');
  console.log('2. お問い合わせフォームで以下をテスト:');
  console.log('   - 正常な送信');
  console.log('   - レート制限（1分間に3回以上送信）');
  console.log('   - 入力値検証（短い名前、無効なメール等）');
  console.log('   - ボットフィールド（開発者ツールで値を設定）');
}

// メイン実行
runTests().catch(console.error);
