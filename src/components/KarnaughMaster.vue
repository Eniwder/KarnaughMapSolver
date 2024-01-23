<template>
  <div class="karnaugh">
    <svg :width="svgWidth" :height="svgHeight" ref="svgRootRef">
      <template v-if="tableData.inputNum > 4">
        <text :x="kvi.dimColHeaderLabel.x" :y="kvi.dimColHeaderLabel.y" :font-size="kvi.fontInSize"
          :font-family="kvi.fontLabelSize" text-anchor="middle" dominant-baseline="central" fill="black">
          {{ kvi.dimColHeaderLabel.v }} </text>
        <text v-for="v in kvi.dimColHeader" :x="v.x" :y="v.y" text-anchor="middle" dominant-baseline="central"
          fill="black" :font-size="kvi.fontInSize">{{
            v.v }}</text>
      </template>
      <template v-if="tableData.inputNum > 5">
        <line :x1="kvi.padding + 8" :y1="kvi.padding + 8" :x2="offsets[0].x" :y2="offsets[0].y" stroke="black"
          stroke-width="1" />
        <text :x="kvi.dimRowHeaderLabel.x" :y="kvi.dimRowHeaderLabel.y" :font-size="kvi.fontInSize"
          :font-family="kvi.fontLabelSize" text-anchor="middle" dominant-baseline="central" fill="black">
          {{ kvi.dimRowHeaderLabel.v }}
        </text>
        <text v-for="v in kvi.dimRowHeader" :x="v.x" :y="v.y" text-anchor="middle" dominant-baseline="central"
          fill="black" :font-size="kvi.fontInSize">{{ v.v }}</text>
      </template>
      <KarnaughChild v-for="(v, idx) in subTables" :tableData="v" :offset="offsets[idx]" :idx="idx" :key="idx"
        ref="karnaughChildRef">
      </KarnaughChild>
    </svg>
    <v-row class="fomulas" :style="{ maxWidth: Math.max(600, svgWidth) + 'px' }">
      <div id="fomula" v-html="mathjax"></div>
      <v-btn class="ma-2" variant="text" icon @click="copy4word">
        <v-icon>mdi-file-word-outline</v-icon>
      </v-btn>
    </v-row>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted, watch, nextTick, ref, provide, readonly } from 'vue';
import { useI18n } from "vue-i18n";
import KarnaughChild from './KarnaughChild.vue';
import { useKarnaghViewInfo } from '../composables/useKarnaughViewInfo';
const { t } = useI18n({ useScope: "global" });
import { useComputedReactive } from '../composables/useComputedReactive';
const { computedReactive } = useComputedReactive();

const emit = defineEmits(['msg', 'grouped']);
defineExpose({ deselection, grouping, autoGrouping, reset, save });

const range = (n) => [...Array(n).keys()];

const props = defineProps({
  _tableData: {
    body: [],
    inputNum: Number,
    headers: [],
    outName: String,
    outIdx: Number,
    groups: [{
      grp: [],
      rowGrp: [],
      colGrp: [],
      allGrp: [],
    }],
  },
  optView: {
    AB_or_BA: Boolean,
    A_BC_or_A_BC: Boolean,
  }
});

const figureMargin = 16;
const svgRootRef = ref(null);
const karnaughChildRef = ref(null);
// subTablesが再計算されるたびにグループが初期化されるのを防ぐ
const groups = reactive([]);

const tableData = computedReactive(() => {
  // 入力ラベルの描画順序を変えない場合は何もしない
  if (!props.optView.AB_or_BA) return props._tableData;
  // 入力ラベルの描画順序を変える場合は中のデータ順序を入れ替える
  // 描画ロジックは変更しない
  function replaceTableData(td, idxs) {
    const replaceArrElem = (arr, idxs) =>
      arr.reduce((acc, v, idx) => {
        acc.push(arr[idxs[idx]] || v);
        return acc;
      }, []);

    const replaceArrsElem = (arrs, idxs) => arrs.map((arr) => replaceArrElem(arr, idxs));
    td.headers = replaceArrElem(td.headers, idxs);
    td.body = replaceArrsElem(td.body, idxs);
    return td;
  }
  const indices =
    props._tableData.inputNum === 2
      ? [1, 0]
      : props._tableData.inputNum === 3 && props.optView.A_BC_or_A_BC
        ? [1, 2, 0]
        : props._tableData.inputNum === 3 && !props.optView.A_BC_or_A_BC
          ? [2, 0, 1]
          : props._tableData.inputNum === 4
            ? [2, 3, 0, 1]
            : [2, 3, 0, 1];

  return replaceTableData(Object.assign({}, props._tableData), indices);
});

