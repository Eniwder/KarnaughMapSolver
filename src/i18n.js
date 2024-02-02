import { createI18n } from "vue-i18n";

// メッセージ定義ファイルの読み込み
import messages from './configs/message.json';

// デフォルト言語の設定
export const DEFAULT_LANG = 'ja';

// 言語切替用の定義
export const enableLangs = Object.keys(messages);
export const langCodes = {
  "ja": "日本語",
  "en": "English"
};

const i18n = createI18n({
  legacy: false,
  warnHtmlMessage: false,
  locale: DEFAULT_LANG,
  fallbackLocale: DEFAULT_LANG,
  messages,
});

export default i18n;