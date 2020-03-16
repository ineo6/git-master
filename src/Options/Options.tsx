import React from 'react';
import { browser } from 'webextension-polyfill-ts';

import optionsStorage from '../Background/options-storage';
import './styles.less';
import { requestPermission } from '../Background/lib/permissions-service';
import Message from './Message';

class Options extends React.Component<any, any> {
  form: any;

  componentDidMount(): void {
    optionsStorage.syncForm(this.form);

    this.form.addEventListener('options-sync:form-synced', () => {
      browser.runtime.sendMessage({
        type: 'update',
      });
    });
  }

  handleNotifyInputChange = async (event: any) => {
    const inputElement = event.target;
    if (inputElement.checked) {
      inputElement.checked = await requestPermission(inputElement.dataset.requestPermission);

      // Programatically changing input value does not trigger input events, so save options manually
      optionsStorage.set({
        [inputElement.name]: inputElement.checked,
      });
    }
  };

  render() {
    return (
      <form
        id="options-form"
        ref={(ins) => {
          this.form = ins;
        }}
      >
        <section>
          <h3>API Access</h3>

          <label>
            <h4>Root URL</h4>
            <input type="url" name="rootUrl" placeholder="e.g. https://github.yourco.com/" />
          </label>
          <p className="small"><Message i18n='notify_github_host_tip' /></p>

          <label>
            <h4>Token</h4>
            <input
              type="text"
              name="token"
              placeholder="a1b2c3d4e5f6g7h8i9j0a1b2c3d4e5f6g7h8i9j0"
              pattern="[a-z\d]{40}"
              spellCheck="false"
            />
          </label>
          <p className="small">
            <Message i18n='notify_github_token_tip' />
          </p>
          <p className="small">
            <Message i18n='notify_github_token_private_tip' />
          </p>
        </section>

        <hr />

        <section>
          <h3>Notifications</h3>
          <label>
            <input type="checkbox" name="onlyParticipating" />
            <Message i18n='notify_github_issue' />
          </label>
          <label>
            <input
              type="checkbox"
              name="showDesktopNotif"
              data-request-permission="notifications"
              onClick={this.handleNotifyInputChange}
            />
            <Message i18n='notify_github_desktop' />
          </label>
          <label>
            <input type="checkbox" name="playNotifSound" />
            <Message i18n='notify_github_sound' />
          </label>
        </section>

        <hr />

        <section>
          <h3>Tab</h3>
          <label>
            <input type="checkbox" name="reuseTabs" data-request-permission="tabs" />
            <Message i18n='notify_github_reuse_tab' />
          </label>
          <label>
            <input type="checkbox" name="updateCountOnNavigation" data-request-permission="tabs" />
            <Message i18n='notify_github_update_count' />
          </label>
        </section>
      </form>
    );
  }
}

export default Options;
