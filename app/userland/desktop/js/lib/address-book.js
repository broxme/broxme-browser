// exported
// =

export async function loadProfile () {
  try {
    var addressBook = await broxme.hyperdrive.readFile('hyper://private/address-book.json').then(JSON.parse)
    return broxme.hyperdrive.drive(addressBook.profiles[0].key).getInfo()
  } catch (e) {
    console.log('Failed to load profile', e)
  }
  return undefined
}