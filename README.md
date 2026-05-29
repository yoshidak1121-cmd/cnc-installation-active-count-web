# CNC Installation Active Count Web

複数拠点にまたがる CNC 工作機械の設置データと保守稼働件数を管理する Next.js 14 Web アプリケーションです。

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **ORM**: Prisma with SQLite
- **認証**: Cookie-based session (bcryptjs)

## セットアップ

### 1. 依存関係をインストール

```bash
npm install
```

### 2. 環境設定

`.env.example` を `.env` にコピーします。

```bash
cp .env.example .env
```

デフォルト値ではローカルの SQLite ファイルを使用します。

```env
DATABASE_URL="file:./dev.db"
```

### 3. データベーススキーマを作成

```bash
npx prisma db push
```

### 4. 初期データを投入

```bash
npx prisma db seed
```

これにより、以下が作成されます。
- 3 ユーザー（下記参照）
- 6 件の設置拠点レコード（JP001, US001, DE001）
- 2022〜2024 年の保守稼働レコード
- 差し戻しレコード向けのサンプル課題

### 5. 開発サーバーを起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) を開きます。

## デフォルトユーザー

| ユーザー名 | パスワード | ロール | 拠点 |
|---|---|---|---|
| `site_staff_jp` | `staff123` | site_staff | JP001 |
| `hq_user` | `hq123` | hq_staff | — |
| `admin_user` | `admin123` | admin | — |

## 機能

### 設置データ (`/installation`)
- 設置拠点レコードの表示、追加、編集、削除
- 拠点コード、国、granularity での絞り込み
- CSV の import / export
- Granularity の種類: Total、MTB（machine builder 別）、NCSeries、Area

### 保守稼働 (`/active-maintenance`)
- 設置拠点ごとに年単位で稼働件数データを入力
- `inactive_count`、`active_rate`、前年との差分を自動計算
- ステータスワークフロー: Draft → Submitted → Approved/Returned → Locked
- 前年レコードの一括コピー

### 入力チェック (`/input-check`)
- すべてのレコードを検証し、エラー・警告・情報を表示
- チェック内容: 必須項目未入力、active count > installed count、active rate < 5%、理由なしで前年比 20% 以上の変動

### HQ レビュー (`/hq-review`) — hq_staff, admin
- 提出済みレコードをレビュー
- Approve または Return（課題記録付き）
- 承認済みレコードを Lock（admin のみ）

### 集計レポート (`/report`) — hq_staff, admin
- 承認済みかつ locked の primary record を対象に、国別・年別で集計
- 詳細レコード表示
- CSV export

## 権限一覧

| 機能 | site_staff | hq_staff | admin |
|---|---|---|---|
| 自拠点データの閲覧 | ✓ | ✓ | ✓ |
| 全拠点データの閲覧 | — | ✓ | ✓ |
| レコードの提出 | ✓ | — | — |
| 承認 / 差し戻し | — | ✓ | ✓ |
| レコードの Lock | — | — | ✓ |
| レポートの閲覧 | — | ✓ | ✓ |

## API ルート

| メソッド | パス | 説明 |
|---|---|---|
| POST | `/api/auth/login` | ログイン |
| POST | `/api/auth/logout` | ログアウト |
| GET | `/api/auth/me` | 現在のユーザー |
| GET/POST | `/api/installation` | 設置データの一覧取得 / 作成 |
| PUT/DELETE | `/api/installation/[id]` | 設置データの更新 / 削除 |
| GET/POST | `/api/active-maintenance` | 保守稼働レコードの一覧取得 / 作成 |
| PUT/DELETE | `/api/active-maintenance/[id]` | 更新 / 削除 |
| POST | `/api/active-maintenance/[id]/submit` | 提出 |
| POST | `/api/active-maintenance/[id]/approve` | 承認 |
| POST | `/api/active-maintenance/[id]/return` | 課題付きで差し戻し |
| POST | `/api/active-maintenance/[id]/lock` | Lock |
| GET | `/api/check` | 入力検証チェックを実行 |
| GET | `/api/report` | 集計レポートデータ |
| GET | `/api/report/export` | CSV export（type: installation\|maintenance\|report） |
| GET/POST | `/api/issues` | 課題の一覧取得 / 作成 |
| PUT | `/api/issues/[id]` | 課題を更新 |

## ビルド

```bash
npm run build
```
