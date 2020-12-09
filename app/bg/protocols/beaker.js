import errorPage from '../lib/error-page'
import * as mime from '../lib/mime'
import { drivesDebugPage, datDnsCachePage, datDnsCacheJS } from '../hyper/debugging'
import path from 'path'
import url from 'url'
import once from 'once'
import fs from 'fs'
import jetpack from 'fs-jetpack'
import intoStream from 'into-stream'
import ICO from 'icojs'

// constants
// =

// content security policies
const BEAKER_CSP = `
  default-src 'self' broxme:;
  img-src broxme: asset: data: blob: hyper: http: https;
  script-src 'self' broxme: 'unsafe-eval';
  media-src 'self' broxme: hyper:;
  style-src 'self' 'unsafe-inline' broxme:;
  child-src 'self';
`.replace(/\n/g, '')
const BEAKER_APP_CSP = `
  default-src 'self' broxme:;
  img-src broxme: asset: data: blob: hyper: http: https;
  script-src 'self' broxme: hyper: 'unsafe-eval';
  media-src 'self' broxme: hyper:;
  style-src 'self' 'unsafe-inline' broxme:;
  child-src 'self' hyper:;
`.replace(/\n/g, '')
const SIDEBAR_CSP = `
default-src 'self' broxme:;
img-src broxme: asset: data: blob: hyper: http: https;
script-src 'self' broxme: hyper: blob: 'unsafe-eval';
media-src 'self' broxme: hyper:;
style-src 'self' 'unsafe-inline' broxme:;
child-src 'self' broxme:;
`.replace(/\n/g, '')

// exported api
// =

export function register (protocol) {
  // setup the protocol handler
  protocol.registerStreamProtocol('broxme', beakerProtocol)
}

// internal methods
// =

