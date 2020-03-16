import { EVENT } from './core.constants';

class ErrorView {
  constructor($dom) {
    this.$this = $(this);
    this.$view = $dom.find('.gitmaster-error-view');
  }

  show(err) {
    this.$view.find('.gitmaster-view-header')
      .html(err.error);
    this.$view.find('.message')
      .html(err.message);
    this.$view.find('.settings-btn')
      .click((event) => {
        event.preventDefault();
        this.$this.trigger(EVENT.VIEW_CLOSE, { showSettings: true });
      });
    this.$this.trigger(EVENT.VIEW_READY);
  }
}

export default ErrorView;
