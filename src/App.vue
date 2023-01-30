<template>
  <v-app id="app">
    <template>
      <v-card class="grey lighten-5" flat>
        <v-toolbar color="indigo" dark flat>
          <v-menu offset-y class="optMenu">
            <template v-slot:activator="{ on, attrs }">
              <v-btn icon dark v-bind="attrs" v-on="on">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>
            <v-list>
              <v-list-item v-for="(item, index) in optMenu" :key="index">
                <v-icon>{{ item.icon }}</v-icon>
                <v-list-item-title @click="item.handlar">{{ item.title }} </v-list-item-title>
              </v-list-item>
              <v-list-item>
                <label class="import">
                  <v-list-item-title>
                    <v-icon>mdi-upload</v-icon>
                    <input
                      type="file"
                      accept="application/json"
                      @change="loadFile($event)"
                    />ファイルを読み込み
                  </v-list-item-title>
                </label>
              </v-list-item>
            </v-list>
          </v-menu>

          <v-toolbar-title>
            <v-text-field v-model="projectName"></v-text-field>
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <a
            href="https://github.com/Eniwder/KarnaughMaker"
            target="_blank"
            style="color: transparent"
          >
            <v-btn icon>
              <v-icon>mdi-github</v-icon>
            </v-btn>
          </a>
          <!-- タブ一覧 -->
          <template v-slot:extension>
            <v-tabs v-model="tab" align-with-title center-active>
              <v-tabs-slider color="yellow"></v-tabs-slider>
              <v-tab v-for="tab in tabs" :key="tab.id" :data-id="tab.id">
                {{ tab.name }}
                <close-button :tab="tab" @confirmDelete="tabDelete(tab.id)"></close-button>
              </v-tab>
              <v-btn icon @click="addTab">
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </v-tabs>
          </template>
        </v-toolbar>

        <!-- タブの中身 -->
        <v-tabs-items v-model="tab">
          <v-tab-item v-for="tab in tabs" :key="tab.id">
            <v-container class="grey lighten-5 margin-initial">
              <v-row>
                <v-col class="d-flex" cols="2">
                  <v-text-field v-model="tab.name" class="shrink">
                    <!-- <v-icon slot="prepend">mdi-pencil</v-icon> -->
                  </v-text-field>
                </v-col>

                <v-col class="d-flex inout" cols="2">
                  <v-select
                    :items="[2, 3, 4]"
                    :value="tab.sheets.meta.inputNum"
                    label="Inputs"
                    outlined
                    @change="changeInOut(tab.id, 'input', $event)"
                  ></v-select>
                </v-col>
                <v-col class="d-flex inout" cols="2">
                  <v-select
                    :items="[1, 2, 3]"
                    :value="tab.sheets.meta.outputNum"
                    label="Outputs"
                    outlined
                    @change="changeInOut(tab.id, 'output', $event)"
                  ></v-select>
                </v-col>
                <!-- <v-col class="d-flex inout" cols="2">
                  <v-tooltip bottom open-delay="300" :disabled="tab.sheets.meta.inputNum === 3">
                    <template v-slot:activator="{ on, attrs }">
                      <span v-bind="attrs" v-on="on" style="width: 100%">
                        <v-btn
                          outlined
                          block
                          color="indigo"
                          :disabled="tab.sheets.meta.inputNum !== 3"
                          :class="optView.A_BC_or_A_BC ? 'onBtn' : ''"
                          @click="optView.A_BC_or_A_BC = !optView.A_BC_or_A_BC"
                          >A/BC ↔ AB/C</v-btn
                        >
                      </span>
                    </template>
                    <span>入力が3変数の場合に押せるようになります。</span>
                  </v-tooltip>
                </v-col> -->
              </v-row>

              <v-row>
                <v-col cols="12" sm="6" class="sheets" :style="{ height: tab.sheetHeight }">
                  <transition name="toggle-fade">
                    <MySheets
                      :tableData="tab.sheets"
                      v-if="tab.show"
                      @changeCell="changeCell(tab.id, $event)"
                    ></MySheets>
                  </transition>
                </v-col>
                <v-col cols="12" sm="6">
                  <KarnaughCtrl
                    :tables="karnaughTable"
                    ref="karnaughTable"
                    @grouped="grouped($event)"
                  ></KarnaughCtrl>
                </v-col>
              </v-row>
            </v-container>
          </v-tab-item>
        </v-tabs-items>
      </v-card>
    </template>
  </v-app>
</template>

<script>
import MySheets from './components/MySheets.vue';
import KarnaughCtrl from './components/KarnaughCtrl.vue';
import CloseButton from './components/CloseButtonWithDialog.vue';
import { saveAs } from 'file-saver';

const range = (n) => [...Array(n).keys()];
Array.prototype.zip = function (...args) {
  const new_array = [];
  for (let i = 0; i < this.length; i++) {
    new_array.push([this[i], ...args.map((arg) => arg[i])]);
  }
  return new_array;
};
// TODO 消したタブを戻せる
// TODO github flow (electron build)
// TODO 図サイズ変更
// TODO 図のデザイン変更機能

