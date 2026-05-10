# Shift Palette

スマホ優先の個人用シフト管理カレンダーWebアプリです。勤務区分、色、日付ごとのスタンプ、メモをブラウザの `localStorage` に保存します。

## ブラウザで確認する方法

Node.js と npm が入っている環境で、リポジトリ直下から次のコマンドを実行してください。

```bash
npm install
npm run dev
```

開発サーバーが起動したら、ブラウザで次のURLを開きます。

```text
http://localhost:4173/
```

スマホで確認する場合は、PCとスマホを同じWi-Fiに接続し、PCのローカルIPアドレスを使って `http://<PCのIPアドレス>:4173/` を開いてください。

## その他のコマンド

```bash
npm test
```

軽量DOM上でカレンダー表示、日付操作、スタンプ2個制限、メモ・勤務区分設定の `localStorage` 保存を確認します。

```bash
npm run build
npm run preview
```

`dist/` に静的ファイルを出力し、ビルド済みファイルを `http://localhost:4173/` で確認します。

## データ保存について

入力した勤務区分、色、スタンプ、メモは利用中のブラウザの `localStorage` に保存されます。サーバーには送信されません。
