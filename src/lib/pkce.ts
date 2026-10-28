const toBase64Url = (bytes: Uint8Array) => {
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export const createRandomString = (size = 32) => {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  return toBase64Url(bytes)
}

export const createCodeChallenge = async (verifier: string) => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  )
  return toBase64Url(new Uint8Array(digest))
}