export default {
  name: 'App',
  components: { MySheets, CloseButton, KarnaughCtrl },
  data() {
    return {
      projectName: 'Project1',
      tab: 0,
      tabs: [],
      optMenu: [
        { title: 'ファイルへ保存', icon: 'mdi-download', handlar: this.export },
        // { title: 'ファイルを読み込み', handlar: this.import },
      ],
    };
  },
  computed: {
    activeTab() {
      return this.tabs[this.tab];
    },
    karnaughTable() {
      if (!this.activeTab) return {};
      return range(this.activeTab.sheets.meta.outputNum).map((idx) => {
        const ret = {};
        const tab = this.activeTab;
        ret.inputNum = tab.sheets.meta.inputNum;
        ret.headers = tab.sheets.body[0].slice(0, ret.inputNum);
        ret.outName = tab.sheets.body[0][ret.inputNum + idx];
        ret.body = tab.sheets.body.filter((_, idx) => idx !== 0);
        ret.key = ret.outName + idx;
        ret.grp = tab.sheets.grp[idx];
        ret.outIdx = idx; // bodyを分けほうがよかったかもしれない
        return ret;
      });
    },
  },
  methods: {
    export() {
      const save = {};
      this.tabs.forEach((tab) => {
        tab.modified = false;
      });
      save.tabs = this.tabs;
      save.config = {
        projectName: this.projectName,
      };
      const blob = new Blob([JSON.stringify(save)], {
        type: 'application/json',
      });
      saveAs(blob, `${this.projectName}.json`);
    },
    // 名前をimportにするとHTMLの方で呼び出す時にバグる
    async loadFile(event) {
      const getFileData = async (file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsText(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      };
      const file = (event.target.files || event.dataTransfer.files)[0];

      try {
        const json = await getFileData(file);
        const save = JSON.parse(json);
        this.projectName = save.config.projectName;
        this.tabs = [];
        process.nextTick(() => {
          this.tabs = JSON.parse(JSON.stringify(save.tabs));
          this.tabs.forEach((tab, idx) => {
            tab.show = false;
            process.nextTick(() => (tab.show = true));
            // レンダリングしていない要素がエラーとなるためイベントの伝播はしない方針にした
            // this.$refs.karnaughTable[idx].import(save.child);
          });
        });
      } catch (e) {
        alert('ファイルを読み込めませんでした');
        console.log(e);
      }
    },
    grouped(event) {
      this.activeTab.sheets.grp[event[0]] = event[1];
    },
    createTruthTable(inputNum, outputNum) {
      const ret = {
        headers: [],
        body: [],
        grp: [],
        meta: {
          inputNum,
          outputNum,
        },
      };
      ret.headers = [
        ...range(inputNum).map((n) => `入力${n + 1}`),
        ...range(outputNum).map((n) => `出力${n + 1}`),
      ];
      ret.body = [
        [
          ...range(inputNum).map((n) => String.fromCharCode(0x41 + n)), // a,b,c,...
          ...range(outputNum).map((n) => String.fromCharCode(0x58 + n)), // x,y,z
        ],
        ...range(Math.pow(2, inputNum)).map((n) =>
          n
            .toString(2)
            .padStart(inputNum, 0)
            .padEnd(inputNum + outputNum, 1)
            .split('')
        ),
      ];

      return ret;
    },
    addTab() {
      const nextId = this.tabs.reduce((acc, v) => (acc > v ? acc : v.id), -1) + 1;
      const tabId = this.tabs.length;
      let watchCount = 0;
      this.tabs.push({
        id: nextId,
        show: true,
        name: `work${nextId + 1}`,
        sheetHeight: 500 + 'px',
        sheets: this.createTruthTable(4, 1),
        modified: true,
      });

      process.nextTick(() => {
        this.tab = tabId;
      });
    },
    tabDelete(id) {
      const tabId = this.tabs.findIndex((_) => _.id === id);
      this.tabs.splice(tabId, 1);
    },
    loadTable(id, table) {
      // 更新の仕方がわからなかったので仕方なく再描画
      const tabId = this.tabs.findIndex((_) => _.id === id);
      this.tabs[tabId].sheets = table;
      // const heightMap = ['0px', '0px', '180px', '280px', '500px'];
      // this.tabs[tabId].sheetHeight = heightMap[this.tabs[tabId].sheets.meta.inputNum];
      this.tabs[tabId].show = false;
      process.nextTick(() => (this.tabs[tabId].show = true));
      this.$refs.karnaughTable[0].reset();
    },
    changeInOut(id, inout, event) {
      // 更新の仕方がわからなかったので仕方なく再描画
      const tabId = this.tabs.findIndex((_) => _.id === id);

      const oldRows = this.tabs[tabId].sheets.body.length;
      const oldCols = this.tabs[tabId].sheets.body[0].length;
      const oldBody = this.tabs[tabId].sheets.body.slice();
      const oldIn = this.tabs[tabId].sheets.meta.inputNum;
      const oldOut = this.tabs[tabId].sheets.meta.outputNum;

      if (inout === 'input') {
        this.tabs[tabId].sheets.meta.inputNum = event;
      } else {
        this.tabs[tabId].sheets.meta.outputNum = event;
      }

      this.tabs[tabId].sheets = this.createTruthTable(
        this.tabs[tabId].sheets.meta.inputNum,
        this.tabs[tabId].sheets.meta.outputNum
      );
      // headerを引き継ぐ
      for (let i = 0; i < this.tabs[tabId].sheets.meta.inputNum; i++) {
        if (i < oldIn) this.tabs[tabId].sheets.body[0][i] = oldBody[0][i];
        else this.tabs[tabId].sheets.body[0][i] = String.fromCharCode(0x41 + i);
      }

      // 出力の数が変化している場合は過去の出力を引き継ぐ
      if (oldOut !== this.tabs[tabId].sheets.meta.outputNum) {
        const outIdx = this.tabs[tabId].sheets.meta.inputNum;
        for (let i = outIdx; i < oldCols; i++) {
          range(oldRows).forEach((row) => {
            this.tabs[tabId].sheets.body[row][i] = oldBody[row][i];
          });
        }
      }

      const heightMap = ['0px', '0px', '180px', '280px', '500px'];
      this.tabs[tabId].sheetHeight = heightMap[this.tabs[tabId].sheets.meta.inputNum];
      this.tabs[tabId].show = false;
      process.nextTick(() => (this.tabs[tabId].show = true));
      // 出力が変化していた場合「以外」にカルノー図の状態をリセットする
      if (oldOut === this.tabs[tabId].sheets.meta.outputNum) {
        this.$refs.karnaughTable[this.tab].reset();
      }
    },
    changeCell(id, e) {
      if (!e) return;
      // console.log(e);
      const tabId = this.tabs.findIndex((_) => _.id === id);
      const [y, x, old, v] = e;
      let nextRow = [...this.tabs[tabId].sheets.body[y]];
      // 出力ラベルのみ2文字以上を許可。需要次第で要検討
      if (y === 0 && x >= this.tabs[tabId].sheets.meta.inputNum) {
        nextRow[x] = v || old;
      } else {
        nextRow[x] = (v && v[0]) || old;
      }

      this.tabs[tabId].sheets.body.splice(y, 1, nextRow);
      this.tabs[tabId].modified = true;
      this.$refs.karnaughTable[0].changeCell(e[1] - this.tabs[tabId].sheets.meta.inputNum);
    },
    confirmSave(event) {
      if (this.tabs.some((_) => _.modified)) {
        event.returnValue = '編集を保存せずにページを離れようとしています。このまま移動しますか？';
        return '編集を保存せずにページを離れようとしています。このまま移動しますか？';
      }
    },
  },
  watch: {},
  mounted() {
    this.addTab();
    this.tabs.forEach((_) => (_.modified = false));
    window.addEventListener('beforeunload', this.confirmSave); // TODO デプロイ時コメントアウト解除
  },
};
</script>

<style>
.theme--light.v-tabs-items {
  background-color: inherit !important;
}

.margin-initial {
  margin: initial;
}

.v-text-field__slot input {
  margin-top: 16px !important;
}

.v-toolbar__content .v-input {
  font-size: inherit;
  max-height: 64px !important;
  padding-bottom: 0px;
}

.v-input {
  align-items: normal !important;
}
.inout {
  margin-top: 12px;
}

.v-toolbar__title {
  font-size: 1.6rem;
}

.sheets {
  /* height: 500px; */
  max-height: 600px;
  min-width: 400px;
  flex-basis: 30%;
}
.v-tab {
  text-transform: none !important;
}

.v-menu__content {
  z-index: 161 !important;
}

.v-select {
  min-width: 72px !important;
}
.v-select .v-text-field__details {
  display: none !important;
}

.col {
  padding-top: 0px !important;
}

.d-flex.marginTopButton {
  margin-top: 24px !important;
}

.v-tabs-slider-wrapper + .v-tab {
  margin-left: 0px !important;
}

div[role='tab'] div .v-btn--icon {
  height: 24px !important;
  width: 24px !important;
  min-height: 24px !important;
  margin-left: 24px !important;
  margin-right: 12px !important;
}

.v-input__slot,
.v-btn {
  min-height: 48px !important;
}

.toggle-fade-enter-active,
.toggle-fade-leave-active {
  transition: opacity 0.6s ease;
}
.toggle-fade-enter,
.toggle-fade-leave-to {
  opacity: 0;
}

div[role='menu'] .v-list {
  background-color: #000000b5;
}
div[role='menu'] .v-list-item__title {
  color: #e1e1e1;
  cursor: pointer;
}
div[role='menu'] .v-list i {
  margin-right: 8px;
  color: #e1e1e1;
}
.import input[type='file'] {
  display: none;
}

.onBtn::before {
  opacity: 0.2;
}
</style>