const subTables = computed(() => {
  // 4入力以下のテーブルに分割する
  function splitBody2In4(body, axis) {
    const bodies = [0, 1].map(v => body.filter(_ => _[axis] == v)).map(_ => _.reduce((acc, v) => {
      acc.push(v.filter((_, idx) => idx !== axis));
      return acc;
    }, []));
    if (body[0].length < 7) return bodies;
    else return bodies.flatMap(_ => splitBody2In4(_, axis));
  }
  if (props._tableData.inputNum <= 4) {
    groups[0] = groups[0] || {
      grp: tableData.groups[tableData.outIdx].grp[0],
      rowGrp: tableData.groups[tableData.outIdx].rowGrp[0],
      colGrp: tableData.groups[tableData.outIdx].colGrp[0],
      allGrp: tableData.groups[tableData.outIdx].allGrp[0]
    };
    return [{
      inputNum: tableData.inputNum,
      headers: tableData.headers,
      outName: tableData.outName,
      outIdx: tableData.outIdx,
      groups: groups[0],
      body: tableData.body
    }];
  } else {
    const headers = tableData.headers.slice(0, 4);
    const bodies = splitBody2In4(tableData.body, 4);
    bodies.forEach((_, idx) => {
      groups[idx] = groups[idx] || {
        grp: tableData.groups[tableData.outIdx]?.grp[idx] || reactive([]),
        rowGrp: tableData.groups[tableData.outIdx]?.rowGrp[idx] || reactive([]),
        colGrp: tableData.groups[tableData.outIdx]?.colGrp[idx] || reactive([]),
        allGrp: tableData.groups[tableData.outIdx]?.allGrp[idx] || reactive([])
      };
    });
    return bodies.map((body, idx) => ({
      body,
      inputNum: 4,
      headers,
      outName: tableData.outName,
      outIdx: tableData.outIdx,
      groups: groups[idx]
    }));
  }
});
// auto grouping
// ABCD/EF <-> AB/CDEF (ABCDE/F <-> A/BCDEF)
// TODO 詳細設定としてKCtrlから渡す
const drawOpt = {
  fontInFam: 'Meiryo',
  fontLabelSize: 16,
  fontInSize: 24,
  fontBodyFam: 'Arial',
  fontBodySize: 24,
  oneCell: 72,
  padding: 8, // paddingがないと外枠の太線をきれいに引けない
  strokeMap: {
    grp: {
      sw: 1,
      sc: 'black'
    },
    rowGrp: {
      sw: 2,
      sc: '#FFC107'
    },
    colGrp: {
      sw: 3,
      sc: '#2196F3'
    },
    allGrp: {
      sw: 4,
      sc: '#F44336'
    }
  }
};
const kvi = computedReactive(() => useKarnaghViewInfo(tableData, drawOpt, props.optView));
provide('karnaughViewInfo', readonly(kvi));
const baseOffset = computed(() => props._tableData.inputNum <= 4 ? 0 : drawOpt.oneCell);
const svgWidth = computed(() =>
  baseOffset.value + (props._tableData.inputNum <= 4 ? kvi.width :
    (kvi.width * 2 + figureMargin + kvi.outerInNameWidth))
);
const svgHeight = computed(() =>
  props._tableData.inputNum <= 4 ? kvi.height :
    props._tableData.inputNum <= 5 ? kvi.height + baseOffset.value :
      baseOffset.value + (kvi.height * 2 + figureMargin)
);
const offsets = computed(() => [
  { x: baseOffset.value + kvi.outerInNameWidth, y: baseOffset.value },
  { x: baseOffset.value + kvi.outerInNameWidth + kvi.width + figureMargin, y: baseOffset.value },
  { x: baseOffset.value + kvi.outerInNameWidth, y: baseOffset.value + kvi.height + figureMargin },
  { x: baseOffset.value + kvi.outerInNameWidth + kvi.width + figureMargin, y: baseOffset.value + kvi.height + figureMargin }
]);

