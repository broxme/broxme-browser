/* globals customElements */
import { LitElement, html, css } from '../vendor/lit-element/lit-element'
import { repeat } from '../vendor/lit-element/lit-html/directives/repeat'
import * as bg from './bg-process-rpc'
import commonCSS from './common.css'
import { app, BrowserWindow, dialog, Menu } from 'electron'


class BrowserMenu extends LitElement {
  static get properties () {
    return {
      submenu: {type: String}
    }
  }

  constructor () {
    super()
    this.submenu = ''
    this.isDarwin = false
  }

  reset () {
    this.submenu = ''
  }

  async init () {
    await this.requestUpdate()
    let browserInfo = await bg.beakerBrowser.getInfo()
    this.browserInfo = browserInfo
    this.isDarwin = browserInfo.platform === 'darwin'
    await this.requestUpdate()
    this.daemonStatus = await bg.beakerBrowser.getDaemonStatus()
    this.requestUpdate()
  }

  render () {
    // auto-updater
    var autoUpdaterEl = html``
    if (this.browserInfo && this.browserInfo.updater.isBrowserUpdatesSupported && this.browserInfo.updater.state === 'downloaded') {
      autoUpdaterEl = html`
        <div class="section auto-updater">
          <div class="menu-item auto-updater" @click=${this.onClickRestart}>
            <i class="fa fa-arrow-circle-up"></i>
            <span class="label">Restart to update Broxme Browser</span>
          </div>
        </div>
      `
    }

    return html`
      <link rel="stylesheet" href="broxme://assets/font-awesome.css">
      <div class="wrapper">
        ${autoUpdaterEl}

        <div class="section">
          <div class="menu-item" @click=${e => this.onOpenNewTab()}>
            <i class="fas fa-plus"></i>
            <span class="label">New Tab</span>
          </div>
        </div>

        <div class="section">
        <div class="menu-item" @click=${e => this.onOpenPage(e, 'broxme://settings/?view=blocking')}>
          <i class="fas fa-shield-alt"></i>
            <span class="label">Ads Blocking</span>
          </div>
          <div class="menu-item" @click=${e => this.onOpenPage(e, 'broxme://library')}>
            <img class="favicon" src="asset:favicon:broxme://library/">
            <span class="label">Library</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenPage(e, 'broxme://history')}>
            <img class="favicon" src="asset:favicon:broxme://history/">
            <span class="label">History</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenPage(e, 'broxme://settings')}>
            <img class="favicon" src="asset:favicon:broxme://settings/">
            <span class="label">Settings</span>
          </div>
       
          <div class="menu-item" @click=${e => this.onPrint()}>
            <i class="fas fa-print"></i>
            <span class="label">Print</span>
          </div>

          <div class="menu-item" @click=${e => this.onOpenPage(e, 'https://www.broxme.com/')}>
            <i class="far fa-life-ring"></i>
            <span class="label">About</span>
          </div>
        </div>

        ${this.daemonStatus ? html`
          <div class="network-status">
            <div class="network-status-title">Your IP And Port</div>
            <div class="network-status-line">
              <span class="fa-fw fas fa-network-wired"></span>
              ${this.daemonStatus.remoteAddress || 'Unknown or VPN detected '}
            </div>
            <div class="network-status-line">
              ${this.daemonStatus.holepunchable
                ? html`<span class="fa-fw fas fa-exclamation-triangle"></span> You are not using VPN connection`
                : html`<span class="fa-fw fas fa-check"></span> You are using VPN connection `
              }
            </div>
            ${!this.daemonStatus.holepunchable ? html`
              <div class="help">
                <a @click=${e => this.onOpenPage(e, 'https://support.broxme.com/connection-vpn')}>
                  <span class="far fa-fw fa-question-circle"></span> What does this mean?
                </a>
            </div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `
  }

  // events
  // =

  updated () {
    // adjust dimensions based on rendering
    var width = this.shadowRoot.querySelector('div').clientWidth|0
    var height = this.shadowRoot.querySelector('div').clientHeight|0
    bg.shellMenus.resizeSelf({width, height})
  }

  onShowSubmenu (v) {
    this.submenu = v
  }

  onOpenNewTab () {
    bg.shellMenus.createTab()
    bg.shellMenus.close()
  }

  onClickMenuItem (menu, id) {
    return async (e) => {
      bg.shellMenus.triggerWindowMenuItemById(menu, id)
      bg.shellMenus.close()
    }
  }

  async onNewHyperdrive () {
    bg.shellMenus.close()
    const url = await bg.hyperdrive.createDrive()
    bg.beakerBrowser.openUrl(url, {setActive: true, addedPaneUrls: ['broxme://editor/']})
  }

  async onNewHyperdriveFromFolder (e) {
    bg.shellMenus.close()

    var folder = await bg.beakerBrowser.showOpenDialog({
      title: 'Select folder',
      buttonLabel: 'Use folder',
      properties: ['openDirectory']
    })
    if (!folder || !folder.length) return

    var url = await bg.hyperdrive.createDrive({
      title: folder[0].split('/').pop(),
      prompt: false
    })
    await bg.hyperdrive.importFromFilesystem({src: folder[0], dst: url})
    
    bg.beakerBrowser.openUrl(url, {setActive: true})
  }
  

  onPrint (e) {
    bg.views.print('active')
  }

  onOpenPage (e, url) {
    bg.shellMenus.createTab(url)
    bg.shellMenus.close()
  }

  onClickRestart () {
    bg.shellMenus.close()
    bg.beakerBrowser.restartBrowser()
  }
}
 
BrowserMenu.styles = [commonCSS, css`
.wrapper {
  width: 250px;
}

.wrapper::-webkit-scrollbar {
  display: none;
}

.section:last-child {
  border-bottom: 0;
}

.section.auto-updater {
  padding-bottom: 0;
  border-bottom: 0;
}

.section.gray {
  padding: 2px 0;
  background: #f5f5fa;
}

.section.gray .menu-item:hover {
  background: #e5e5ee;
}

.section.scrollable {
  max-height: 400px;
  overflow-y: auto;
}

.menu-item-group {
  display: flex;
  padding: 0 2px;
}

.menu-item-group > .menu-item:first-child {
  padding-right: 8px;
}

.menu-item-group > .menu-item:last-child {
  padding-left: 8px;
}

.menu-item-group > .menu-item .shortcut {
  padding-left: 10px;
}

.menu-item {
  height: 32px;
}

.menu-item[disabled] {
  color: #99a;
}

.menu-item[disabled]:hover {
  background: none;
}

.menu-item.auto-updater {
  height: 35px;
  background: #DCEDC8;
  border-top: 1px solid #c5e1a5;
  border-bottom: 1px solid #c5e1a5;
  color: #000;
}

.menu-item.auto-updater i {
  color: #7CB342;
}

.menu-item.auto-updater:hover {
  background: #d0e7b5;
}

.menu-item i.more {
  margin-left: auto;
  padding-right: 0;
  text-align: right;
}

.menu-item i {
  color: var(--text-color--menu-item-icon--light);
}

.menu-item .more,
.menu-item .shortcut {
  color: var(--text-color--menu-item-icon--light);
  margin-left: auto;
}

.menu-item .shortcut {
  font-size: 12px;
  -webkit-font-smoothing: antialiased;
}

.network-status {
  padding: 8px;
  background: var(--bg-color--bgtabs--main);
}

.network-status-title {
 font-size: 11px;
 font-weight: bold;
 padding: 0 3px 3px;
}

.network-status-line {
  font-size: 12px;
  white-space: nowrap;
  color: inherit;
  margin: 5px 2px 0;
}

.network-status-line .fa-fw,
.network-status .help .fa-fw {
  margin: 0 5px;
}

.network-status .fa-exclamation-triangle {
  color: #FF8F00;
}

.network-status .help {
  margin: 5px 2px 0;
}

.network-status .help a {
  text-decoration: none;
  color: inherit;
}

.network-status .help a:hover {
  text-decoration: underline;
}
`]

customElements.define('browser-menu', BrowserMenu)