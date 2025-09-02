FROM node:18-alpine

WORKDIR /app

# 依存関係のインストール
COPY package*.json ./
RUN npm ci --only=production

# アプリケーションコードのコピー
COPY . .

# ビルド
RUN npm run build

# フォーム処理サーバーの起動
EXPOSE 3000

CMD ["npm", "run", "serve:docker"]