// 汚染
Set.prototype.min = function () {
  return Math.min(...this.values());
};
Set.prototype.max = function () {
  return Math.max(...this.values());
};

const terms = computed(() => {
  const labels = groups.flatMap((k, idx) => {
    const getIdx = (grp) => grp.map(_ => _.split('@').map(xy => xy.split(',').map(_ => parseInt(_) - 1)));
    const dimLabelE = idx => tableData.headers[4] ? (idx % 2 === 0 ? '0' : '1') : '';
    const dimLabelF = idx => tableData.headers[5] ? (idx < 2 ? '0' : '1') : '';

    const ret = [];
    ret.push(...getIdx(k.grp).map(_ => _.map(([x, y]) => kvi.colHeader[x].v + kvi.rowHeader[y].v + dimLabelE(idx) + dimLabelF(idx))));
    // 縦横に跨るグループは2個目(idx=1)と3個目(idx=2)の図を見れば網羅できる
    if (idx === 1) {
      ret.push(...getIdx(k.rowGrp).map(_ => _.flatMap(([x, y]) => ['0', '1'].map(_ => kvi.colHeader[x].v + kvi.rowHeader[y].v + _ + dimLabelF(idx)))));
      ret.push(...getIdx(k.colGrp).map(_ => _.flatMap(([x, y]) => ['0', '1'].map(_ => kvi.colHeader[x].v + kvi.rowHeader[y].v + dimLabelE(idx) + _))));
    } else if (idx === 2) {
      ret.push(...getIdx(k.rowGrp).map(_ => _.flatMap(([x, y]) => ['0', '1'].map(_ => kvi.colHeader[x].v + kvi.rowHeader[y].v + _ + dimLabelF(idx)))));
      ret.push(...getIdx(k.colGrp).map(_ => _.flatMap(([x, y]) => ['0', '1'].map(_ => kvi.colHeader[x].v + kvi.rowHeader[y].v + dimLabelE(idx) + _))));
      ret.push(...getIdx(k.allGrp).map(_ => _.flatMap(([x, y]) => ['0', '1'].flatMap(e => ['0', '1'].flatMap(f => kvi.colHeader[x].v + kvi.rowHeader[y].v + e + f)))));
    }
    return ret;
  });

  return labels
    .map((l) => l.reduce((acc, v) => acc | (parseInt(l[0], 2) ^ parseInt(v, 2)), 0))
    .map((_) => _.toString(2).padStart(tableData.inputNum, '0'))
    .map((_, li) =>
      _.split('')
        .map((bit, idx) =>
          bit === '0' ? { input: tableData.headers[idx], sign: labels[li][0][idx] } : null
        )
        .filter((_) => _)
    )
    .map((_) =>
      _.sort(
        (a, b) =>
          tableData.headers.indexOf(a.input) - tableData.headers.indexOf(b.input)
      )
    );
});
const mathjax = computed(() => {
  nextTick(function () {
    if (MathJax && MathJax.Hub) MathJax.Hub.Queue(['Typeset', MathJax.Hub, 'editor-output']);
  });
  const str =
    terms.value.length === 0
      ? '0'
      : terms.value.length === 1 && terms.value[0].length === 0
        ? '1'
        : terms.value
          .map((_) =>
            _.length === 0
              ? '1'
              : _.map((_) => (_.sign === '1' ? _.input : `\\overline{${_.input}}`)).join(
                ` \\cdot `
              )
          )
          .join('+');

  return `$$${tableData.outName} = ${str}$$`;
});
const wordStr = computed(() => {
  // クリップボードに出力する文字列を生成する部分。
  // LaTeX形式で出力
  return (
    tableData.outName +
    ' = ' +
    (terms.value.length === 0
      ? '0' //何も囲まれていない場合
      : terms.value.length === 1 && terms.value[0].length === 0
        ? '1' //すべて囲まれている場合
        : terms.value
          .map((term) => {
            let buff = '';
            let psign = '';
            if (term.length === 0) buff = '1';
            for (let i = 0; i < term.length; i++) {
              const pad = i === 0 ? '' : ' \\cdot ';
              //  psign === '0' && term[i].sign === '0' ? '' : psign === '0' ? '\\cdot' : '';
              const sign = term[i].sign === '1' ? '' : '\\bar ';
              psign = term[i].sign;
              buff += pad + sign + term[i].input;
            }
            return buff;
          })
          .join(' + '))
  );
});

