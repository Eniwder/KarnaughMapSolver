<template>
  <hot-table
    :settings="hotSettings"
    licenseKey="non-commercial-and-evaluation"
    ref="hotTable"
    :data="_tableData.body"
  >
    <hot-column
      v-for="(header, idx) in _tableData.headers"
      :key="header"
      :title="header"
      :read-only="idx < _tableData.meta.inputNum"
    >
    </hot-column>
  </hot-table>
</template>

<script>
import { HotTable, HotColumn } from '@handsontable/vue';
const range = (n) => [...Array(n).keys()];

export default {
  props: {
    tableData: {
      meta: {
        inputNum: Number,
        outputNum: Number,
      },
      headers: [],
      body: [],
    },
  },
  computed: {
    _tableData() {
      return this.tableData;
    },
  },
  data: function () {
    const totalCol =
      this.tableData.meta.inputNum + this.tableData.meta.outputNum;
    return {
      hotSettings: {
        data: Object,
        colHeaders: Array,
        height: '100%',
        rowHeights: 24,
        cell: [
          ...range(totalCol).map((n) => ({
            row: 0,
            col: n,
            readOnly: false,
            className: 'htCenter',
          })),
          ...range(Math.pow(2, this.tableData.meta.inputNum) * totalCol).map(
            (n) => ({
              row: parseInt(n / totalCol) + 1,
              col: n % totalCol,
              className: 'htCenter',
            })
          ),
        ],
        // header: [{ row: 0, col: 1, readOnly: true }],
        customBorders: [
          {
            range: {
              from: {
                row: 0,
                col: 0,
              },
              to: {
                row: 0,
                col: totalCol,
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
                col: this.tableData.meta.inputNum - 1,
              },
              to: {
                row: Math.pow(2, this.tableData.meta.inputNum),
                col: this.tableData.meta.inputNum - 1,
              },
            },
            right: {
              width: 3,
              color: 'lightgray',
            },
          },
          {
            row: 0,
            col: this.tableData.meta.inputNum,
            left: {
              width: 3,
              color: 'lightgray',
            },
          },
        ],
      },
    };
  },
  components: {
    HotTable,
    HotColumn,
  },
  methods: {},
  mounted() {
    const th = this.$refs.hotTable.$el.querySelectorAll('th');
    this.hotSettings.data = this._tableData.body;
    process.nextTick(() => {
      th[
        this.tableData.meta.inputNum * 2 + this.tableData.meta.outputNum
      ].style.borderLeft = '2px solid lightgray';
    });
  },
  watch: {
    _tableData() {
      this.hotSettings.data = this._tableData.body;
      this.hotSettings.colHeaders = this._tableData.headers;
      console.log(this.hotSettings.colHeaders);
      this.$refs.hotTable.hotInstance.updateSettings(this.hotSettings);
    },
  },
};
</script>

<style>
.handsontable tr:nth-of-type(even) td {
  background-color: rgb(243, 243, 255) !important;
}
</style>

<style src="../../node_modules/handsontable/dist/handsontable.full.css">
</style>

        