async function beakerProtocol (request, respond) {
  var cb = once((statusCode, status, contentType, path, CSP) => {
    const headers = {
      'Cache-Control': 'no-cache',
      'Content-Type': (contentType || 'text/html; charset=utf-8'),
      'Content-Security-Policy': CSP || BEAKER_CSP,
      'Access-Control-Allow-Origin': '*'
    }
    if (typeof path === 'string') {
      respond({statusCode, headers, data: fs.createReadStream(path)})
    } else if (typeof path === 'function') {
      respond({statusCode, headers, data: intoStream(path())})
    } else {
      respond({statusCode, headers, data: intoStream(errorPage(statusCode + ' ' + status))})
    }
  })
  async function serveICO (path, size = 16) {
    // read the file
    const data = await jetpack.readAsync(path, 'buffer')

    // parse the ICO to get the 16x16
    const images = await ICO.parse(data, 'image/png')
    let image = images[0]
    for (let i = 1; i < images.length; i++) {
      if (Math.abs(images[i].width - size) < Math.abs(image.width - size)) {
        image = images[i]
      }
    }

    // serve
    cb(200, 'OK', 'image/png', () => Buffer.from(image.buffer))
  }

  var requestUrl = request.url
  var queryParams
  {
    // strip off the hash
    let i = requestUrl.indexOf('#')
    if (i !== -1) requestUrl = requestUrl.slice(0, i)
  }
  {
    // get the query params
    queryParams = url.parse(requestUrl, true).query

    // strip off the query
    let i = requestUrl.indexOf('?')
    if (i !== -1) requestUrl = requestUrl.slice(0, i)
  }

  // redirects from old pages
  if (requestUrl.startsWith('broxme://start/')) {
    return cb(200, 'OK', 'text/html', () => `<!doctype html><meta http-equiv="refresh" content="0; url=broxme://desktop/">`)
  }

  // browser ui
  if (requestUrl === 'broxme://shell-window/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg', 'shell-window', 'index.html'))
  }
  if (requestUrl === 'broxme://shell-window/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'fg', 'shell-window', 'index.build.js'))
  }
  if (requestUrl === 'broxme://location-bar/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg', 'location-bar', 'index.html'))
  }
  if (requestUrl === 'broxme://shell-menus/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg', 'shell-menus', 'index.html'))
  }
  if (requestUrl === 'broxme://prompts/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg', 'prompts', 'index.html'))
  }
  if (requestUrl === 'broxme://perm-prompt/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg', 'perm-prompt', 'index.html'))
  }
  if (requestUrl === 'broxme://modals/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', path.join(__dirname, 'fg', 'modals', 'index.html'))
  }
  if (requestUrl === 'broxme://assets/syntax-highlight.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'assets/js/syntax-highlight.js'))
  }
  if (requestUrl === 'broxme://assets/syntax-highlight.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/css/syntax-highlight.css'))
  }
  if (requestUrl === 'broxme://assets/font-awesome.css') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/css/fa-all.min.css'))
  }
  if (requestUrl === 'broxme://assets/webfonts/fa-regular-400.woff2') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-regular-400.woff2'))
  }
  if (requestUrl === 'broxme://assets/webfonts/fa-regular-400.woff') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-regular-400.woff'))
  }
  if (requestUrl === 'broxme://assets/webfonts/fa-regular-400.svg') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-regular-400.svg'))
  }
  if (requestUrl === 'broxme://assets/webfonts/fa-solid-900.woff2') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-solid-900.woff2'))
  }
  if (requestUrl === 'broxme://assets/webfonts/fa-solid-900.woff') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-solid-900.woff'))
  }
  if (requestUrl === 'broxme://assets/webfonts/fa-solid-900.svg') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-solid-900.svg'))
  }
  if (requestUrl === 'broxme://assets/webfonts/fa-brands-400.woff2') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-brands-400.woff2'))
  }
  if (requestUrl === 'broxme://assets/webfonts/fa-brands-400.woff') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-brands-400.woff'))
  }
  if (requestUrl === 'broxme://assets/webfonts/fa-brands-400.svg') {
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, 'assets/fonts/fa-brands-400.svg'))
  }
  if (requestUrl === 'broxme://assets/font-photon-entypo') {
    return cb(200, 'OK', 'application/font-woff', path.join(__dirname, 'assets/fonts/photon-entypo.woff'))
  }
  if (requestUrl === 'broxme://assets/font-source-sans-pro') {
    return cb(200, 'OK', 'application/font-woff2', path.join(__dirname, 'assets/fonts/source-sans-pro.woff2'))
  }
  if (requestUrl === 'broxme://assets/font-source-sans-pro-le') {
    return cb(200, 'OK', 'application/font-woff2', path.join(__dirname, 'assets/fonts/source-sans-pro-le.woff2'))
  }
  if (requestUrl === 'broxme://assets/logo-black.svg') {
    return cb(200, 'OK', 'image/svg+xml', path.join(__dirname, 'assets/img/logo-black.svg'))
  }
  if (requestUrl === 'broxme://assets/spinner.gif') {
    return cb(200, 'OK', 'image/gif', path.join(__dirname, 'assets/img/spinner.gif'))
  }
  if (requestUrl.startsWith('broxme://assets/logo2')) {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/logo2.png'))
  }
  if (requestUrl.startsWith('broxme://assets/logo')) {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/logo.png'))
  }
  if (requestUrl.startsWith('broxme://assets/default-user-thumb')) {
    return cb(200, 'OK', 'image/jpeg', path.join(__dirname, 'assets/img/default-user-thumb.jpg'))
  }
  if (requestUrl.startsWith('broxme://setup/default-user-thumb')) {
    // rehost under broxme://setup because there's a CSP bug stopping broxme://setup from accessing broxme://assets
    return cb(200, 'OK', 'image/jpeg', path.join(__dirname, 'assets/img/default-user-thumb.jpg'))
  }
  if (requestUrl.startsWith('broxme://assets/default-frontend-thumb')) {
    return cb(200, 'OK', 'image/jpeg', path.join(__dirname, 'assets/img/default-frontend-thumb.jpg'))
  }
  if (requestUrl.startsWith('broxme://assets/search-icon-large')) {
    return cb(200, 'OK', 'image/jpeg', path.join(__dirname, 'assets/img/search-icon-large.png'))
  }
  if (requestUrl.startsWith('broxme://assets/favicons/')) {
    return serveICO(path.join(__dirname, 'assets/favicons', requestUrl.slice('broxme://assets/favicons/'.length)))
  }
  if (requestUrl.startsWith('broxme://assets/search-engines/')) {
    return cb(200, 'OK', 'image/png', path.join(__dirname, 'assets/img/search-engines', requestUrl.slice('broxme://assets/search-engines/'.length)))
  }
  if (requestUrl.startsWith('broxme://assets/img/templates/')) {
    let imgPath = requestUrl.slice('broxme://assets/img/templates/'.length)
    return cb(200, 'OK', 'image/png', path.join(__dirname, `assets/img/templates/${imgPath}`))
  }
  if (requestUrl.startsWith('broxme://assets/img/frontends/')) {
    let imgPath = requestUrl.slice('broxme://assets/img/frontends/'.length)
    return cb(200, 'OK', 'image/png', path.join(__dirname, `assets/img/frontends/${imgPath}`))
  }
  if (requestUrl.startsWith('broxme://assets/img/drive-types/')) {
    let imgPath = requestUrl.slice('broxme://assets/img/drive-types/'.length)
    return cb(200, 'OK', 'image/png', path.join(__dirname, `assets/img/drive-types/${imgPath}`))
  }

  // userland
  if (requestUrl === 'broxme://app-stdlib' || requestUrl.startsWith('broxme://app-stdlib/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'app-stdlib'), cb)
  }
  if (requestUrl === 'broxme://diff' || requestUrl.startsWith('broxme://diff/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'diff'), cb)
  }
  if (requestUrl === 'broxme://library' || requestUrl.startsWith('broxme://library/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'library'), cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'broxme://drive-view' || requestUrl.startsWith('broxme://drive-view/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'drive-view'), cb)
  }
  if (requestUrl === 'broxme://cmd-pkg' || requestUrl.startsWith('broxme://cmd-pkg/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'cmd-pkg'), cb)
  }
  if (requestUrl === 'broxme://site-info' || requestUrl.startsWith('broxme://site-info/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'site-info'), cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'broxme://setup' || requestUrl.startsWith('broxme://setup/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'setup'), cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'broxme://init' || requestUrl.startsWith('broxme://init/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'init'), cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'broxme://editor' || requestUrl.startsWith('broxme://editor/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'editor'), cb)
  }
  if (requestUrl === 'broxme://explorer' || requestUrl.startsWith('broxme://explorer/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'explorer'), cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'broxme://hypercore-tools' || requestUrl.startsWith('broxme://hypercore-tools/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'hypercore-tools'), cb, {fallbackToIndexHTML: true})
  }
  if (requestUrl === 'broxme://webterm' || requestUrl.startsWith('broxme://webterm/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'webterm'), cb, {
      fallbackToIndexHTML: true,
      CSP: SIDEBAR_CSP
    })
  }
  if (requestUrl === 'broxme://desktop' || requestUrl.startsWith('broxme://desktop/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'desktop'), cb, {
      CSP: BEAKER_APP_CSP,
      fallbackToIndexHTML: true,
    })
  }
  if (requestUrl === 'broxme://history' || requestUrl.startsWith('broxme://history/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'history'), cb)
  }
  if (requestUrl === 'broxme://settings' || requestUrl.startsWith('broxme://settings/')) {
    return serveAppAsset(requestUrl, path.join(__dirname, 'userland', 'settings'), cb)
  }
  if (requestUrl.startsWith('broxme://assets/img/onboarding/')) {
    let imgPath = requestUrl.slice('broxme://assets/img/onboarding/'.length)
    return cb(200, 'OK', 'image/png', path.join(__dirname, `assets/img/onboarding/${imgPath}`))
  }
  if (requestUrl === 'broxme://assets/monaco.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', path.join(__dirname, 'assets/js/editor/monaco.js'))
  }
  if (requestUrl.startsWith('broxme://assets/vs/') && requestUrl.endsWith('.js')) {
    let filePath = requestUrl.slice('broxme://assets/vs/'.length)
    return cb(200, 'OK', 'application/javascript', path.join(__dirname, `assets/js/editor/vs/${filePath}`))
  }
  if (requestUrl.startsWith('broxme://assets/vs/') && requestUrl.endsWith('.css')) {
    let filePath = requestUrl.slice('broxme://assets/vs/'.length)
    return cb(200, 'OK', 'text/css; charset=utf-8', path.join(__dirname, `assets/js/editor/vs/${filePath}`))
  }
  if (requestUrl.startsWith('broxme://assets/vs/') && requestUrl.endsWith('.ttf')) {
    let filePath = requestUrl.slice('broxme://assets/vs/'.length)
    return cb(200, 'OK', 'font/ttf', path.join(__dirname, `assets/js/editor/vs/${filePath}`))
  }

  // debugging
  if (requestUrl === 'broxme://active-drives/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', drivesDebugPage)
  }
  if (requestUrl === 'broxme://dat-dns-cache/') {
    return cb(200, 'OK', 'text/html; charset=utf-8', datDnsCachePage)
  }
  if (requestUrl === 'broxme://dat-dns-cache/main.js') {
    return cb(200, 'OK', 'application/javascript; charset=utf-8', datDnsCacheJS)
  }
  // TODO replace?
  // if (requestUrl.startsWith('beaker://debug-log/')) {
  //   const PAGE_SIZE = 1e6
  //   var start = queryParams.start ? (+queryParams.start) : 0
  //   let content = await beakerCore.getLogFileContent(start, start + PAGE_SIZE)
  //   var pagination = `<h2>Showing bytes ${start} - ${start + PAGE_SIZE}. <a href="beaker://debug-log/?start=${start + PAGE_SIZE}">Next page</a></h2>`
  //   return respond({
  //     statusCode: 200,
  //     headers: {
  //       'Content-Type': 'text/html; charset=utf-8',
  //       'Content-Security-Policy': BEAKER_CSP,
  //       'Access-Control-Allow-Origin': '*'
  //     },
  //     data: intoStream(`
  //       ${pagination}
  //       <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  //       ${pagination}
  //     `)
  //   })
  // }

  return cb(404, 'Not Found')
}

// helper to serve requests to app packages
async function serveAppAsset (requestUrl, dirPath, cb, {CSP, fallbackToIndexHTML} = {CSP: undefined, fallbackToIndexHTML: false}) {
  // resolve the file path
  const urlp = new URL(requestUrl)
  var pathname = urlp.pathname
  if (pathname === '' || pathname === '/') {
    pathname = '/index.html'
  }
  var filepath = path.join(dirPath, pathname)

  // make sure the file exists
  try {
    await fs.promises.stat(filepath)
  } catch (e) {
    if (fallbackToIndexHTML) {
      filepath = path.join(dirPath, '/index.html')
    } else {
      return cb(404, 'Not Found')
    }
  }

  // identify the mime type
  var contentType = mime.identify(filepath)

  // serve
  cb(200, 'OK', contentType, filepath, CSP)
}