function exportData() {
  return { grp: group_ };
}

function copy4word() {
  navigator.clipboard.writeText(wordStr.value);
  emit('msg', t('数式をLaTeX形式でコピーしました。'));
}

function isNeighbor(poss, d) {
  const xy = d === 'x' ? 0 : 1;
  const max = (d === 'x' ? kvi.colIn : kvi.rowIn) * 2 - 1;
  const arr = poss.map((_) => _[xy]).sort((a, b) => a - b);
  let ret = true;
  for (let i = 0; i < arr.length - 1; i++) {
    const diff1 = arr[i + 1] - arr[i];
    const diff2 = arr[i] - (arr[i + 1] % max);
    ret = ret && (diff1 === 1 || diff2 === 0);
  }
  return ret;
}
function isAllNeighbor(arr) {
  // [empty, [1], [2]].flat() -> [[1], [2]]
  const idxGroup = (idx) => (acc, v) => {
    acc[v[idx]] = acc[v[idx]] || [];
    acc[v[idx]].push(v);
    return acc;
  };
  // xかyで繋がりのあるセルの数を行か列ごとに計算して集計する
  const idxLens = (idx) => (brr) =>
    brr.map((brr) =>
      brr
        .map((ssc) => arr.filter((_) => _[idx] === ssc[idx]).length)
        .reduce((acc, v) => acc + parseInt(v), 0)
    );
  const sameCols = [arr.reduce(idxGroup(0), [])].flat();
  const sameRows = [arr.reduce(idxGroup(1), [])].flat();
  const colLens = idxLens(1)(sameCols).flat();
  const rowLens = idxLens(0)(sameRows).flat();
  let ret = true;
  ret = sameCols.reduce((acc, v) => acc && isNeighbor(v, 'y'), ret); // 縦が繋がってるか
  ret = sameRows.reduce((acc, v) => acc && isNeighbor(v, 'x'), ret); // 横も繋がってるか
  ret = ret && colLens.every((_) => arr.length === _); // 繋がりを全て集計したら選択した合計数と同じになるか(縦から見る)
  ret = ret && rowLens.every((_) => arr.length === _); // 繋がりを全て集計したら選択した合計数と同じになるか(横から見る)
  return ret;
}
function grouping() {
  // selects := [[x,y], ['0000', '0001', ...]]
  const selects = karnaughChildRef.value.map(_ => _.getSelects());
  // 各カルノー図の選択が基本的な条件を満たしているかチェック
  // 5変数以上のチェックは別で行う
  if (!selects.some(_ => _[0].length > 0)) {
    emit('msg', t('1つ以上選択してから囲みましょう。'));
    return;
  }
  for (let i = 0; i < selects.length; i++) {
    const [xy, labels, values, _selects] = selects[i];
    if (values.includes('0')) {
      emit('msg', t('0を含んで囲むことはできません。'));
      return;
    }
    if ((values.length & (values.length - 1)) !== 0) {
      emit('msg', t('囲む数は2のべき乗にしましょう。'));
      return;
    }
    if (!isAllNeighbor(xy)) {
      emit('msg', t('隣接したセルを選びましょう。'));
      return;
    }
  }

  // ここで同じペアが含まれているか比較するために文字列化
  const selectsStr = selects.map(_ => _[3].sort().join('@'));

  // 指定されたグループで囲むor囲みを解除する
  function helper(key) {
    subTables.value.forEach((v, idx) => {
      if (selects[idx][0].length === 0) return;
      const hasIdx = subTables.value[idx].groups[key].indexOf(selectsStr[idx]);
      if (hasIdx >= 0) {
        subTables.value[idx].groups[key].splice(hasIdx, 1);
        emit('msg', t('囲みを解除しました。'));
      } else {
        subTables.value[idx].groups[key].push(selectsStr[idx]);
        emit('msg', t('囲みました。'));
        emit('grouped', { oidx: tableData.outIdx, [key]: subTables.value[idx].groups, kidx: idx });
      }
    });
  }

  const strSet = new Set(selectsStr.filter(_ => _ !== ''));
  if (strSet.size !== 1) {
    emit('msg', t('各図で同じ座標のセルを選びましょう。'));
    return;
  }

  // 5変数以上でカルノー図をまたいで選択している場合の数(4変数以下の時は1)
  const kdim = selects.filter(_ => _[0].length > 0).length;
  if (kdim === 1) {
    helper('grp');
  } else if (kdim === 2) {
    const [fidx, lidx] = [selects.findIndex(_ => _[0].length > 0), selects.findLastIndex(_ => _[0].length > 0)];
    const idxSum = (fidx + lidx) % 4;
    // 0 1 カルノー図は左のIndexで配置されるので、
    // 2 3 indexを加算して%4の合計が1だと横、2の倍数だと縦、3だと斜め
    if (idxSum === 1) {
      helper('rowGrp');
    } else if ((idxSum % 2) === 0) {
      helper('colGrp');
    } else if (idxSum === 3) {
      emit('msg', t('隣り合う図を選択しましょう。'));
      return;
    }
  } else if (kdim === 3) {
    emit('msg', t('囲む数は2のべき乗にしましょう。'));
    return;
  } else if (kdim === 4) {
    helper('allGrp');
  }
  deselection();
}
function deselection() {
  karnaughChildRef.value.forEach(_ => _.deselection());
}
function combination(nums, k) {
  let ans = [];
  if (nums.length < k) return [];
  if (k === 1) {
    for (let i = 0; i < nums.length; i++) {
      ans[i] = [nums[i]];
    }
  } else {
    for (let i = 0; i < nums.length - k + 1; i++) {
      let row = combination(nums.slice(i + 1), k - 1);
      for (let j = 0; j < row.length; j++) {
        ans.push([nums[i]].concat(row[j]));
      }
    }
  }
  return ans;
}
function autoGrouping() {
  const indices = range(kvi.colIn * 2)
    .map((c) => range(kvi.rowIn * 2).map((r) => [c, r]))
    .flat();
  const label = xy => kvi.colHeader[xy[0]].v + kvi.rowHeader[xy[1]].v;
  const allLabels = indices.map((_) => label(_));
  // 総当りで求める
  const maxCombN = kvi.colIn * 2 * kvi.rowIn * 2;
  const getAllCombLabels = (n) => {
    if (n === 1) return combination(allLabels, n);
    else return combination(allLabels, n).concat(getAllCombLabels(n / 2));
  };
  const allCombLabels = getAllCombLabels(maxCombN);
  // 0を含むもの、1を含まないものを除外
  const acc1 = allCombLabels.filter(
    (comb) =>
      !comb.some((_) => tableMap[_].includes('0')) &&
      comb.some((_) => tableMap[_].includes('1'))
  );
  // 隣あっているものに限定。効率は悪いがlabelを一度indexに戻す
  const _grping = (acc, v, idx) => {
    acc[v.v] = idx;
    return acc;
  };
  const ch2idx = kvi.colHeader.reduce(_grping, {});
  const rh2idx = kvi.rowHeader.reduce(_grping, {});
  const acc2 = acc1.map((_) =>
    _.map((_) => {
      const [xl, yl] = [_.slice(0, kvi.colIn), _.slice(kvi.colIn)];
      return [ch2idx[xl], rh2idx[yl]];
    })
  );

  const acc3 = acc2.filter((_) => isAllNeighbor(_));
  // 同じ要素を含んでいるものを削除。ドントケアは無視する。
  const isSuperset = (set, subset) => {
    for (let elem of subset) {
      if (!set.has(elem)) return false;
    }
    return set.size !== subset.size; // 「⊆」ではなく「⊂」とする
  };
  function union(setA, setB) {
    let _union = new Set(setA);
    for (let elem of setB) {
      _union.add(elem);
    }
    return _union;
  }
  function eqSet(as, bs) {
    if (as.size !== bs.size) return false;
    for (let a of as) if (!bs.has(a)) return false;
    return true;
  }
  function difference(setA, setB) {
    let _difference = new Set(setA);
    for (let elem of setB) {
      _difference.delete(elem);
    }
    return _difference;
  }
  const toOneList = (_) =>
    Array.from(_).filter((_) => tableMap[label(_.split(','))] === '1');

  const acc4 = acc3
    .map((_) => new Set(_.map((_) => _.join(','))))
    .filter((v, _, arr) => !arr.some((_) => isSuperset(_, v)))
    .filter(
      (v, _, arr) =>
        !arr.some(
          (_) => _.size >= v.size && isSuperset(new Set(toOneList(_)), new Set(toOneList(v)))
        )
    );

  // ある程度絞った「囲み」の組み合わせを全て求めて、
  // 出力が1となるセルを全て含む組み合わせを総当りで求める
  // 優先順位：項の少なさ > 各項のシンプルさ
  const oneList = allLabels
    .filter((label) => tableMap[label].includes('1'))
    .map((_) => {
      const [xl, yl] = [_.slice(0, kvi.colIn), _.slice(kvi.colIn)];
      return [ch2idx[xl], rh2idx[yl]].join(',');
    });
  const oneSet = new Set(oneList);
  const getGrpComb = (arr) => {
    const getAns = (comb) =>
      comb.filter((sets) => {
        const set = sets.reduce((acc, v) => union(acc, v));
        return eqSet(set, oneSet) || isSuperset(set, oneSet);
      });
    const helper = (n) => {
      if (n >= arr.length) return getAns(combination(arr, n));
      else {
        const ans = getAns(combination(arr, n));
        if (ans.length > 0) return ans;
        else return helper(n + 1);
      }
    };
    return helper(1);
  };

  const acc5 = getGrpComb(acc4);
  acc5.sort((a, b) => {
    const first = a.length - b.length;
    const second =
      a.reduce((acc, v) => acc + v.size, 0) - b.reduce((acc, v) => acc + v.size, 0);
    return first !== 0 ? first : second;
  });

  group_.splice(0, group_.length);
  acc5[0].map((_) =>
    Array.from(_)
      .map((_) =>
        _.split(',')
          .map((_) => parseInt(_) + 1)
          .join(',')
      )
      .sort()
      .join('@')
  ).forEach(_ => group_.push(_));
}

