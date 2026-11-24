'use strict';
/* 地震・津波シミュレーターの計算の自動テスト（Version 270）。依存なし：Node 18 以上で
     node --test test/
   を実行する。index.html の処理のコードから関数を名前で取り出して確かめる（test/load.js）。
   確かめる内容は docs/simulation.md の「2. 震度の推定」「5.1 津波警報・注意報」に沿う。 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./load.js');

const cfg = { nl: true };
const T = load(
  ['clamp01', 'TYPE_D', 'pgvBase', 'iFromLogV', 'NL', 'siteLog', 'siteLogLP', 'FAR_X0', 'farAdj', 'intensity', 'vP', 'vS', 'faultLen', 'MW_CR', 'mwOf', 'tsuCatJ', 'okadaUz'],
  { cfg }
);
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, (msg || '') + ` 実際 ${a}、期待 ${b}（±${eps}）`);
const log10 = Math.log10;

/* ---------- 2.1 揺れの大きさ ---------- */
test('pgvBase：司・翠川（1999）の式どおり（docs 2.1-1）', () => {
  const d = { crustal: 0, inter: -0.02, intra: 0.12 };
  for (const type of Object.keys(d))
    for (const M of [4, 5.5, 7, 8])
      for (const depth of [5, 30, 80])
        for (const X of [5, 20, 100, 400]) {
          const want = 0.58 * M + 0.0038 * depth + d[type] - 1.29 - log10(X + 0.0028 * 10 ** (0.5 * M)) - 0.002 * X;
          near(T.pgvBase({ M, depth, type }, X), want, 1e-12, `${type} M${M} D${depth} X${X}`);
        }
});
test('pgvBase：M8.3を超える分は0.15倍（巨大地震の頭打ち）', () => {
  const p = M => T.pgvBase({ M, depth: 20, type: 'inter' }, 100);
  /* M9.0 は Mw＝8.3＋0.15×0.7＝8.405 として計算される */
  const Mw = 8.405;
  near(p(9.0), 0.58 * Mw + 0.0038 * 20 - 0.02 - 1.29 - log10(100 + 0.0028 * 10 ** (0.5 * Mw)) - 0.2, 1e-12);
  assert.ok(p(9.0) > p(8.3), 'M8.3より大きければ少しは強い');
});
test('pgvBase：距離は3km未満を3km、深さは300kmで頭打ち', () => {
  const q = { M: 6, depth: 10, type: 'crustal' };
  assert.equal(T.pgvBase(q, 0), T.pgvBase(q, 3));
  assert.equal(T.pgvBase({ M: 6, depth: 500, type: 'intra' }, 50), T.pgvBase({ M: 6, depth: 300, type: 'intra' }, 50));
});
test('pgvBase：遠いほど小さく、Mが大きいほど大きい', () => {
  for (const type of ['crustal', 'inter', 'intra']) {
    let prev = Infinity;
    for (let X = 3; X <= 1000; X += 7) {
      const v = T.pgvBase({ M: 7, depth: 20, type }, X);
      assert.ok(v < prev, `${type} X=${X}`);
      prev = v;
    }
    prev = -Infinity;
    for (let M = 2; M <= 10; M += 0.1) {
      const v = T.pgvBase({ M, depth: 20, type }, 50);
      assert.ok(v > prev, `${type} M=${M}`);
      prev = v;
    }
  }
});

test('iFromLogV：藤本・翠川（2005）の2次式と翠川ほか（1999）の式（docs 2.1-5）', () => {
  for (const lv of [-1, 0, 0.3, 0.59]) near(T.iFromLogV(lv), 2.68 + 1.72 * lv, 1e-12, `lv=${lv}`);
  for (const lv of [1, 1.5, 2, 2.5]) near(T.iFromLogV(lv), 2.002 + 2.603 * lv - 0.213 * lv * lv, 1e-12, `lv=${lv}`);
});
test('iFromLogV：つなぎ目（0.6・1.0）で途切れず、増え続ける', () => {
  for (const x of [0.6, 1]) near(T.iFromLogV(x - 1e-9), T.iFromLogV(x + 1e-9), 1e-6, `lv=${x}`);
  let prev = -Infinity;
  for (let lv = -2; lv <= 3; lv += 0.01) {
    const I = T.iFromLogV(lv);
    assert.ok(I > prev, `lv=${lv.toFixed(2)}`);
    prev = I;
  }
});

