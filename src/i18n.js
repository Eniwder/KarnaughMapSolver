import Vue from 'vue'
import VueI18n from 'vue-i18n';

// VueアプリケーションでVueI18nプラグインを使う宣言
Vue.use(VueI18n);

// メッセージ定義ファイルの読み込み
const messages = require('./configs/message.json');

// デフォルト言語の設定
export const DEFAULT_LANG = 'ja';

// 言語切替用の定義
export const enableLangs = Object.keys(messages);
export const langCodes = {
  "ja": "日本語",
  "en": "English"
};

// VueI18nインスタンスの生成（言語とメッセージオブジェクトを渡す）
const i18n = new VueI18n({
  locale: DEFAULT_LANG,
  fallbackLocale: DEFAULT_LANG,
  messages: messages
});

export default i18n;