function reset() {
  deselection();
  subTables.value.forEach(table => {
    Object.values(table.groups).forEach(_ => {
      _.splice(0, _.length);
    });
  });
}

function save(ext) {
  const svg = svgRootRef.value;
  const svgString = new XMLSerializer().serializeToString(svg);
  if (ext === 'png') {
    const canvas = document.createElement('canvas');
    canvas.width = svg.width.baseVal.value;
    canvas.height = svg.height.baseVal.value;
    const ctx = canvas.getContext('2d');

    let image = new Image();
    image.onload = () => {
      ctx.drawImage(image, 0, 0, image.width, image.height);
      let link = document.createElement('a');
      link.href = canvas.toDataURL(); // 描画した画像のURIを返す data:image/png;base64
      link.download = `${tableData.outName}.png`;
      link.click();
    };
    image.onerror = (error) => {
      console.error(error);
    };
    image.src = 'data:image/svg+xml;charset=utf-8;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  } else if (ext === 'svg') {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const a = document.createElement('a');
    a.href = svgUrl;
    a.download = `${tableData.outName}.svg`;
    a.click();
    URL.revokeObjectURL(svgUrl);
  } else {
    console.warn(`非対応の拡張子：${ext}`);
  }
}

// groupがgroup_を参照しているのでgroupを直接変形したい時におかしくなるの回避
function regroup(oldGrp, newGrp) {
  oldGrp.splice(0, oldGrp.length);
  newGrp.forEach(_ => oldGrp.push(_));
}

