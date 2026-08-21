# UI デザイン

## 1. 採用プロトタイプ

**Pattern A（ウォーム・カード型）** を採用する。

| 項目 | 内容 |
| --- | --- |
| 参照 | [`prototypes/pattern-a/index.html`](../prototypes/pattern-a/index.html) |
| コンセプト | 料理ブログ風の温かみある配色。カードグリッドで一覧、詳細は 1 カラムの読みやすいレイアウト |
| 一覧レイアウト | テーブルではなく **カードグリッド**（`minmax(260px, 1fr)` の auto-fill） |
| フィルタ | 画面上部の **フィルタバー**（白背景カード内に配置） |
| 配色 | ウォーム系（背景 `#faf7f2`、プライマリ `#e65100`、テキスト `#3e2723`） |

Pattern B（サイドバー・テーブル型）は参考用として [`prototypes/pattern-b/`](../prototypes/pattern-b/) に残すが、実装対象外とする。

## 2. UI ライブラリ

| ライブラリ | 役割 | 選定理由 |
| --- | --- | --- |
| [Tailwind CSS](https://tailwindcss.com/) | スタイリング | Pattern A のデザイントークンを `@theme` / CSS 変数として再現しやすい。プロトタイプの CSS をそのまま移植できる |
| [shadcn/ui](https://ui.shadcn.com/) | UI コンポーネント | Radix UI ベースでアクセシビリティが高い。削除確認 Dialog、Toast（API エラー）、Form 部品を標準化できる |
| [Lucide React](https://lucide.dev/) | アイコン | **UI の視覚表現は Lucide アイコンを基本とする。** テキスト記号（★/☆、絵文字等）での代替は行わない |

フレームワーク本体は [TanStack Start](https://tanstack.com/start)（README 参照）。ルーティングは TanStack Router、データ取得は loader + fetch API とする。

### 2.1 アイコン方針

**原則: テキストや Unicode 記号で UI を表現しない。** 装飾・メタ情報・操作は Lucide React の SVG アイコンで統一する。

| 用途 | Lucide アイコン（例） | 備考 |
| --- | --- | --- |
| アプリロゴ | `ChefHat` | ヘッダー。絵文字（🍳）は使わない |
| 新規作成 | `Plus` | ボタンラベルと併用可 |
| 検索 | `Search` | フィルタバー |
| フィルタ | `SlidersHorizontal` | フィルタセクション見出し等 |
| カテゴリ | `Utensils` または `Tag` | バッジ横 |
| 調理時間 | `Clock` | 「30分」の前後 |
| 人数 | `Users` | 「2人分」の前後 |
| 難易度 | `Star`（filled）/ 未達は outline | **★☆☆☆☆ テキスト禁止。** `DifficultyRating` コンポーネントで 1〜5 を描画 |
| 材料 | `Carrot` または `ShoppingBasket` | セクション見出し |
| 手順 | `ListOrdered` | セクション見出し。各行は番号付き円 + 本文 |
| 戻る | `ArrowLeft` | 一覧へ / キャンセル |
| 編集 | `Pencil` | |
| 削除 | `Trash2` | 危険色ボタン |
| 保存 | `Save` | |
| 行追加 | `Plus` | 材料・手順 |
| 空状態 | `UtensilsCrossed` または `ChefHat` | 大きめ（`size={48}` 等） |

- アイコンサイズ: 本文横 `16〜20px`、セクション見出し `20〜24px`、空状態 `40〜48px`
- 色: `--primary` / `--muted` / `--star`（難易度）を Tailwind クラスで適用
- アクセシビリティ: 意味のあるアイコンには `aria-label` または visually hidden テキストを付与（アイコンのみボタンは必須）

### 2.2 shadcn/ui で使うコンポーネント（想定）

| コンポーネント | 用途 |
| --- | --- |
| Button | 新規作成、保存、キャンセル、行追加 |
| Input / Textarea | フォーム入力 |
| Select | カテゴリ、難易度、並び順 |
| Dialog | 削除確認、未保存変更の確認 |
| Toast (Sonner) | API 失敗・成功のフィードバック |
| Label | フォームラベル、必須表示 |

## 3. デザイントークン

Pattern A から移植する CSS 変数。Tailwind の `@theme` または `:root` に定義する。

| トークン | 値 | 用途 |
| --- | --- | --- |
| `--bg` | `#faf7f2` | ページ背景 |
| `--surface` | `#ffffff` | カード・セクション背景 |
| `--primary` | `#e65100` | ボタン、アクセント、見出し |
| `--primary-light` | `#fff3e0` | バッジ背景、人数コントロール背景 |
| `--text` | `#3e2723` | 本文 |
| `--muted` | `#8d6e63` | 補助テキスト、ラベル |
| `--border` | `#efebe9` | ボーダー |
| `--star` | `#ff8f00` | 難易度の星 |
| `--radius` | `12px` | カード角丸 |
| `--shadow` | `0 2px 8px rgba(62,39,35,0.06)` | カード影 |

フォント: `"Hiragino Sans"`, `"Hiragino Kaku Gothic ProN"`, `system-ui`, `sans-serif`

## 4. 画面別 UI 指針

機能要件・画面遷移（[04-screen-transitions.md](04-screen-transitions.md)）の要素を Pattern A の見た目で実装する。

### SC-01 レシピ一覧

- ヘッダー: `ChefHat` + アプリ名 + 新規作成ボタン（`Plus`、pill 型、primary）
- フィルタ: 白カード内に 2 行グリッド。検索欄に `Search`、並び・条件に `SlidersHorizontal` 等
- 一覧: カードグリッド。各カードにタイトル、カテゴリバッジ（`Tag`）、`Clock` + 調理時間、`DifficultyRating`、`Users` + 人数
- カードクリックで詳細へ。一覧からの削除はカード上または詳細経由（確認 Dialog）
- 件数表示: `該当 N 件`
- 0 件: 空状態メッセージ

### SC-02 レシピ詳細

- `ArrowLeft` 戻る、`Pencil` 編集、`Trash2` 削除ボタン
- タイトル、メタ情報（バッジ + `Clock` + `DifficultyRating` + `Users`）
- 説明: 左ボーダー付きブロック
- 材料: `Carrot` 見出し、`Users` 人数コントロール + リスト（名前 / 按分量）
- 手順: `ListOrdered` 見出し、各行は番号付き円 + 本文
- 人数按分は **クライアント側のみ**（[機能要件 §4.6](01-functional-requirements.md#46-人数の按分表示)）

### SC-03 / SC-04 新規作成・編集

- セクション分割（基本情報 / 材料 / 手順）
- 材料行: 名前・分量・単位（datalist + 自由入力）+ 行保存・削除（編集時）
- 手順行: テキストエリア + 行保存・削除（編集時）
- 新規: 一括保存。編集: 親は「親情報を保存」、子行は行単位 PATCH
- キャンセル: 新規 → 一覧、編集 → 詳細。未保存時は Dialog で確認

## 5. レスポンシブ

Pattern A はモバイルファースト想定。

| ブレークポイント | 挙動 |
| --- | --- |
| 〜640px | 1 カラム。フィルタは縦積み。カード 1 列 |
| 641px〜 | カード 2 列以上。フィルタ 2 行グリッド |
| max-width | アプリコンテナ `960px` 中央寄せ（プロトタイプ準拠） |

## 6. アクセシビリティ（最低限）

[非機能要件 §8](02-non-functional-requirements.md#8-アクセシビリティux最低限) に加え:

- shadcn/ui（Radix）の Dialog はフォーカストラップ・Esc 閉じを利用
- フォームエラーは `aria-describedby` でフィールドと関連付け
- `DifficultyRating` は `Star` アイコン列 + `aria-label="難易度 3/5"` 等
- アイコンのみボタン（編集・削除等）は `aria-label` 必須

## 7. 関連資料

| 資料 | 内容 |
| --- | --- |
| [画面遷移](04-screen-transitions.md) | パス、search params、ワイヤーフレーム |
| [機能要件](01-functional-requirements.md) | バリデーション、按分、行単位更新 |
| [プロトタイプ A](../prototypes/pattern-a/index.html) | インタラクション・配色の参照実装 |
