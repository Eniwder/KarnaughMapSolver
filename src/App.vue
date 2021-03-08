<template>
  <v-app id="app" data-app>
    <template>
      <v-card>
        <v-toolbar color="indigo" dark flat>
          <v-app-bar-nav-icon></v-app-bar-nav-icon>

          <v-toolbar-title>
            <v-text-field v-model="projectName"></v-text-field>
          </v-toolbar-title>
          <v-spacer></v-spacer>
          <v-btn icon>
            <v-icon>mdi-help</v-icon>
          </v-btn>

          <!-- タブ一覧 -->
          <template v-slot:extension>
            <v-tabs v-model="tab" align-with-title center-active>
              <v-tabs-slider color="yellow"></v-tabs-slider>
              <v-tab v-for="tab in tabs" :key="tab.id" :data-id="tab.id">
                {{ tab.name }}
                <v-btn icon @click="tabDelete(tab.id)">
                  <v-icon small>mdi-close</v-icon>
                </v-btn>
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
                <v-col class="d-flex" cols="3">
                  <v-text-field v-model="tab.name" class="shrink">
                    <v-icon slot="prepend">mdi-pencil</v-icon>
                  </v-text-field>
                </v-col>
                <v-col class="d-flex marginTopButton" cols="2">
                  <v-btn color="primary" elevation="2">カルノー図作成</v-btn>
                </v-col>
              </v-row>

              <v-row>
                <v-col class="d-flex" cols="2">
                  <v-select
                    :items="[2, 3, 4]"
                    v-model="tab.sheets.meta.inputNum"
                    label="Inputs"
                    outlined
                    @change="changeInOut(tab.id)"
                  ></v-select>
                </v-col>
                <v-col class="d-flex" cols="2">
                  <v-select
                    :items="[1, 2, 3]"
                    v-model="tab.sheets.meta.outputNum"
                    label="Outputs"
                    outlined
                    @change="changeInOut(tab.id)"
                  ></v-select>
                </v-col>
              </v-row>

              <v-row>
                <v-col cols="12" sm="6" class="sheets">
                  <MySheets :tableData="tab.sheets" v-if="tab.show"></MySheets>
                </v-col>
                <v-col cols="12" sm="6">
                  <!-- <MySheets class="pa-2"></MySheets> -->
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
const range = (n) => [...Array(n).keys()];

export default {
  name: 'App',
  components: { MySheets },
  data() {
    return {
      projectName: 'Project1',
      tab: 0,
      tabs: [
        {
          id: 1,
          name: 'Work1',
          show: true,
          sheets: this.createTruthTable(4, 1),
        },
      ],
    };
  },
  methods: {
    createTruthTable(inputNum, outputNum) {
      const ret = {
        headers: [],
        body: [],
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
          ...range(inputNum).map((n) => String.fromCharCode(0x41 + n)),
          ...range(outputNum).map((n) => String.fromCharCode(0x58 + n)),
        ],
        ...range(Math.pow(2, inputNum)).map((n) =>
          n
            .toString(2)
            .padStart(inputNum, 0)
            .padEnd(inputNum + outputNum, 0)
            .split('')
        ),
      ];

      return ret;
    },
    addTab() {
      const maxId = this.tabs.reduce((acc, v) => (acc > v ? acc : v.id), -1);
      this.tabs.push({
        id: maxId + 1,
        show: true,
        name: `work${maxId + 1}`,
        sheets: this.createTruthTable(4, 1),
      });
      const tabId = this.tabs.findIndex((_) => _.id === maxId + 1);
      const self = this;
      process.nextTick(() => {
        self.tab = tabId;
      });
    },
    tabRename(id) {
      const tabId = this.tabs.findIndex((_) => _.id === id);
    },
    tabDelete(id) {
      const tabId = this.tabs.findIndex((_) => _.id === id);
      this.tabs.splice(tabId, 1);
    },
    changeInOut(id) {
      // 更新の仕方がわからなかったので仕方なく再描画
      const tabId = this.tabs.findIndex((_) => _.id === id);
      this.tabs[tabId].sheets = this.createTruthTable(
        this.tabs[tabId].sheets.meta.inputNum,
        this.tabs[tabId].sheets.meta.outputNum
      );
      this.tabs[tabId].show = false;
      process.nextTick(() => (this.tabs[tabId].show = true));
    },
  },
};
</script>

<style>
#app {
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

.v-toolbar__title {
  font-size: 1.6rem;
}

.sheets {
  height: 800px;
}
.v-tab {
  text-transform: none !important;
}

.v-menu__content {
  z-index: 161 !important;
}

.v-input__slot,
.v-btn {
  min-height: 48px !important;
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
</style>
