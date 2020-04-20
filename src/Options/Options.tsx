import React from 'react';
import {browser} from 'webextension-polyfill-ts';
import Switch from 'rc-switch';
import optionsStorage from '@/Background/options-storage';
import {requestPermission} from '@/Background/lib/permissions-service';
import Message from './Message';
import Section from './Section';
import SectionOption from './SectionOption';

import './styles.less';
import 'rc-switch/assets/index.css';

interface OptionsState {
  token: string;
  rootUrl: string;
  playNotifSound: boolean;
  showDesktopNotif: boolean;
  onlyParticipating: boolean;
  reuseTabs: boolean;
  updateCountOnNavigation: boolean;
  useJsDelivr: boolean;
}

class Options extends React.Component<any, OptionsState> {
  constructor(props: any) {
    super(props);

    this.state = {
      token: '',
      rootUrl: '',
      playNotifSound: false,
      showDesktopNotif: true,
      onlyParticipating: false,
      reuseTabs: false,
      updateCountOnNavigation: false,
      useJsDelivr: false,
    };
  }

  form: any;

  async componentDidMount() {
    const optionData = await optionsStorage.getAll();

    this.setState(optionData);
  }

  saveField = (fieldName: string, fieldValue: any) => {
    const updateData = {[fieldName]: fieldValue};

    // @ts-ignore
    this.setState(updateData);

    // Programatically changing input value does not trigger input events, so save options manually
    optionsStorage.set(updateData);

    browser.runtime.sendMessage({
      type: 'update',
    });
  };

  handleNotifyInputChange = async (checked: boolean) => {
    let isChecked = checked;

    if (isChecked) {
      isChecked = await requestPermission('notifications');
    }

    this.saveField('showDesktopNotif', isChecked);
  };

  handleParticipatingChange = (checked: boolean) => {
    this.saveField('onlyParticipating', checked);
  };

  handleSoundChange = (checked: boolean) => {
    this.saveField('playNotifSound', checked);
  };

  handleReuseTabsChange = (checked: boolean) => {
    this.saveField('reuseTabs', checked);
  };

  handleTabUpdateChange = (checked: boolean) => {
    this.saveField('updateCountOnNavigation', checked);
  };

  handleUseJsDelivrChange = (checked: boolean) => {
    this.saveField('useJsDelivr', checked);
  };

  handleTokenChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    this.saveField('token', e.target.value);
  };

  handleUrlChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    this.saveField('rootUrl', e.target.value);
  };

  render() {
    const {rootUrl, token, onlyParticipating, showDesktopNotif, playNotifSound, reuseTabs, updateCountOnNavigation, useJsDelivr} = this.state;

    return (
      <form
        id="options-form"
        ref={ins => {
          this.form = ins;
        }}
      >
        <div className="header">
          <h1>Git Master</h1>
        </div>
        <Section title={<Message i18n="github_notifications" />}>
          <SectionOption
            title="Root URL"
            description={
              <div className="small">
                <Message i18n="notify_github_host_tip" />
              </div>
            }
          >
            <label>
              <input
                className="master-input github-url"
                value={rootUrl}
                onChange={this.handleUrlChange}
                type="url"
                name="rootUrl"
                placeholder="e.g. https://github.yourco.com/"
              />
            </label>
          </SectionOption>

          <SectionOption
            title="Token"
            description={
              <>
                <div className="small">
                  <Message i18n="notify_github_token_tip" />
                </div>
                <div className="small">
                  <Message i18n="notify_github_token_private_tip" />
                </div>
              </>
            }
          >
            <label>
              <input
                value={token}
                onChange={this.handleTokenChange}
                type="text"
                name="token"
                className="master-input github-token"
                placeholder="a1b2c3d4e5f6g7h8i9j0a1b2c3d4e5f6g7h8i9j0"
                pattern="[a-z\d]{40}"
                spellCheck="false"
              />
            </label>
          </SectionOption>

          <SectionOption title={<Message i18n="notify_github_issue" />} layout="horizontal">
            <Switch checked={onlyParticipating} onClick={this.handleParticipatingChange} />
          </SectionOption>

          <SectionOption title={<Message i18n="notify_github_desktop" />} layout="horizontal">
            <Switch checked={showDesktopNotif} onClick={this.handleNotifyInputChange} />
          </SectionOption>

          <SectionOption title={<Message i18n="notify_github_sound" />} layout="horizontal">
            <Switch checked={playNotifSound} onClick={this.handleSoundChange} />
          </SectionOption>

          <SectionOption title={<Message i18n="notify_github_reuse_tab" />} layout="horizontal">
            <Switch checked={reuseTabs} onClick={this.handleReuseTabsChange} />
          </SectionOption>

          <SectionOption title={<Message i18n="notify_github_update_count" />} layout="horizontal">
            <Switch checked={updateCountOnNavigation} onClick={this.handleTabUpdateChange} />
          </SectionOption>
        </Section>

        <Section title="其他">
          <SectionOption
            title={<Message i18n="download_url_use_mirror" />}
            layout="horizontal"
            description={<Message i18n="download_url_use_mirror_desc" />}
          >
            <Switch checked={useJsDelivr} onClick={this.handleUseJsDelivrChange} />
          </SectionOption>
        </Section>
      </form>
    );
  }
}

export default Options;
