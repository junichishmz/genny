# Strudel の Bank と Sound の仕組み

Strudel のコードベースを詳しく調査した結果、bank（バンク）とsound（サウンド）の仕組みについて包括的に説明します。

## 1. サウンド登録システム (Sound Registration System)

### 核となる概念
Strudelでは、すべてのサウンドが`soundMap`という[nanostore map](https://github.com/nanostores/nanostores#maps)に登録されます：

```javascript
// packages/superdough/superdough.mjs:38
export const soundMap = map();

export function registerSound(key, onTrigger, data = {}) {
  key = key.toLowerCase().replace(/\s+/g, '_');
  soundMap.setKey(key, { onTrigger, data });
}
```

### registerSound関数の仕組み
`registerSound`は以下の引数を取ります：

```typescript
function registerSound(
  name: string, // "s"に渡すサウンド名（例: "mysaw"）
  onTrigger: (
    time: number,    // サウンドが開始されるべきオーディオコンテキスト時間
    value: object,   // Hapの値
    onended: () => void // サウンド終了時に呼ばれるコールバック
  ) => {
    node: AudioNode, // エフェクトチェーンに接続するノード
    stop: (time:number) => void // サウンドを停止する関数
  },
  data: object // UIロジック用のメタデータ
);
```

## 2. Bank メカニズム

### Bank の基本概念
Bank は単純にサウンド名の**プレフィックス**として機能します：

```javascript
// packages/core/controls.mjs:302-310
/**
 * Select the sound bank to use. To be used together with `s`. 
 * The bank name (+ "_") will be prepended to the value of `s`.
 *
 * @param {string | Pattern} bank the name of the bank
 * @example
 * s("bd sd [~ bd] sd").bank('RolandTR909') // = s("RolandTR909_bd RolandTR909_sd")
 */
export const { bank } = registerControl('bank');
```

### Bank の実装詳細
Superdoughエンジンでは、bank値が自動的にサウンド名に結合されます：

```javascript
// packages/superdough/superdough.mjs:638-641
if (bank && s) {
  s = `${bank}_${s}`;
  value.s = s;
}
```

### Bank エイリアス機能
複数のエイリアスを設定可能です：

```javascript
// packages/superdough/superdough.mjs:55-86
function aliasBankMap(aliasMap) {
  const soundDictionary = soundMap.get();
  for (const key in soundDictionary) {
    const [bank, suffix] = key.split('_');
    if (!suffix) continue;
    
    const aliasValue = aliasMap[bank];
    if (aliasValue) {
      if (typeof aliasValue === 'string') {
        // 単一エイリアス
        soundDictionary[`${aliasValue}_${suffix}`.toLowerCase()] = soundDictionary[key];
      } else if (Array.isArray(aliasValue)) {
        // 複数エイリアス
        for (const alias of aliasValue) {
          soundDictionary[`${alias}_${suffix}`.toLowerCase()] = soundDictionary[key];
        }
      }
    }
  }
  soundMap.set({ ...soundDictionary });
}
```

## 3. サンプル読み込みシステム

### サンプル情報の抽出
サンプラーは`getSampleInfo`関数を使って適切なサンプルを決定します：

```javascript
// packages/superdough/sampler.mjs:28-53
export function getSampleInfo(hapValue, bank) {
  const { s, n = 0, speed = 1.0 } = hapValue;
  let midi = valueToMidi(hapValue, 36);
  let transpose = midi - 36; // C3はミドルC
  let sampleUrl;
  let index = 0;
  
  if (Array.isArray(bank)) {
    // 配列形式：インデックスベース
    index = getSoundIndex(n, bank.length);
    sampleUrl = bank[index];
  } else {
    // オブジェクト形式：音程ベース
    const midiDiff = (noteA) => noteToMidi(noteA) - midi;
    const closest = Object.keys(bank)
      .filter((k) => !k.startsWith('_'))
      .reduce((closest, key, j) => 
        (!closest || Math.abs(midiDiff(key)) < Math.abs(midiDiff(closest)) 
          ? key : closest), null);
    transpose = -midiDiff(closest);
    index = getSoundIndex(n, bank[closest].length);
    sampleUrl = bank[closest][index];
  }
  
  let playbackRate = Math.abs(speed) * Math.pow(2, transpose / 12);
  return { transpose, sampleUrl, index, midi, playbackRate };
}
```

### キャッシュシステム
効率的なローディングのためバッファとロードキャッシュを使用：

```javascript
// packages/superdough/sampler.mjs:6-7
const bufferCache = {}; // string: Promise<ArrayBuffer>
const loadCache = {}; // string: Promise<ArrayBuffer>

// packages/superdough/sampler.mjs:100-119
export const loadBuffer = (url, ac, s, n = 0) => {
  if (!loadCache[url]) {
    logger(`[sampler] load ${label}..`, 'load-sample', { url });
    loadCache[url] = fetch(url)
      .then((res) => res.arrayBuffer())
      .then(async (res) => {
        const decoded = await ac.decodeAudioData(res);
        bufferCache[url] = decoded;
        return decoded;
      });
  }
  return loadCache[url];
};
```

### GitHub・外部ソース対応
特別なパス解決機能：

```javascript
// packages/superdough/sampler.mjs:134-153
function resolveSpecialPaths(base) {
  if (base.startsWith('bubo:')) {
    const [_, repo] = base.split(':');
    base = `github:Bubobubobubobubo/dough-${repo}`;
  }
  return base;
}

function githubPath(base, subpath = '') {
  if (!base.startsWith('github:')) {
    throw new Error('expected "github:" at the start of pseudoUrl');
  }
  let [_, path] = base.split('github:');
  path = path.endsWith('/') ? path.slice(0, -1) : path;
  if (path.split('/').length === 2) {
    path += '/main'; // デフォルトブランチ
  }
  return `https://raw.githubusercontent.com/${path}/${subpath}`;
}
```

## 4. Soundfont システム

### General MIDI サポート
Soundfontシステムは`packages/soundfonts/`で実装されています：

```javascript
// packages/soundfonts/gm.mjs:1-50（抜粋）
export default {
  gm_piano: [
    '0000_JCLive_sf2_file',
    '0000_FluidR3_GM_sf2_file',
    '0000_Aspirin_sf2_file',
    '0000_Chaos_sf2_file',
    '0000_GeneralUserGS_sf2_file',
    // ...さらに多くのピアノ音色
  ],
  // その他のGM楽器...
}
```

### Soundfont の読み込み
Font loaderは動的にsoundfontを読み込みます：

```javascript
// packages/soundfonts/fontloader.mjs:20-33
async function loadFont(name) {
  if (loadCache[name]) {
    return loadCache[name];
  }
  const load = async () => {
    const url = `${soundfontUrl}/${name}.js`;
    const preset = await fetch(url).then((res) => res.text());
    let [_, data] = preset.split('={');
    return eval('{' + data);
  };
  loadCache[name] = load();
  return loadCache[name];
}
```

## 5. samples() 関数の仕組み

### 動的サンプル読み込み
`samples()`関数は様々なソースからサンプルを読み込めます：

```javascript
// packages/superdough/sampler.mjs:217-277
export const samples = async (sampleMap, baseUrl = sampleMap._base || '', options = {}) => {
  if (typeof sampleMap === 'string') {
    // カスタムプレフィックスハンドラーチェック
    const handler = getSamplesPrefixHandler(sampleMap);
    if (handler) {
      return handler(sampleMap);
    }
    
    // 特別なパス解決
    sampleMap = resolveSpecialPaths(sampleMap);
    
    if (sampleMap.startsWith('github:')) {
      sampleMap = githubPath(sampleMap, 'strudel.json');
    }
    if (sampleMap.startsWith('shabda:')) {
      let [_, path] = sampleMap.split('shabda:');
      sampleMap = `https://shabda.ndre.gr/${path}.json?strudel=1`;
    }
    // ...その他のプロトコル
    
    return fetch(sampleMap)
      .then((res) => res.json())
      .then((json) => samples(json, baseUrl || json._base || base, options));
  }
  
  // サンプルマップを処理してサウンドを登録
  processSampleMap(
    sampleMap,
    (key, bank) =>
      registerSound(key, (t, hapValue, onended) => onTriggerSample(t, hapValue, onended, bank)),
    baseUrl,
  );
};
```

## 6. オーディオ処理パイプライン

### Superdough エンジン
メインのオーディオエンジンは`superdough`関数で実装されています：

```javascript
// packages/superdough/superdough.mjs:495-833（抜粋）
export const superdough = async (value, t, hapDuration, cps = 0.5, cycle = 0.5) => {
  // 1. サウンドソースの取得
  let sourceNode;
  if (source) {
    sourceNode = source(t, value, hapDuration, cps);
  } else if (getSound(s)) {
    const { onTrigger } = getSound(s);
    const soundHandle = await onTrigger(t, value, onEnded);
    if (soundHandle) {
      sourceNode = soundHandle.node;
      activeSoundSources.set(chainID, soundHandle);
    }
  }
  
  // 2. エフェクトチェーンの構築
  const chain = [sourceNode];
  
  // ゲインステージ
  chain.push(gainNode(gain));
  
  // フィルター
  if (cutoff !== undefined) {
    chain.push(createFilter(ac, 'lowpass', cutoff, resonance, ...));
  }
  
  // エフェクト
  coarse !== undefined && chain.push(getWorklet(ac, 'coarse-processor', { coarse }));
  crush !== undefined && chain.push(getWorklet(ac, 'crush-processor', { crush }));
  
  // 3. チェーンの接続
  chain.slice(1).reduce((last, current) => last.connect(current), chain[0]);
};
```

## まとめ

Strudelのbank/soundシステムは以下の要素で構成されています：

1. **中央集権的サウンドマップ**: すべてのサウンドが`soundMap`に登録
2. **Bank プレフィックス**: シンプルな文字列結合でサウンドを組織化
3. **多様なソース対応**: GitHub、Shabda、ローカルファイルなど
4. **効率的キャッシュ**: バッファとロード結果をキャッシュ
5. **柔軟なサンプルマッピング**: 配列形式と音程ベースオブジェクト形式をサポート
6. **Soundfont統合**: General MIDIとWebAudioFontのサポート

この設計により、Strudelは非常に柔軟で拡張可能なオーディオエンジンを実現しています。

## 主要ファイルの場所

- `packages/superdough/superdough.mjs` - メインのオーディオエンジン
- `packages/superdough/sampler.mjs` - サンプル読み込みとキャッシュ
- `packages/soundfonts/` - Soundfontシステム
- `packages/core/controls.mjs` - Bankコントロールの定義
- `website/src/pages/technical-manual/sounds.mdx` - 技術的ドキュメント