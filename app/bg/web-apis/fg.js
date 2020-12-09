import * as rpc from 'pauls-electron-rpc'
import * as hyperdrive from './fg/hyperdrive'
import * as internal from './fg/internal'
import * as external from './fg/external'
import * as experimental from './fg/experimental'
import { contextBridge } from 'electron'

export const setup = function () {
  // setup APIs
  var broxme = {}
  if (['broxme:', 'hyper:', 'https:', 'http:', 'data:'].includes(window.location.protocol) ||
      window.location.hostname.endsWith('hyperdrive.network') /* TEMPRARY */) {
        broxme.hyperdrive = hyperdrive.setup(rpc)
    Object.assign(broxme, external.setup(rpc))
  }
  if (['broxme:', 'hyper:'].includes(window.location.protocol)) {
    contextBridge.exposeInMainWorld('experimental', experimental.setup(rpc)) // TODO remove?
  }
  if (window.location.protocol === 'broxme:' || /* TEMPRARY */ window.location.hostname.endsWith('hyperdrive.network')) {
    Object.assign(broxme, internal.setup(rpc))
  }
  if (Object.keys(broxme).length > 0) {
    contextBridge.exposeInMainWorld('broxme', broxme)
  }
}