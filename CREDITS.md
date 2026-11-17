# クレジット・出典

`index.html` に同梱しているデータとライブラリの出典です。

## データ

- **表層地盤の増幅率**: 防災科学技術研究所 J-SHIS 地震ハザードステーション（https://www.j-shis.bosai.go.jp/）のデータを加工（約0.025度×0.017度の格子に間引き・画像化）して作成。元データそのものではありません。利用条件は [J-SHIS 利用規約](https://www.j-shis.bosai.go.jp/en/agreement) に従います。
- **震央地名の境界**: [0Quake/JMA_Region](https://github.com/0Quake/JMA_Region)（CC0、出典：気象庁）を0.02度の格子に加工。
- **津波観測点**: 気象庁防災情報XMLのコード表と、[ingen084/jma-code-dictionary](https://github.com/ingen084/jma-code-dictionary) の `derived/TsunamiStationLocation.csv`（MIT License）。一部の観測点は [0Quake/Zero-Quake](https://github.com/0Quake/Zero-Quake) の `TsunamiStations.json` で補完。
- **日本の周りの陸（地図と津波の計算）**: [Natural Earth](https://www.naturalearthdata.com/)（パブリックドメイン）の 1:50m 国境データ（[world-atlas](https://github.com/topojson/world-atlas) 経由）から日本を除き、簡略化して作成。
- **緊急警報放送の信号**: 昭和60年郵政省告示第405号（緊急警報信号の構成）に基づいてその場で合成（録音ではありません）。
- 都道府県境界・市町村の位置・地震観測点の位置・海岸線: 出典確認中。

## ライブラリ

- **three.js r128**（OrbitControls を含む、必要な部品だけを束ねて同梱）: MIT License, Copyright © 2010-2021 three.js authors. https://github.com/mrdoob/three.js
