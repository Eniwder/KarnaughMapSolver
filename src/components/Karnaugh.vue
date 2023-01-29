<template>
  <div class="karnaugh">
    <svg
      viewbox="0 0 300 300"
      :width="width + offset * 2"
      :height="height + offset * 2"
      @click="select($event)"
      ref="svgRoot"
    >
      <!-- 外枠 -->
      <line :x1="left" :y1="top" :x2="right" :y2="top" stroke="black" stroke-width="2"></line>
      <line :x1="left" :y1="top" :x2="left" :y2="bottom" stroke="black" stroke-width="2"></line>
      <line :x1="left" :y1="bottom" :x2="right" :y2="bottom" stroke="black" stroke-width="2"></line>
      <line :x1="right" :y1="top" :x2="right" :y2="bottom" stroke="black" stroke-width="2"></line>
      <!-- grid col -->
      <line
        v-for="col in 2 * colIn"
        :key="'col' + col"
        :x1="col * colW + left"
        :y1="top"
        :x2="col * colW + left"
        :y2="bottom"
        stroke="black"
      ></line>
      <!-- grid row -->
      <line
        v-for="row in 2 * rowIn"
        :key="'row' + row"
        :x1="left"
        :y1="row * rowH + top"
        :x2="right"
        :y2="row * rowH + top"
        stroke="black"
      ></line>
      <!-- separate input -->
      <line :x1="left" :y1="top" :x2="left + colW" :y2="top + rowH" stroke="black"></line>
      <!-- col header -->
      <text
        v-for="chl in colHeaderLabel"
        :key="chl.key"
        :x="chl.x"
        :y="chl.y"
        :font-size="fontLabelSize"
        :font-family="fontInFam"
        text-anchor="middle"
        dominant-baseline="central"
      >
        {{ chl.v }}
      </text>
      <text
        v-for="ch in colHeader"
        :key="ch.key"
        :x="ch.x"
        :y="ch.y"
        :font-size="fontInSize"
        :font-family="fontInFam"
        text-anchor="middle"
        dominant-baseline="central"
      >
        {{ ch.v }}
      </text>
      <!-- row header -->
      <text
        v-for="rhl in rowHeaderLabel"
        :key="rhl.key"
        :x="rhl.x"
        :y="rhl.y"
        :font-size="fontLabelSize"
        :font-family="fontInFam"
        text-anchor="middle"
        dominant-baseline="central"
      >
        {{ rhl.v }}
      </text>
      <text
        v-for="rh in rowHeader"
        :key="rh.key"
        :x="rh.x"
        :y="rh.y"
        :font-size="fontInSize"
        :font-family="fontInFam"
        text-anchor="middle"
        dominant-baseline="central"
      >
        {{ rh.v }}
      </text>
      <!-- table body -->
      <text
        v-for="tb in tableBody"
        :key="tb.key"
        :x="tb.x"
        :y="tb.y"
        :font-size="fontBodySize"
        :font-family="fontBodyFam"
        text-anchor="middle"
        dominant-baseline="central"
        :fill="colors[parseInt(tb.x / colW) - 1][parseInt(tb.y / rowH) - 1]"
      >
        {{ tb.v }}
      </text>
      <path v-for="p in arcs" :d="p | svgArc" :key="p.key" fill="none" stroke="black"></path>
      <path v-for="p in bezs" :d="p | svgBez" :key="p.key" fill="none" stroke="black"></path>
      <ellipse v-for="p in ellipses" :key="p.key" v-bind="p" fill="none" stroke="black"></ellipse>
      <rect v-for="p in rects" :key="p.key" v-bind="p" fill="none" stroke="black"></rect>
    </svg>
    <v-row class="fomulas" align="center">
      <div id="fomula" v-html="mathjax"></div>
      <v-btn class="ma-2" text icon @click="copy4word">
        <v-icon>mdi-file-word-outline</v-icon>
      </v-btn>
    </v-row>
  </div>
