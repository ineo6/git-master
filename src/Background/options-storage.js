import OptionsSync from './webext-options-sync';

export const storageName = 'options';

const optionsStorage = new OptionsSync({
  defaults: {
    token: '',
    rootUrl: 'https://api.github.com/',
    playNotifSound: false,
    showDesktopNotif: false,
    onlyParticipating: false,
    reuseTabs: false,
    updateCountOnNavigation: false,
    useJsDelivr: false,
  },
  migrations: [
    OptionsSync.migrations.removeUnused,
  ],
  storageName,
});

export default optionsStorage;
