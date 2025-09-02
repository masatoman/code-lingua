# Code Lingua

フロントエンドエンジニア向けの英語エラーメッセージ・フレーズ集アプリケーション

## 🚨 重要な注意事項

**本番化する前に必ず [RULES.md](./RULES.md) を確認してください！**

- いきなり本番化は禁止
- 事前のテスト・検証必須
- ユーザーへの事前通知必要

## 機能

- **英語エラーメッセージ集**: コンソールエラー、API通信、フォームバリデーションなど
- **折りたたみUI**: 日本語解説はデフォルト非表示、クリックで展開
- **一括操作**: 全部を開く/閉じるボタン
- **検索機能**: フレーズ、日本語、解決方法で検索
- **カテゴリ別表示**: エラーの種類別に整理
- **ダークモード**: ライト/ダークテーマ切り替え
- **コピー機能**: 英語フレーズをワンクリックでコピー
- **お問い合わせフォーム**: Netlify Forms対応

## 技術スタック

- **フロントエンド**: React 18 + Vite
- **スタイリング**: Tailwind CSS
- **言語**: JavaScript (ES6+)
- **ビルドツール**: Vite
- **ホスティング**: Netlify

## インストール

```bash
# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

## 開発

```bash
# 開発サーバー起動 (http://localhost:5173)
npm run dev

# ビルド
npm run build

# プレビュー (http://localhost:4173)
npm run preview

# リント
npm run lint
```

## ビルドとデプロイ

### ⚠️ 本番化前の必須チェック

1. **ローカルテスト完了**
2. **機能動作確認**
3. **エラーハンドリング確認**
4. **ユーザーへの事前通知**
5. **RULES.mdの確認**

### 1. 本番ビルド
```bash
npm run build
```

### 2. ビルド結果
- `dist/` フォルダに最適化されたファイルが生成されます
- CSS: 12.08 kB (gzip: 2.90 kB)
- JavaScript: 158.52 kB (gzip: 52.68 kB)

### 3. デプロイ方法

#### Netlify (推奨)
```bash
# Netlify CLIをインストール
npm install -g netlify-cli

# デプロイ
netlify deploy --prod --dir=dist
```

#### その他の選択肢
- **Vercel**: `vercel --prod`
- **Firebase**: `firebase deploy`
- **GitHub Pages**: `npm run deploy`

## プロジェクト構造

```
src/
├── components/
│   └── PhraseList.jsx      # メインコンポーネント
├── data/
│   └── phrases.js          # フレーズデータ
├── App.jsx                 # アプリケーションルート
└── index.jsx               # エントリーポイント
```

## カスタマイズ

### フレーズの追加・編集
`src/data/phrases.js` を編集してフレーズを追加・変更できます。

### スタイルの変更
`src/index.css` または Tailwind CSS クラスでスタイルをカスタマイズできます。

## ルールとガイドライン

詳細なルールとガイドラインは [RULES.md](./RULES.md) を参照してください。

## ライセンス

MIT License

## 貢献

プルリクエストやイシューの報告を歓迎します。
