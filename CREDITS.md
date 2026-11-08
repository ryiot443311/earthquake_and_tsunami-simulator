# クレジット・出典

`index.html` に同梱しているデータとライブラリの出典です。

## データ

- **表層地盤の増幅率**: 防災科学技術研究所 J-SHIS 地震ハザードステーション（https://www.j-shis.bosai.go.jp/）のデータを加工（約0.025度×0.017度の格子に間引き・画像化）して作成。元データそのものではありません。利用条件は [J-SHIS 利用規約](https://www.j-shis.bosai.go.jp/en/agreement) に従います。
- **震央地名の境界**: [0Quake/JMA_Region](https://github.com/0Quake/JMA_Region)（CC0、出典：気象庁）を0.02度の格子に加工。
- **津波観測点**: 気象庁防災情報XMLのコード表と、[ingen084/jma-code-dictionary](https://github.com/ingen084/jma-code-dictionary) の `derived/TsunamiStationLocation.csv`（MIT License）。一部の観測点は [0Quake/Zero-Quake](https://github.com/0Quake/Zero-Quake) の `TsunamiStations.json` で補完。
- 都道府県境界・市町村の位置・地震観測点の位置・海岸線: 出典確認中。

## ライブラリ

- **three.js r128**（OrbitControls を含む、必要な部品だけを束ねて同梱）: MIT License, Copyright © 2010-2021 three.js authors. https://github.com/mrdoob/three.js

## 音声

- 緊急地震速報・津波警報の音: 出典確認中。
