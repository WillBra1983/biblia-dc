const { getApps, initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getDatabase, ServerValue } = require('firebase-admin/database')
const { getMessaging } = require('firebase-admin/messaging')
const { getStorage } = require('firebase-admin/storage')

function garantirApp() {
  return getApps()[0] || initializeApp()
}

function database() {
  return getDatabase(garantirApp())
}

database.ServerValue = ServerValue

module.exports = {
  get apps() {
    return getApps()
  },
  initializeApp,
  auth: () => getAuth(garantirApp()),
  database,
  messaging: () => getMessaging(garantirApp()),
  storage: () => getStorage(garantirApp()),
}
