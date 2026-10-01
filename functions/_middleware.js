// _middleware.js - password check for the whole live site (a Cloudflare Pages Function).
// It runs on Cloudflare's servers before every file of the site is sent (index.html, CSS, JS, seed.sql, ...).
// The browser shows its own login box. Only the password is checked; the user name can be anything.
// The password is NOT written here (the GitHub repo is public): it is the Cloudflare secret SITE_PASSWORD.
// Local testing with python3 serve.py does not run this file, so the site stays open on localhost.

/**
 * Lets a request through only if the browser sent the correct password.
 * @param {object} context - given by Cloudflare: context.request (the browser's request),
 *   context.env (the secrets) and context.next() (sends the requested file)
 * @returns {Promise<Response>} the requested file, or an answer that asks for the password
 */
export async function onRequest(context) {
  const correctPassword = context.env.SITE_PASSWORD; // the password, from the Cloudflare secret
  if (!correctPassword) { // the secret was never set on Cloudflare
    return new Response('Parola site-ului nu este setată pe Cloudflare (SITE_PASSWORD).', { // keep the site closed, never open by mistake
      status: 500, // 500 = server error
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }, // plain text with diacritics
    });
  }
  const header = context.request.headers.get('Authorization') || ''; // "Basic <user:password in base64>", empty on the first visit
  if (readPassword(header) === correctPassword) { // correct password
    return context.next(); // send the requested file
  }
  return askForPassword(); // missing or wrong password
}

/**
 * Reads the password from the browser's Authorization header.
 * @param {string} header - for example "Basic YWRtaW46c2VjcmV0" (base64 of "admin:secret")
 * @returns {string|null} the password, or null if the header is missing or invalid
 */
function readPassword(header) {
  if (!header.startsWith('Basic ')) { // no login sent yet, or a different kind of login
    return null; // no password
  }
  try {
    const bytes = Uint8Array.from(atob(header.slice(6)), (char) => char.charCodeAt(0)); // undo the base64
    const userAndPassword = new TextDecoder().decode(bytes); // bytes → text (keeps diacritics like ș ț ă)
    return userAndPassword.slice(userAndPassword.indexOf(':') + 1); // everything after the first ":" is the password
  } catch {
    return null; // not valid base64
  }
}

/**
 * Builds the answer that makes the browser show its login box.
 * @returns {Response} a 401 answer with the WWW-Authenticate header
 */
function askForPassword() {
  return new Response('Acces restricționat: este nevoie de parolă.', { // text shown if the user presses Cancel
    status: 401, // 401 = login required
    headers: {
      'WWW-Authenticate': 'Basic realm="Proiect atestat SQL", charset="UTF-8"', // tells the browser to show the login box
      'Content-Type': 'text/plain; charset=utf-8', // plain text with diacritics
    },
  });
}
