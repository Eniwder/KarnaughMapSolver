<template>
  <hot-table :settings="hotSettings" ref="_hotTable" :key="totalCol"> </hot-table>
</template>

<script setup>
import { HotTable } from '@handsontable/vue3';
import { registerAllModules } from 'handsontable/registry';
import { computed, nextTick, reactive, ref, watch } from 'vue';
registerAllModules();
defineExpose({ translateHeader });
const emit = defineEmits(["changeCell"]);
const _hotTable = ref(null);

const range = (n) => [...Array(n).keys()];
const props = defineProps({
  tableData: {
    meta: {
      inputNum: Number,
      outputNum: Number,
    },
    headers: [],
    body: [],
  },
});
const tableData = reactive(props.tableData);
const totalCol = computed(() => tableData.meta.inputNum + tableData.meta.outputNum);
const cellSetting = computed(() =>
  [...range(totalCol.value).map((n) => ({
    row: 0,
    col: n,
    readOnly: false,
    className: 'htCenter',
  })),
  ...range(Math.pow(2, tableData.meta.inputNum) * totalCol.value).map((n) => ({
    row: parseInt(n / totalCol.value) + 1,
    col: n % totalCol.value,
    className: 'htCenter',
    readOnly: (n % totalCol.value) < tableData.meta.inputNum,
  })),
  ]
);
const customBordersSetting = computed(() =>
  [
    {
      range: {
        from: {
          row: 0,
          col: 0,
        },
        to: {
          row: 0,
          col: totalCol.value,
        },
      },
      bottom: {
        width: 3,
        color: 'lightgray',
      },
    },
    {
      range: {
        from: {
          row: 0,
          col: tableData.meta.inputNum - 1,
        },
        to: {
          row: Math.pow(2, tableData.meta.inputNum),
          col: tableData.meta.inputNum - 1,
        },
      },
      right: {
        width: 3,
        color: 'lightgray',
      },
    },
    {
      row: 0,
      col: tableData.meta.inputNum,
      left: {
        width: 3,
        color: 'lightgray',
      },
    },
  ]
);

const hotSettings = reactive({
  licenseKey: 'non-commercial-and-evaluation',
  data: tableData.body,
  colHeaders: tableData.headers,
  autoWrapRow: true,
  autoWrapCol: true,
  ariaTags: true,
  className: '',
  afterRenderer() {
    setThColor();
  },
  afterChange(e) {
    // 同時に編集したセルが配列で全て渡される
    // [[y, x, old, new],...]
    if (!e || typeof e !== 'object') return;
    e.forEach((cell) => {
      emit('changeCell', cell);
    });
  },
  height: '100%',
  rowHeights: 24,
  cell: cellSetting,
  customBorders: customBordersSetting
});


function changeCell(e) {
  console.log(e);
}

function setThColor() {
  function helper() {
    const th = _hotTable.value.$el.querySelectorAll(`th[aria-colindex="${tableData.meta.inputNum + 1}"]`);
    if (!th[1]) return false;
    th[1].style.borderLeft = '2px solid lightgray'; // 何故か2個あって後者にスタイルが必要
    return true;
  }
  nextTick(() => helper());
}

function translateHeader() {
  // TODO なぜかセルの設定が初期化されるので保留
  // hotSettings.data = tableData.body;
  // hotSettings.colHeaders = [
  //   ...range(tableData.meta.inputNum).map((n) => `${t('入力')}${n + 1}`),
  //   ...range(tableData.meta.outputNum).map((n) => `${t('出力')}${n + 1}`),
  // ]
  // _hotTable.value.hotInstance.loadData(hotSettings);
}

watch(() => props.tableData, (val) => {
  Object.assign(tableData, val);
  hotSettings.data = tableData.body;
  hotSettings.colHeaders = tableData.headers;
});

</script>

<style>
.handsontable tr:nth-of-type(even) td {
  background-color: rgb(243, 243, 255) !important;
}

/* 変数を増やした場合にうまく幅を調節してくれなかったので強引に修正
witdh的にはカルノー図に重なる場合があるが悪影響は無さそう。 */
.handsontable.htColumnHeaders {
  width: 150% !important;
}
</style>

<!-- レガシーじゃないスタイルを使うと見た目がおかしくなるので、とりあえずこれを継続 -->
<style src="../../node_modules/handsontable/dist/handsontable.full.css"></style>