</template>

<script>
const range = (n) => [...Array(n).keys()];
const size = 360;

export default {
  props: {
    tableData: {
      inputNum: Number,
      headers: [],
      outName: String,
      outIdx: Number,
      grp: [],
      body: [],
    },
    optView: {
      AB_or_BA: Boolean,
      A_BC_or_A_BC: Boolean,
    },
  },
  data: function () {
    return {
      offset: 8,
      fontInFam: 'Meiryo',
      fontLabelSize: 16,
      fontInSize: 24,
      fontBodyFam: 'Arial',
      fontBodySize: 24,
      selects_: [],
      group_: [],
    };
  },
  filters: {
    svgArc: function (v) {
      if (!v) return '';
      return `M${v.x1} ${v.y1} A${v.rx} ${v.ry} ${v.katamuki} ${v.f1} ${v.f2} ${v.x2} ${v.y2}`;
    },
    svgBez: function (v) {
      if (!v) return '';
      return `M${v.x1} ${v.y1} Q${v.cx} ${v.cy} ${v.x2} ${v.y2}`;
    },
  },
  computed: {
    width() {
      return this.colIn * 180;
    },
    height() {
      return this.rowIn * 180;
    },
    colHeaderLabel() {
      return range(this.colIn).map((i) => ({
        v: this.tableData.headers[i],
        key: `chl${i}`,
        x: this.left + (this.colW / 4) * i + this.colW / 1.8 + (this.colW / 6) * (this.colIn % 2),
        y: this.top + this.rowH / 4,
      }));
    },
    colHeader() {
      return range(this.colIn * 2).map((i) => ({
        v: (i ^ (i >> 1)).toString(2).padStart(this.colIn, '0'),
        key: `ch${i}`,
        x: this.left + this.colW * i + this.colW + this.colW / 2,
        y: this.top + this.rowH / 2,
      }));
    },
    rowHeaderLabel() {
      return range(this.rowIn).map((i) => ({
        v: this.tableData.headers[i + this.colIn],
        key: `rhl${i}`,
        x:
          this.left +
          (this.colW / 4) * i +
          this.colW / 4 -
          (parseInt(this.rowIn / 2) * this.colW) / 16,
        y: this.top + this.rowH - this.rowH / 4,
      }));
    },
    rowHeader() {
      return range(this.rowIn * 2).map((i) => ({
        v: (i ^ (i >> 1)).toString(2).padStart(this.rowIn, '0'),
        key: `rh${i}`,
        x: this.left + this.colW / 2,
        y: this.top + this.rowH * i + this.rowH + this.rowH / 2,
      }));
    },
    tableBody() {
      const ch = this.colHeader.map((c) => c.v);
      const rh = this.rowHeader.map((r) => r.v);
      return this.colHeader
        .map((c) =>
          this.rowHeader.map((r) => ({
            key: `tb${c.v}${r.v}`,
            v: this.tableMap[c.v + r.v],
            x: c.x,
            y: r.y,
          }))
        )
        .flat();
    },
    tableMap() {
      return this.tableData.body.reduce((acc, v) => {
        const [ins, out] = [
          v.slice(0, this.tableData.inputNum),
          v[this.tableData.inputNum + this.tableData.outIdx],
        ];
        acc[ins.join('')] = out;
        return acc;
      }, {});
    },
    colW() {
      return this.width / (1 + this.colIn * 2);
    },
    rowH() {
      return this.height / (1 + this.rowIn * 2);
    },
    colIn() {
      return (
        parseInt(this.tableData.inputNum / 2) +
        (this.tableData.inputNum === 3 && this.optView.A_BC_or_A_BC ? 1 : 0)
      );
    },
    rowIn() {
      return (
        this.tableData.inputNum -
        parseInt(this.tableData.inputNum / 2) -
        (this.tableData.inputNum === 3 && this.optView.A_BC_or_A_BC ? 1 : 0)
      );
    },
    left() {
      return this.offset;
    },
    top() {
      return this.offset;
    },
    right() {
      return this.offset + this.width;
    },
    bottom() {
      return this.offset + this.height;
    },
    selects() {
      return this.selects_.map((_) => _.split(',').map((_) => parseInt(_) - 1));
    },
    group() {
      return this.group_.map((_) =>
        _.split('@')
          .sort()
          .map((_) => _.split(',').map((_) => parseInt(_) - 1))
      );
    },
    groupStr() {
      const [ch, rh] = [this.colHeader, this.rowHeader];
      return this.group.map((_) =>
        _.map((_) => {
          const [x, y] = _;
          const label = ch[x].v + rh[y].v;
          return label;
        })
      );
    },
    colors() {
      const ret = range((this.tableData.inputNum - parseInt(this.tableData.inputNum / 2)) * 2).map(
        (_) => range(parseInt(this.tableData.inputNum / 2) * 2).fill('black')
      );
      this.selects.forEach((_) => {
        const [x, y] = _;
        if (x >= 0 && y >= 0) {
          ret[x][y] = 'crimson';
        }
      });
      return ret;
    },
    arcs() {
      return this.circles.filter((_) => _.type === 'arc');
    },
    ellipses() {
      return this.circles.filter((_) => _.type === 'ellipse');
    },
    rects() {
      return this.circles.filter((_) => _.type === 'rect');
    },
    bezs() {
      return this.circles.filter((_) => _.type === 'bez');
    },
    circles() {
      const ret = [];
      const addArc = (x1, y1, x2, y2, w, h, f2) => {
        const [ajx, px] = x1 === x2 ? [this.colW / 2.4, 0] : [-4, 2];
        const [ajy, py] = y1 == y2 ? [this.rowH / 2.4, 0] : [-4, 2];
        ret.push({
          type: 'arc',
          x1: this.left + (x1 + 1) * this.colW + px,
          y1: this.top + (y1 + 1) * this.rowH + py,
          rx: (w / 2) * this.colW + ajx,
          ry: (h / 2) * this.rowH + ajy,
          katamuki: 0,
          f1: 1,
          f2: f2 === 'r' ? 1 : 0,
          x2: this.left + (x2 + 1) * this.colW - px,
          y2: this.top + (y2 + 1) * this.rowH - py,
          key: 'arc' + x1 + y1 + x2 + y2,
        });
      };
      const addBez = (x1, y1, cx, cy, x2, y2, px1, px2, py1, py2) => {
        ret.push({
          type: 'bez',
          x1: this.left + (x1 + 1) * this.colW + px1,
          y1: this.top + (y1 + 1) * this.rowH + py1,
          cx: this.left + (cx + 1) * this.colW,
          cy: this.top + (cy + 1) * this.rowH,
          x2: this.left + (x2 + 1) * this.colW + px2,
          y2: this.top + (y2 + 1) * this.rowH + py2,
          key: 'arc2' + x1 + y1 + x2 + y2,
        });
      };
      const addEllipse = (x, y, w, h) => {
        ret.push({
          type: 'ellipse',
          cx: this.left + (x + 1) * this.colW + (w / 2) * this.colW,
          cy: this.top + (y + 1) * this.rowH + (h / 2) * this.rowH,
          rx: (w * this.colW) / 2 - 2,
          ry: (h * this.rowH) / 2 - 2,
          key: 'ellipse' + x + y + w + h,
        });
      };
      const addRect = (x, y, w, h) => {
        ret.push({
          type: 'rect',
          x: this.left + (x + 1) * this.colW + 8,
          y: this.top + (y + 1) * this.rowH + 8,
          width: w * this.colW - 16,
          height: h * this.rowH - 16,
          rx: 16,
          ry: 16,
          key: 'rect' + x + y + w + h,
        });
      };

      // 汚染
      Set.prototype.min = function () {
        return Math.min(...this.values());
      };
      Set.prototype.max = function () {
        return Math.max(...this.values());
      };
      this.group.forEach((set) => {
        const xs = new Set(set.map((_) => _[0]));
        const ys = new Set(set.map((_) => _[1]));
        const [xmax, xmin, ymax, ymin] = [xs.max(), xs.min(), ys.max(), ys.min()];
        // input=4で四隅が選択されている場合
        if (xs.size === 2 && xmax - xmin > 1 && ys.size === 2 && ymax - ymin > 1) {
          addBez(xmin + 1, ymin, xmin + 1, ymin + 1, xmin, ymin + 1, -4, 0, 0, -4); // 7
          addBez(xmax, ymin, xmax, ymin + 1, xmax + 1, ymin + 1, 4, 0, 0, -4); // 9
          addBez(xmin, ymax, xmin + 1, ymax, xmin + 1, ymax + 1, 0, -4, 4, 0); // 3
          addBez(xmax + 1, ymax, xmax, ymax, xmax, ymax + 1, 0, 4, 4, 0); // 1
          // 横の端と端
        } else if (xs.size == 2 && xmax - xmin > 1) {
          addArc(xmin, ymin, xmin, ymax + 1, 1, ymax - ymin + 1, 'r');
          addArc(xmax + 1, ymin, xmax + 1, ymax + 1, 1, ymax - ymin + 1, 'l');
          // 縦の端と端
        } else if (ys.size == 2 && ymax - ymin > 1) {
          addArc(xmin, ymin, xmax + 1, ymin, xmax - xmin + 1, 1, 'l');
          addArc(xmin, ymax + 1, xmax + 1, ymax + 1, xmax - xmin + 1, 1, 'r');
          // 全部
        } else if (xs.size == this.colIn * 2 && ys.size == this.rowIn * 2) {
          addRect(xmin, ymin, xmax - xmin + 1, ymax - ymin + 1);
        } else {
          addEllipse(xmin, ymin, xmax - xmin + 1, ymax - ymin + 1);
        }
      });
      return ret;
    },
    terms() {
      const labels = this.group.map((_) =>
        _.map((_) => {
          const [x, y] = _;
          const label = this.colHeader[x].v + this.rowHeader[y].v;
          return label;
        })
      );
      return labels
        .map((l) => l.reduce((acc, v) => acc | (parseInt(l[0], 2) ^ parseInt(v, 2)), 0))
        .map((_) => _.toString(2).padStart(this.colIn + this.rowIn, '0'))
        .map((_, li) =>
          _.split('')
            .map((bit, idx) =>
              bit === '0' ? { input: this.tableData.headers[idx], sign: labels[li][0][idx] } : null
            )
            .filter((_) => _)
        );
    },
    mathjax() {
      this.$nextTick(function () {
        if (MathJax && MathJax.Hub) MathJax.Hub.Queue(['Typeset', MathJax.Hub, 'editor-output']);
      });
      const str =
        this.terms.length === 0
          ? '0'
          : this.terms.length === 1 && this.terms[0].length === 0
          ? '1'
          : this.terms
              .map((_) =>
                _.length === 0
                  ? '1'
                  : _.map((_) => (_.sign === '1' ? _.input : `\\overline{${_.input}}`)).join(
                      ` \\cdot `
                    )
              )
              .join('+');

      return `$$${this.tableData.outName} = ${str}$$`;
    },
    wordStr() {
      // クリップボードに出力する文字列を生成する部分。
      // LaTeX形式で出力
      return (
        this.tableData.outName +
        ' = ' +
        (this.terms.length === 0
          ? '0' //何も囲まれていない場合
          : this.terms.length === 1 && this.terms[0].length === 0
          ? '1' //すべて囲まれている場合
          : this.terms
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
    },
  },
  components: {},
  methods: {
    import(obj) {
      // importできないけどとりあえず残しておく
      // this.group_ = obj.grp;
    },
    export() {
      return { grp: this.group_ };
    },
    copy4word() {
      navigator.clipboard.writeText(this.wordStr);
      this.$emit('msg', '数式をLaTeX形式でコピーしました。');
    },
    select(ev) {
      const selectCell = (x, y) => {
        return [parseInt(x / this.colW), parseInt(y / this.rowH)];
      };
      const bcr = this.$refs.svgRoot.getBoundingClientRect();
      const [ox, oy] = [bcr.x, bcr.y].map((_) => parseInt(_));
      const sc = selectCell(ev.clientX - ox - this.left, ev.clientY - oy - this.top);
      if (sc[0] < 1 || this.colIn * 2 < sc[0] || sc[1] < 1 || this.rowIn * 2 < sc[1]) return;
      const scs = sc.join(',');
      const hasIdx = this.selects_.indexOf(scs);
      if (hasIdx >= 0) {
        this.selects_.splice(hasIdx, 1);
      } else {
        this.selects_.push(scs);
      }
    },
    isNeighbor(poss, d) {
      const xy = d === 'x' ? 0 : 1;
      const max = (d === 'x' ? this.colIn : this.rowIn) * 2 - 1;
      const arr = poss.map((_) => _[xy]).sort((a, b) => a - b);
      let ret = true;
      for (let i = 0; i < arr.length - 1; i++) {
        const diff1 = arr[i + 1] - arr[i];
        const diff2 = arr[i] - (arr[i + 1] % max);
        ret = ret && (diff1 === 1 || diff2 === 0);
      }
      return ret;
    },
    isAllNeighbor(arr) {
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
      ret = sameCols.reduce((acc, v) => acc && this.isNeighbor(v, 'y'), ret); // 縦が繋がってるか
      ret = sameRows.reduce((acc, v) => acc && this.isNeighbor(v, 'x'), ret); // 横も繋がってるか
      ret = ret && colLens.every((_) => arr.length === _); // 繋がりを全て集計したら選択した合計数と同じになるか(縦から見る)
      ret = ret && rowLens.every((_) => arr.length === _); // 繋がりを全て集計したら選択した合計数と同じになるか(横から見る)
      return ret;
    },
    grouping() {
      const labels = this.selects.map((_) => {
        const [x, y] = _;
        const label = this.colHeader[x].v + this.rowHeader[y].v;
        return label;
      });
      const vs = labels.map((_) => this.tableMap[_]);
      if (vs.includes('0')) {
        this.$emit('msg', '0を含んで囲むことはできません。');
        return;
      }
      const len = vs.length;
      if (len === 0) {
        this.$emit('msg', '1つ以上選択してから囲みましょう。');
        return;
      }
      if ((len & (len - 1)) !== 0) {
        this.$emit('msg', '囲む数は2のべき乗にしましょう。');
        return;
      }
      if (!this.isAllNeighbor(this.selects)) {
        this.$emit('msg', '隣接したセルを選びましょう。');
        return;
      }
      const selectsStr = this.selects_.sort().join('@');
      const hasIdx = this.group_.indexOf(selectsStr);
      if (hasIdx >= 0) {
        this.group_.splice(hasIdx, 1);
        this.$emit('msg', '囲みを解除しました。');
      } else {
        this.group_.push(selectsStr);
        this.$emit('msg', '囲みました。');
      }
      this.deselection();
    },
    deselection() {
      this.selects_ = [];
    },
    combination(nums, k) {
      let ans = [];
      if (nums.length < k) return [];
      if (k === 1) {
        for (let i = 0; i < nums.length; i++) {
          ans[i] = [nums[i]];
        }
      } else {
        for (let i = 0; i < nums.length - k + 1; i++) {
          let row = this.combination(nums.slice(i + 1), k - 1);
          for (let j = 0; j < row.length; j++) {
            ans.push([nums[i]].concat(row[j]));
          }
        }
      }
      return ans;
    },
    autoGrouping() {
      const indices = range(this.colIn * 2)
        .map((c) => range(this.rowIn * 2).map((r) => [c, r]))
        .flat();
      const label = (xy) => this.colHeader[xy[0]].v + this.rowHeader[xy[1]].v;
      const allLabels = indices.map((_) => label(_));
      // 総当りで求める
      const maxCombN = this.colIn * 2 * this.rowIn * 2;
      const getAllCombLabels = (n) => {
        if (n === 1) return this.combination(allLabels, n);
        else return this.combination(allLabels, n).concat(getAllCombLabels(n / 2));
      };
      const allCombLabels = getAllCombLabels(maxCombN);
      // 0を含むもの、1を含まないものを除外
      const acc1 = allCombLabels.filter(
        (comb) =>
          !comb.some((_) => this.tableMap[_].includes('0')) &&
          comb.some((_) => this.tableMap[_].includes('1'))
      );
      // 隣あっているものに限定。効率は悪いがlabelを一度indexに戻す
      const _grping = (acc, v, idx) => {
        acc[v.v] = idx;
        return acc;
      };
      const ch2idx = this.colHeader.reduce(_grping, {});
      const rh2idx = this.rowHeader.reduce(_grping, {});
      const acc2 = acc1.map((_) =>
        _.map((_) => {
          const [xl, yl] = [_.slice(0, this.colIn), _.slice(this.colIn)];
          return [ch2idx[xl], rh2idx[yl]];
        })
      );
      console.log(ch2idx, rh2idx);

      const acc3 = acc2.filter((_) => this.isAllNeighbor(_));
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
        for (var a of as) if (!bs.has(a)) return false;
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
        Array.from(_).filter((_) => this.tableMap[label(_.split(','))] === '1');

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
        .filter((label) => this.tableMap[label].includes('1'))
        .map((_) => {
          const [xl, yl] = [_.slice(0, this.colIn), _.slice(this.colIn)];
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
          if (n >= arr.length) return getAns(this.combination(arr, n));
          else {
            const ans = getAns(this.combination(arr, n));
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

      // ややこしい
      if (!acc5[0]) {
        this.group_ = [];
        return;
      }
      this.group_ = acc5[0].map((_) =>
        Array.from(_)
          .map((_) =>
            _.split(',')
              .map((_) => parseInt(_) + 1)
              .join(',')
          )
          .sort()
          .join('@')
      );
    },
    reset() {
      this.deselection();
      this.group_ = [];
    },
    save() {
      const svg = this.$refs.svgRoot;
      const canvas = document.createElement('canvas');
      canvas.width = svg.width.baseVal.value;
      canvas.height = svg.height.baseVal.value;
      const ctx = canvas.getContext('2d');
      let image = new Image();

      image.onload = () => {
        ctx.drawImage(image, 0, 0, image.width, image.height);
        let link = document.createElement('a');
        link.href = canvas.toDataURL(); // 描画した画像のURIを返す data:image/png;base64
        link.download = `${this.tableData.outName}.png`;
        link.click();
      };
      image.onerror = (error) => {
        console.log(error);
      };
      const svgData = new XMLSerializer().serializeToString(svg);
      image.src =
        'data:image/svg+xml;charset=utf-8;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    },
  },
  mounted() {
    console.log('mounted' + this.tableData.outName);
    this.group_ = this.tableData.grp || [];
  },
  watch: {
    group_() {
      this.$emit('grouped', [this.tableData.outIdx, this.group_]);
    },
  },
};
</script>

<style scoped>
.karnaugh {
  /* border: 1px black solid; */
}
svg {
  user-select: none;
}
.fomulas {
  justify-content: center;
  margin-left: -3px;
  margin-bottom: -4px;
  margin-right: 4px;
}
#fomula {
  overflow-x: scroll;
  font-size: 12px;
  flex-basis: 70%;
  padding-left: 8px;
}
.fomulas button {
  flex-basis: 25%;
}
</style>

        