/* ---------- 地盤の非線形性 ---------- */
test('siteLog：増幅1以下・弱い揺れ・設定オフでは増幅をそのまま使う（docs 2.1-3）', () => {
  for (const arv of [0.5, 1]) assert.equal(T.siteLog(arv, 2.5), log10(arv));
  /* 軟らかい地盤（増幅の常用対数≧0.45）は基盤の最大速度 10^1.10≒12.6cm/s まで、硬い地盤ほど 10^1.45≒28cm/s に近づく */
  assert.equal(T.siteLog(10 ** 0.6, 1.1), 0.6);
  assert.ok(T.siteLog(10 ** 0.6, 1.15) < 0.6);
  const s = log10(1.05) / T.NL.sa,
    th = T.NL.b0 - T.NL.b1 * s;
  assert.ok(th > 1.42 && th < 1.45);
  assert.equal(T.siteLog(1.05, th), log10(1.05));
  assert.ok(T.siteLog(1.05, th + 0.05) < log10(1.05));
  cfg.nl = false;
  try {
    assert.equal(T.siteLog(3, 2.5), log10(3));
  } finally {
    cfg.nl = true;
  }
});
test('siteLog：強い揺れほど増幅を割り引き、下限は増幅の35〜70%', () => {
  for (const arv of [1.3, 2, 3, 5]) {
    const la = log10(arv),
      s = Math.min(1, la / T.NL.sa),
      floor = la * (T.NL.f0 - T.NL.f1 * s);
    let prev = Infinity;
    for (let lb = 0; lb <= 4; lb += 0.05) {
      const v = T.siteLog(arv, lb);
      assert.ok(v <= prev + 1e-12, `arv=${arv} lb=${lb}`);
      assert.ok(v >= floor - 1e-12 && v <= la + 1e-12, `arv=${arv} lb=${lb}`);
      prev = v;
    }
    near(T.siteLog(arv, 4), floor, 1e-12, `arv=${arv} の下限`);
    assert.ok(floor / la >= 0.35 - 1e-12 && floor / la <= 0.7 + 1e-12);
  }
});
test('siteLogLP：長周期の割り引きは短い周期の30%だけ', () => {
  for (const [arv, lb] of [[2, 2], [3, 2.5], [1.5, 1.8]]) {
    const la = log10(arv),
      sl = T.siteLog(arv, lb);
    near(T.siteLogLP(arv, lb), la - 0.3 * (la - sl), 1e-12);
  }
});

/* ---------- 遠い地点の補正 ---------- */
test('farAdj：水平65kmまで0、65〜280kmで1kmあたり0.00165、それより遠くは −0.355（docs 2.1-1）', () => {
  const p = { M: 7.5, depth: 0 };
  assert.equal(T.farAdj(p, 30), 0);
  assert.equal(T.farAdj(p, 65), 0);
  near(T.farAdj(p, 165), -0.00165 * 100, 1e-12);
  near(T.farAdj(p, 280), -0.355, 0.001);
  assert.equal(T.farAdj(p, 280), T.farAdj(p, 900));
});
test('farAdj：距離 X は断層までの3次元の距離。深さを除いた水平距離で数える', () => {
  /* 深さ30km、X＝√(100²＋30²) → 水平100km */
  near(T.farAdj({ M: 7.5, depth: 30 }, Math.hypot(100, 30)), -0.00165 * 35, 1e-12);
});
test('farAdj：M6.5から効き始めM7.0以上で全部、深さ100kmから弱めて200kmで0、緊急地震速報の予測（noFar）では0', () => {
  const X = 300;
  near(T.farAdj({ M: 6.5, depth: 0 }, X), 0, 0);
  near(T.farAdj({ M: 6.75, depth: 0 }, X), T.farAdj({ M: 8, depth: 0 }, X) / 2, 1e-12);
  assert.equal(T.farAdj({ M: 7, depth: 0 }, X), T.farAdj({ M: 9, depth: 0 }, X));
  const at = d => T.farAdj({ M: 8, depth: d }, Math.hypot(400, d));
  assert.equal(at(100), at(0));
  near(at(150), at(0) / 2, 1e-12);
  near(at(200), 0, 0);
  near(at(250), 0, 0);
  near(T.farAdj({ M: 8, depth: 0, noFar: true }, X), 0, 0);
});

