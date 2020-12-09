import { LitElement, html } from 'broxme://app-stdlib/vendor/lit-element/lit-element.js'
import { repeat } from 'broxme://app-stdlib/vendor/lit-element/lit-html/directives/repeat.js'
import { EditBookmarkPopup } from 'broxme://app-stdlib/js/com/popups/edit-bookmark.js'
import { AddLinkPopup } from './com/add-link-popup.js'
import * as toast from 'broxme://app-stdlib/js/com/toast.js'
import { writeToClipboard } from 'broxme://app-stdlib/js/clipboard.js'
import { pluralize } from 'broxme://app-stdlib/js/strings.js'
import * as desktop from './lib/desktop.js'
import * as addressBook from './lib/address-book.js'
import css from '../css/main.css.js'
import 'broxme://app-stdlib/js/com/img-fallbacks.js'

const VERSION_ID = (major, minor, patch, pre) => major * 1e9 + minor * 1e6 + patch * 1e3 + pre
const CURRENT_VERSION = VERSION_ID(1, 0, 0, 8)
const RELEASE = { label: '1.0', url: 'https://www.broxme.com/browser/whatsnew/' }

class DesktopApp extends LitElement {
  static get properties () {
    return {
      profile: {type: Object},
      pins: {type: Array},
      legacyArchives: {type: Array}
    }
  }

  static get styles () {
    return css
  }

  constructor () {
    super()
    this.profile = undefined
    this.pins = []
    this.legacyArchives = []

    this.load()

    this.lastDismissedReleaseNotice = localStorage.lastDismissedReleaseNotice
    localStorage.lastDismissedReleaseNotice = CURRENT_VERSION

    window.addEventListener('focus', e => {
      this.load()
    })
    this.addEventListener('update-pins', async (e) => {
      this.pins = await desktop.load()
    })
  }

  async load ({clearCurrent} = {clearCurrent: false}) {
    ;[this.profile, this.pins] = await Promise.all([
      addressBook.loadProfile(),
      desktop.load()
    ])
    console.log(this.pins)
    this.legacyArchives = await broxme.datLegacy.list()
  }

  // rendering
  // this line will be in render section <a href="#" @click=${this.onClickNewHyperdrive}>+ New Hyperdrive</a>

  render () {

    return html`
      <link rel="stylesheet" href="broxme://assets/font-awesome.css">
      <div id="topright">
        
        <a href="broxme://library/" title="Library"><i class="fas fa-book"></i> Library</a>
        <a href="https://www.broxme.com/" title="About"><i class="far fa-question-circle"></i> About</a>
      </div>
      ${this.renderSupportBanner()}
      <main>
        <div class="onecol">
          ${this.renderReleaseNotice()}
          ${this.renderPins()}
          ${this.renderLegacyArchivesNotice()}
        </div>
      </main>
    `
  }

  renderSupportBanner () {
    if (localStorage.hasDismissedSupportBanner) {
      return ''
    }
    return html`
      <div id="support-banner">
        <a href="https://www.broxme.com/feedback/" title="Give us your valuable feedback" target="_blank">
          <span class="far fa-fw fa-heart"></span>
          This is a pre-release version of Broxme Browser . Your support and feedbacks are strongly welcome.
        
        <a class="dismiss" href="#" @click=${this.onCloseSupportBanner}><span class="fas fa-times"></span></a>
      </div>
    `
  }

  renderReleaseNotice () {
    if (this.lastDismissedReleaseNotice >= CURRENT_VERSION) {
      return ''
    }
    return html`
      <div class="release-notice">
        <a href=${RELEASE.url} class="view-release-notes" target="_blank">
          <span class="fas fa-fw fa-rocket"></span>
          <strong>Welcome to Broxme Browser ${RELEASE.label}!</strong>
          Click here to see what's new.
        </a>
      </div>
    `
  }

  renderPins () {
    var pins = this.pins || []
    return html`
      <div class="pins">
        ${repeat(pins, pin => pin.href, pin => html`
          <a
            class="pin"
            href=${pin.href}
            @contextmenu=${e => this.onContextmenuPin(e, pin)}
          >
            <div class="thumb-wrapper">
              <img src=${'asset:screenshot-180:' + pin.href} class="thumb"/>
            </div>
            <div class="details">
              <div class="title">${pin.title}</div>
            </div>
          </a>
        `)}
        <a class="pin add" @click=${e => this.onClickNewBookmark(e, true)}>
          <span class="fas fa-fw fa-plus thumb"></span>
        </a>
      </div>
    `
  }