function regroup4changeView(abbaNew, abbaOld, a_bcNew, a_bcOld) {
  // 3変数以外の場合はxとyを入れ替えるだけ
  if (tableData.inputNum !== 3) {
    if (abbaNew !== abbaOld) {
      subTables.value.forEach(table => {
        Object.values(table.groups).forEach(grp => {
          regroup(grp,
            grp.map(_ => _.split('@').map(xy => xy.split(','))
              .map(([x, y]) => `${parseInt(y)},${parseInt(x)}`).join('@'))
          );
        });
      });
    }
    return;
  }

  // 3変数の場合オプションの適用順序によって変形順序が異なるので、
  // 一度全ての変形を標準に戻してからオプションに従って変形をする。
  // 綺麗な法則が分からなかったので愚直に変換をする。数式から戻すのが理想か…？

  // まずは戻す
  const grp = groups[0].grp;
  regroup(grp, grp.map(_ => _.split('@').map(_ => _.split(',').map(_ => parseInt(_) - 1))
    .map(([x, y]) => {
      let [dx, dy] = [x, y];
      if (abbaOld) {
        const _dx = x < 2 ? 3 * y : 1 + y;
        const _dy = x % 3 === 0 ? 0 : 1;
        [x, y] = a_bcOld ? [_dx, _dy] : [y, x];
      }
      if (abbaOld || a_bcOld) {
        dx = x < 2 ? 0 : 1;
        dy = x % 3 === 0 ? y : 3 - y;
      }
      return `${dx + 1},${dy + 1}`;
    })
    .join('@')
  ));
  // 次に変形
  regroup(grp, grp.map(_ => _.split('@').map(_ => _.split(',').map(_ => parseInt(_) - 1))
    .map(([x, y]) => {
      let [dx, dy] = [parseInt(x), parseInt(y)];
      if (abbaNew || a_bcNew) {
        dx = y % 3 === 0 ? 0 : 1;
        dy = x === 0 ? (y < 2 ? 0 : 1) : y < 2 ? 3 : 2;
      }
      if (a_bcNew) {
        const [_dx, _dy] = [dy, dx];
        dx = _dx % 3 === 0 ? _dy : 3 - _dy;
        dy = _dx < 2 ? 0 : 1;
        [dx, dy] = abbaNew ? [dx, dy] : [_dx, _dy];
      }
      return `${dx + 1},${dy + 1}`;
    })
    .join('@')
  ));
}

watch(() => props.optView.AB_or_BA, (newV, oldV) => {
  regroup4changeView(newV, oldV, props.optView.A_BC_or_A_BC, props.optView.A_BC_or_A_BC);
});
watch(() => props.optView.A_BC_or_A_BC, (newV, oldV) => {
  regroup4changeView(props.optView.AB_or_BA, props.optView.AB_or_BA, newV, oldV);
});
</script>

<style scoped>
.fomulas {
  justify-content: center;
  margin-left: -3px;
  margin-bottom: -4px;
  margin-right: 4px;
}

#fomula {
  overflow-x: scroll;
  scrollbar-width: thin;
  font-size: 12px;
  flex-basis: calc(95% - 48px);
  padding-left: 8px;
  height: 60px;
}

#fomula::-webkit-scrollbar {
  height: 8px;
}

#fomula::-webkit-scrollbar-track {
  border-radius: 10px;
  box-shadow: inset 0 0 5px rgba(0, 0, 0, .1);
}

#fomula::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 50, .5);
  border-radius: 10px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .3);
}

.fomulas button {
  width: 48px
}
</style>
        