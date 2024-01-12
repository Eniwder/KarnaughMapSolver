<template>
  <v-row justify="center">
    <v-dialog v-model="dialog" max-width="400" min-width="240">
      <template v-slot:activator="{ props }">
        <v-btn icon v-bind="props">
          <div @click=" customOn($event)">
            <v-icon small>mdi-close</v-icon>
          </div>
        </v-btn>
      </template>
      <v-card>
        <v-card-title class="headline">
          {{ $t('タブを消しても大丈夫ですか？') }}
        </v-card-title>
        <v-card-text>{{ $t('編集したデータは失われます。') }}</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="green darken-1" text @click="dialog = false">
            {{ $t('消さない') }}
          </v-btn>
          <v-btn color="green darken-1" text @click="$emit('confirmDelete')">
            {{ $t('消す') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script>
export default {
  props: {
    tab: Object,
  },
  data() {
    return {
      dialog: false,
    };
  },
  methods: {
    customOn(e) {
      if (!this.tab.modified) {
        this.$emit('confirmDelete');
        e.stopPropagation();
      }
    },
  },
};
</script>