  renderLegacyArchivesNotice () {
    if (this.legacyArchives.length === 0) {
      return ''
    }
    return html`
      <section class="legacy-archives notice">
        <h3>Legacy Dats</h3>
        <p>You have ${this.legacyArchives.length} legacy Dat ${pluralize(this.legacyArchives.length, 'archive')} which can be converted to Hyperdrive.</p>
        <div class="archives">
          ${this.legacyArchives.slice(0, 3).map(archive => html`
            <div class="archive">
              <a href="dat://${archive.key}" title=${archive.title} target="_blank">${archive.title || archive.key}</a>
              <div class="btn-group">
                <button @click=${e => {window.location = `dat://${archive.key}`}}>View</button>
                <button @click=${e => this.onClickRemoveLegacyArchive(e, archive)}>Remove</button>
              </div>
            </div>
          `)}
          ${this.legacyArchives.length > 3 ? html`
            <a @click=${e => { this.currentNav = 'legacy-archives' }}>View All &raquo;</a>
          ` : ''}
        </div>
      </section>
    `
  }

  renderLegacyArchivesView () {
    if (this.legacyArchives.length === 0) {
      return ''
    }
    return html`
      <section class="legacy-archives view">
        <h3>Legacy Dats</h3>
        <p>You have ${this.legacyArchives.length} legacy Dat ${pluralize(this.legacyArchives.length, 'archive')} which can be converted to Hyperdrive.</p>
        <div class="archives">
          ${this.legacyArchives.map(archive => html`
            <div class="archive">
              <a href="dat://${archive.key}" title=${archive.title} target="_blank">${archive.title || archive.key}</a>
              <div class="btn-group">
                <button @click=${e => {window.location = `dat://${archive.key}`}}>View</button>
                <button @click=${e => this.onClickRemoveLegacyArchive(e, archive)}>Remove</button>
              </div>
            </div>
          `)}
        </div>
      </section>
    `
  }

  // events
  // =

  onCloseSupportBanner (e) {
    localStorage.hasDismissedSupportBanner = 1
    this.requestUpdate()
  }

  async onClickNewHyperdrive (e) {
    var drive = await broxme.hyperdrive.createDrive()
    toast.create('Drive created')
    broxme.browser.openUrl(drive.url, {setActive: true, addedPaneUrls: ['broxme://editor/']})
  }

  async onClickNewBookmark (e, pinned) {
    try {
      await desktop.createLink(await AddLinkPopup.create(), pinned)
      toast.create('Link added', '', 10e3)
    } catch (e) {
      // ignore, user probably cancelled
      console.log(e)
      return
    }
    this.isEmpty = false
    this.load({clearCurrent: true})
  }

  async onContextmenuPin (e, pin) {
    e.preventDefault()
    const items = [
      {label: 'Open Link in New Tab', click: () => window.open(pin.href)},
      {label: 'Copy Link Address', click: () => writeToClipboard(pin.href)},
      (pin.isFixed) ? undefined : {type: 'separator'},
      (pin.isFixed) ? undefined : {label: 'Edit', click: () => this.onClickEditBookmark(pin)},
      (pin.isFixed) ? undefined : {label: 'Unpin', click: () => this.onClickUnpinBookmark(pin)}
    ].filter(Boolean)
    var fns = {}
    for (let i = 0; i < items.length; i++) {
      if (items[i].id) continue
      let id = `item=${i}`
      items[i].id = id
      fns[id] = items[i].click
      delete items[i].click
    }
    var choice = await broxme.browser.showContextMenu(items)
    if (fns[choice]) fns[choice]()
  }

  async onClickEditBookmark (file) {
    try {
      await EditBookmarkPopup.create(file)
      this.load()
    } catch (e) {
      // ignore
      console.log(e)
    }
  }

  async onClickUnpinBookmark (bookmark) {
    await broxme.bookmarks.add(Object.assign({}, bookmark, {pinned: false}))
    toast.create('Bookmark unpinned', '', 10e3)
    this.load()
  }

  async onClickRemoveLegacyArchive (e, archive) {
    e.preventDefault()
    if (!confirm('Are you sure?')) return
    await broxme.datLegacy.remove(archive.key)
    this.legacyArchives.splice(this.legacyArchives.indexOf(archive), 1)
    toast.create('Archive removed')
    this.requestUpdate()
  }
}

customElements.define('desktop-app', DesktopApp)
