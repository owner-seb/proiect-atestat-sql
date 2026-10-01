// test-auth.mjs - tests for functions/_middleware.js (the password check of the live site).
// Run from the project root: node tests/test-auth.mjs
// It calls the REAL onRequest() with a fake Cloudflare context (a request, the secrets and a next() that marks the file as sent).
const { onRequest } = await import(new URL('../functions/_middleware.js', import.meta.url).href);

const PASSWORD = 'școală:2027'; // test password, with diacritics and a ":" on purpose
let passed = 0; // number of passed checks
let failed = 0; // number of failed checks

// builds an Authorization header the way a browser does: "Basic " + base64 of the UTF-8 bytes of "user:password"
function basicHeader(user, password) {
  const bytes = new TextEncoder().encode(user + ':' + password); // text → UTF-8 bytes
  return 'Basic ' + btoa(String.fromCharCode(...bytes)); // bytes → base64
}

// runs onRequest with an optional Authorization header and secret (null = secret not set); returns the response
async function request(authorization, secret = PASSWORD) {
  const headers = authorization ? { Authorization: authorization } : {}; // no header = first visit
  const context = {
    request: new Request('https://proiect.atzpeak.com/index.html', { headers }), // the browser's request
    env: secret === null ? {} : { SITE_PASSWORD: secret }, // the Cloudflare secrets
    next: async () => new Response('FILE', { status: 200 }), // stands for "send the requested file"
  };
  return onRequest(context);
}

// prints PASS/FAIL for one check
async function check(name, response, expectedStatus) {
  const body = await response.text(); // the text the browser would see
  const ok = response.status === expectedStatus; // compare the status code
  console.log((ok ? 'PASS ' : 'FAIL ') + name + ' => ' + response.status + ' ' + body);
  if (ok) { passed++; } else { failed++; }
  return body;
}

console.log('--- password check');
await check('correct password', await request(basicHeader('oricine', PASSWORD)), 200);
await check('any user name is accepted', await request(basicHeader('', PASSWORD)), 200);
await check('wrong password', await request(basicHeader('oricine', 'gresit')), 401);
await check('password with a missing letter', await request(basicHeader('oricine', PASSWORD.slice(0, -1))), 401);
await check('password without diacritics', await request(basicHeader('oricine', 'scoala:2027')), 401);
await check('no Authorization header', await request(null), 401);
await check('not a Basic login', await request('Bearer abc123'), 401);
await check('invalid base64', await request('Basic !!!'), 401);
await check('empty password sent', await request(basicHeader('oricine', '')), 401);

console.log('--- the browser is asked for a password');
const askResponse = await request(null); // first visit
const realm = askResponse.headers.get('WWW-Authenticate') || ''; // the header that opens the login box
const okRealm = realm.startsWith('Basic realm='); // must be a Basic login request
console.log((okRealm ? 'PASS ' : 'FAIL ') + 'WWW-Authenticate header => ' + realm);
if (okRealm) { passed++; } else { failed++; }

console.log('--- secret not set: the site stays closed');
await check('no SITE_PASSWORD', await request(basicHeader('oricine', ''), null), 500);
await check('empty SITE_PASSWORD', await request(basicHeader('oricine', ''), ''), 500);

console.log(passed + ' passed, ' + failed + ' failed'); // summary
if (failed > 0) { process.exit(1); } // exit code 1 if anything failed
