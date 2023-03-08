<template>
  <div class="root" @keydown="keydown($event)" tabindex="0">
    <v-card class="karnaughCtrl">
      <v-tabs background-color="indigo lighten-3" color="white" v-model="selectedTab">
        <v-tabs-slider color="indigo lighten-1"></v-tabs-slider>
        <v-tab v-for="tab in tabItems" :key="tab.key">{{ tab.name }}</v-tab>
        <v-tab-item v-for="table in tables" :key="table.key" ref="tabItem" eager>
          <Karnaugh
            :_tableData="table"
            :optView="optViewProps"
            @msg="updateMsg($event)"
            @grouped="grouped($event)"
          ></Karnaugh>
        </v-tab-item>
        <v-menu bottom right class="optView" :close-on-content-click="false">
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              icon
              dark
              v-bind="attrs"
              v-on="on"
              style="margin: auto 8px auto auto; width: 48px; height: 48px"
            >
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-subheader dark>{{ $t('表示設定') }}</v-subheader>
            <v-list-item v-for="(item, index) in Object.values(optView)" :key="index" dark>
              <v-tooltip bottom open-delay="600">
                <template v-slot:activator="{ on, attrs }">
                  <span v-bind="attrs" v-on="on">
                    <v-switch
                      v-model="item.value"
                      inset
                      :label="item.label"
                      dark
                      style="height: 48px"
                    ></v-switch>
                  </span>
                </template>
                <span>{{ item.disc }}</span>
              </v-tooltip>
            </v-list-item>
            <v-subheader dark>{{ $t('図の出力') }}</v-subheader>
            <v-list-item>
              <v-icon>mdi-download</v-icon>
              <v-list-item-title @click="save('png')">{{ $t('PNG保存') }} </v-list-item-title>
            </v-list-item>
            <v-list-item>
              <v-icon>mdi-download</v-icon>
              <v-list-item-title @click="save('svg')">{{ $t('SVG保存') }} </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </v-tabs>

      <v-row align="center" class="msg">
        <v-text-field :placeholder="msg" filled disabled></v-text-field>
      </v-row>
      <v-row align="center" class="controlButton">
        <v-btn elevation="2" color="indigo lighten-4" @click="grouping"
          >{{ $t('囲む解除') }}
        </v-btn>
        <v-btn elevation="2" color="indigo lighten-4" @click="deselection">{{
          $t('選択解除')
        }}</v-btn>
        <v-btn elevation="2" color="indigo lighten-4" @click="reset(null)">{{
          $t('リセット')
        }}</v-btn>
        <v-btn elevation="2" color="indigo lighten-4" @click="autoGrouping">{{
          $t('自動で囲む')
        }}</v-btn>
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
      msg: this.$t('まずは真理値表を編集。0,1以外はドントケア扱い。'),
      changed: [],
      selectedTab: 0,
      mathjax: '',
      optView: {
        AB_or_BA: {
          label: 'A/B ↔ B/A',
          value: false,
          disc: this.$t('入力の描画順序を入れ替えます。'),
        },
        A_BC_or_A_BC: {
          label: 'A/BC ↔ AB/C',
          value: false,
          disc: this.$t('3変数の時に入力の区切り位置を変更します。'),
        },
      },
    };
  },
  props: {
    tables: {},
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
      this.msg = this.$t(`囲みました。自分でも確認してね。`);
    },
    save(ext) {
      this.activeKarnaugh.save(ext);
      this.msg = this.$t(`図をダウンロードしました。`);
    },
    reset(idx) {
      idx = idx ?? this.selectedTab;
      if (this.$refs.tabItem[idx]) this.$refs.tabItem[idx].$children[0].reset();
      if (idx >= 0 && idx < this.$refs.tabItem.length) {
        this.msg = this.$t(`タブ@@@の内容をリセットしました。`).replace(
          '@@@',
          this.tabItems[idx].name
        );
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
        this.msg = this.$t('カルノー図の「1」をクリックして「囲む」を選択。');
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
    optViewProps() {
      return Object.entries(this.optView).reduce((acc, [k, v]) => {
        acc[k] = v.value;
        return acc;
      }, {});
    },
  },
  mounted() {
    this.selectedTab = 0;
  },
  watch: {
    optView: {
      deep: true,
      handler() {
        // this.reset();
      },
    },
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
