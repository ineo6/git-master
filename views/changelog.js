export default {
  feature: [
    {
      text: {
        en: 'Support GitHub more dark theme and auto mode',
        zh_CN: '兼容GitHub新增的黑暗模式主题',
      },
    },
    {
      text: {
        en: 'Download acceleration for GitHub clone、releases、tags',
        zh_CN: 'GitHub支持clone和releases下载加速',
      },
      description: {
        en: 'see "GitHub download acceleration" in extension options. Only required by users in China',
        zh_CN: 'Zip下载、releases下载、tags下载以及http clone都可以加速，请在扩展的"选项=>GitHub下载加速"查看并启用',
      },
    },
  ],
  fix: [
    {
      text: {
        en: 'Use default branch when viewing releases or tags',
        zh_CN: 'releases和tags界面使用项目默认分支',
      },
    },
  ],
  version: '1.13.0',
};