/* ---------- 計測震度 ---------- */
test('intensity：pgvBase＋farAdj＋0.117＋siteLog を iFromLogV に通した値', () => {
  for (const [p, X, arv, adj] of [
    [{ M: 7.3, depth: 10, type: 'crustal' }, 10, 1.5, 0],
    [{ M: 9, depth: 24, type: 'inter' }, 250, 2.2, 0.1],
    [{ M: 5, depth: 60, type: 'intra' }, 40, 0.8, -0.05]
  ]) {
    const lb = T.pgvBase(p, X) + adj + T.farAdj(p, X);
    near(T.intensity(p, X, arv, adj), T.iFromLogV(lb + 0.117 + T.siteLog(arv, lb)), 1e-12);
  }
  /* 増幅を渡さないときは1 */
  const p = { M: 6, depth: 10, type: 'crustal' };
  assert.equal(T.intensity(p, 20), T.intensity(p, 20, 1));
});
test('intensity：おおよその大きさ（目安の範囲）', () => {
  /* 断層のすぐ近くの M7.3 内陸地震（増幅1.5）は震度6弱〜7、M4 の 100km 先は震度1程度以下、M9 の断層から 300km（増幅1.5）は震度3〜4
     （ばらつき・アスペリティ・観測点の癖などを足す前の値） */
  const I1 = T.intensity({ M: 7.3, depth: 10, type: 'crustal' }, 5, 1.5);
  assert.ok(I1 >= 5.5 && I1 < 7.5, 'M7.3 近く：' + I1);
  const I2 = T.intensity({ M: 4, depth: 10, type: 'crustal' }, 100, 1.5);
  assert.ok(I2 < 1.5, 'M4 100km：' + I2);
  const I3 = T.intensity({ M: 9, depth: 24, type: 'inter' }, 300, 1.5);
  assert.ok(I3 >= 2.5 && I3 < 4.5, 'M9 300km：' + I3);
});

/* ---------- 地震波の速さ・断層の長さ・Mw ---------- */
test('vP・vS：P波は約6.3〜8.8km/s、S波はP波の1/1.73（docs 2.3）', () => {
  for (const R of [0, 50, 300, 2000])
    for (const d of [0, 100, 600]) {
      const v = T.vP(R, d);
      assert.ok(v >= 6.3 - 1e-12 && v <= 8.8 + 1e-12, `R=${R} d=${d}`);
      near(T.vS(R, d), v / 1.73, 1e-12);
    }
  assert.ok(T.vP(500, 10) > T.vP(10, 10) && T.vP(100, 400) > T.vP(100, 10));
});
test('faultLen：10^(0.5M−1.85)km、上限1500km（M10.15超。入力の上限 M10.0 では約1413km）', () => {
  near(T.faultLen(7), 10 ** 1.65, 1e-9);
  near(T.faultLen(9), 10 ** 2.65, 1e-9);
  near(T.faultLen(10), 10 ** 3.15, 1e-9);
  assert.equal(T.faultLen(10.5), 1500);
});
test('mwOf：内陸の地震はM5.5以上で0.36小さく、M3.5未満は差を半分に', () => {
  assert.equal(T.mwOf(7.3, 'crustal', 0), 6.9);
  assert.equal(T.mwOf(7.3, 'inter', 0), 7.3);
  assert.equal(T.mwOf(4.5, 'crustal', 0), 4.3);
  assert.equal(T.mwOf(2.5, 'inter', 0), 3);
  assert.equal(T.mwOf(7, 'inter', 0.2), 7.2);
});

