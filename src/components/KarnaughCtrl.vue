<template>
  <div class="root" @keydown="keydown($event)" tabindex="0">
    <v-card class="karnaughCtrl">
      <v-tabs background-color="indigo lighten-3" color="white" v-model="selectedTab">
        <v-tabs-slider color="indigo lighten-1"></v-tabs-slider>
        <v-tab v-for="tab in tabItems" :key="tab.key">{{ tab.name }}</v-tab>
        <v-tab-item v-for="table in tables" :key="table.key" ref="tabItem" eager>
          <Karnaugh
            :tableData="table"
            :optView="optView"
            @msg="updateMsg($event)"
            @grouped="grouped($event)"
          ></Karnaugh>
        </v-tab-item>
      </v-tabs>
      <v-row align="center" class="msg">
        <v-text-field :placeholder="msg" filled disabled></v-text-field>
      </v-row>
      <v-row align="center" class="controlButton">
        <v-btn elevation="2" color="indigo lighten-4" @click="grouping">囲む/解除[E]</v-btn>
        <v-btn elevation="2" color="indigo lighten-4" @click="deselection">選択解除[D]</v-btn>
        <v-btn elevation="2" color="indigo lighten-4" @click="reset(null)">リセット[R]</v-btn>
      </v-row>
      <v-row align="center" class="controlButton">
        <v-btn elevation="2" color="indigo lighten-4" @click="autoGrouping">自動で囲む</v-btn>
        <v-btn elevation="2" color="indigo lighten-4" @click="save">図を保存</v-btn>
      </v-row>
    </v-card>
  </div>
</template>
<script>
import Karnaugh from './Karnaugh.vue';

export default {
  components: { Karnaugh },
  data: function () {
    return {
      msg: 'まずは真理値表を編集。0,1以外はドントケア扱い。',
      changed: [],
      selectedTab: 0,
      mathjax: '',
    };
  },
  props: {
    tables: {},
    optView: {},
  },
  methods: {
    import(obj) {},
    export() {
      this.tables.modified = false;
      return this.$refs.tabItem.map((_) => _.$children[0].export());
    },
    keydown(key) {
      // console.log(key);
      const code = key.code;
      if (code === 'KeyE' || code === 'NumpadEnter' || code === 'Enter' || code === 'Space') {
        this.grouping();
      } else if (code === 'KeyD' || code === 'Delete') {
        this.deselection();
      } else if (code === 'KeyR') {
        this.reset();
      }
    },
    grouping() {
      this.activeKarnaugh.grouping();
      this.changed[this.selectedTab] = true;
    },
    deselection() {
      this.activeKarnaugh.deselection();
    },
    autoGrouping() {
      this.reset();
      this.activeKarnaugh.autoGrouping();
      this.msg = `囲みました。自分でも確認してね。`;
    },
    save() {
      this.activeKarnaugh.save();
      this.msg = `画像をダウンロードしました。`;
    },
    reset(idx) {
      idx = idx ?? this.selectedTab;
      if (this.$refs.tabItem[idx]) this.$refs.tabItem[idx].$children[0].reset();
      if (idx >= 0 && idx < this.$refs.tabItem.length) {
        this.msg = `タブ[${this.tabItems[idx].name}]の内容をリセットしました。`;
      }
    },
    updateMsg(msg) {
      this.msg = msg;
    },
    grouped(event) {
      this.$emit('grouped', event);
    },
    changeCell(outIdx) {
      this.reset(outIdx);
      if (!this.changed[outIdx]) {
        this.msg = 'カルノー図の「1」をクリックして「囲む」を選択。';
      } else {
      }
    },
  },
  computed: {
    tabItems() {
      if (!this.tables.map) return {};
      return this.tables.map((t, idx) => ({
        name: t.outName,
        key: `tb${t.outName}${idx}`,
      }));
    },
    activeKarnaugh() {
      return this.$refs.tabItem[this.selectedTab].$children[0];
    },
  },
  mounted() {
    this.selectedTab = 0;
  },
};
</script>

<style scoped>
.root {
  outline: none;
}
.v-tab--active {
  background-color: #5c6bc0;
  /* indigo lighten-3 */
}
.karnaughCtrl {
  min-width: 430px;
  padding-bottom: 24px;
}

.controlButton button {
  width: 160px;
  margin-left: 24px;
  margin-top: 8px;
}
.msg {
  margin: 0;
  margin-bottom: -32px;
}
</style>
