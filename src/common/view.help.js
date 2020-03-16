import { EVENT, SHOW_CLASS, STORE } from './core.constants';
import extStore from './core.storage';

class HelpPopup {
  constructor($dom) {
    this.$view = $dom.find('.popup');
  }

  hideAndDestroy = async () => {
    await extStore.set(STORE.POPUP, true);
    if (this.$view.hasClass('show')) {
      this.$view.removeClass('show')
        .one('transitionend', () => this.$view.remove());
    } else {
      this.$view.remove();
    }
  };

  async init() {
    const popupShown = await extStore.get(STORE.POPUP);
    const sidebarVisible = $('html')
      .hasClass(SHOW_CLASS);

    if (popupShown || sidebarVisible) {
      return this.hideAndDestroy();
    }

    $(document)
      .one(EVENT.TOGGLE, this.hideAndDestroy);

    setTimeout(() => {
      setTimeout(this.hideAndDestroy, 10000);
      this.$view.addClass('show')
        .click(this.hideAndDestroy);
    }, 500);
  }
}

export default HelpPopup;