/* ---------- 5.1 津波 ---------- */
test('tsuCatJ：気象庁の基準（0.2m以上1m以下＝注意報、1m超3m以下＝警報、3m超＝大津波警報）', () => {
  const c = T.tsuCatJ;
  assert.equal(c(0.01), 0);
  assert.equal(c(0.05), 1); /* 若干の海面変動 */
  assert.equal(c(0.19), 1);
  assert.equal(c(0.2), 2);
  assert.equal(c(1), 2);
  assert.equal(c(1.01), 3);
  assert.equal(c(3), 3);
  assert.equal(c(3.01), 4);
  assert.equal(c(20), 4);
});
test('okadaUz：Okada（1985）の表2 case 2 の検算値と合う', () => {
  /* x=2, y=3, d=4, δ=70°, L=3, W=2、すべり1。横ずれ uz＝−2.747×10⁻³、縦ずれ uz＝−3.564×10⁻² */
  const dl = (70 * Math.PI) / 180,
    sd = Math.sin(dl),
    cd = Math.cos(dl);
  near(T.okadaUz(2, 3, 3, 2, sd, cd, 4, 1, 0), -2.747e-3, 5e-7, '横ずれ');
  near(T.okadaUz(2, 3, 3, 2, sd, cd, 4, 0, 1), -3.564e-2, 5e-6, '縦ずれ');
});
test('okadaUz：すべりに比例し、横ずれと縦ずれは足し合わせ', () => {
  const dl = (30 * Math.PI) / 180,
    sd = Math.sin(dl),
    cd = Math.cos(dl);
  for (const [x, y] of [[5, 10], [-20, 3], [40, -15]]) {
    const a = T.okadaUz(x, y, 60, 30, sd, cd, 25, 1, 0),
      b = T.okadaUz(x, y, 60, 30, sd, cd, 25, 0, 1);
    near(T.okadaUz(x, y, 60, 30, sd, cd, 25, 2, 3), 2 * a + 3 * b, 1e-12);
    near(T.okadaUz(x, y, 60, 30, sd, cd, 25, 0, 0), 0, 0);
  }
});
test('okadaUz：低角の逆断層は上盤側の海底が隆起し、背後が沈降する。走向方向に左右対称', () => {
  /* 長さ100km・幅50km・傾斜15°、下端の深さ20km（上端は約7km）、縦ずれ5m。断層は下端（y=0）から +y 側へ浅くなる */
  const dl = (15 * Math.PI) / 180,
    sd = Math.sin(dl),
    cd = Math.cos(dl),
    uz = (x, y) => T.okadaUz(x, y, 100, 50, sd, cd, 20, 0, 5);
  let mx = -Infinity,
    my = 0;
  for (let y = -60; y <= 100; y += 1) {
    const v = uz(50, y);
    if (v > mx) [mx, my] = [v, y];
  }
  assert.ok(mx > 0.5 && mx < 5, '最大の隆起 ' + mx);
  assert.ok(my > 0 && my < 50 * cd, '隆起の場所は断層の真上 y=' + my);
  assert.ok(uz(50, -30) < 0, '断層の下端より奥（陸側）は沈降');
  for (const dx of [10, 30, 70]) near(uz(50 - dx, 20), uz(50 + dx, 20), 1e-9, `x=50±${dx}`);
});
test('okadaUz：傾斜0°の特別な扱いが、わずかに傾けたときとつながる', () => {
  const a = T.okadaUz(10, 5, 40, 20, 0, 1, 10, 1, 1),
    e = (1e-4 * Math.PI) / 180,
    b = T.okadaUz(10, 5, 40, 20, Math.sin(e), Math.cos(e), 10, 1, 1);
  near(a, b, 1e-4);
});
