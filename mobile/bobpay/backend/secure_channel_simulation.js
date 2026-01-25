const crypto = require('crypto');
const { EventEmitter } = require('events');

const channel = new EventEmitter();

function createUser(name) {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    name,
    ecdh,
    publicKey: ecdh.getPublicKey('base64'),
  };
}

function deriveKey(ecdh, theirPublicKey) {
  const sharedSecret = ecdh.computeSecret(theirPublicKey, 'base64');
  const key = crypto.hkdfSync(
    'sha256',
    sharedSecret,
    Buffer.alloc(0),
    Buffer.from('bobpay-secure-channel'),
    32
  );
  return Buffer.isBuffer(key) ? key : Buffer.from(key);
}

function encrypt(text, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

function decrypt(payload, key) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(payload.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

function preview(value) {
  if (!value) return '';
  return value.length > 32 ? `${value.substring(0, 32)}...` : value;
}

function keyHash(key) {
  const data = Buffer.isBuffer(key) ? key : Buffer.from(key);
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 12);
}

function sendMessage(from, to, key, text) {
  const payload = encrypt(text, key);
  console.log(`[SENDER:${from}] plain="${text}"`);
  console.log(
    `[SENDER:${from}] encrypted ciphertext=${preview(payload.ciphertext)} iv=${preview(payload.iv)} tag=${preview(payload.tag)}`
  );
  channel.emit('message', { from, to, payload });
}

const client = createUser('CLIENT');
const freelancer = createUser('FREELANCER');

const clientKey = deriveKey(client.ecdh, freelancer.publicKey);
const freelancerKey = deriveKey(freelancer.ecdh, client.publicKey);

console.log('[SECURE_CHANNEL] Shared key hash (client)', keyHash(clientKey));
console.log('[SECURE_CHANNEL] Shared key hash (freelancer)', keyHash(freelancerKey));

channel.on('message', ({ from, to, payload }) => {
  const receiverKey = to === 'CLIENT' ? clientKey : freelancerKey;
  console.log(`[RECEIVER:${to}] received from ${from}`);
  console.log(
    `[RECEIVER:${to}] encrypted ciphertext=${preview(payload.ciphertext)} iv=${preview(payload.iv)} tag=${preview(payload.tag)}`
  );
  const plaintext = decrypt(payload, receiverKey);
  console.log(`[RECEIVER:${to}] decrypted="${plaintext}"`);
});

const queue = [
  { from: 'CLIENT', to: 'FREELANCER', text: 'Hello, contract accepted.' },
  { from: 'FREELANCER', to: 'CLIENT', text: 'Got it. Starting milestone 1.' },
  { from: 'CLIENT', to: 'FREELANCER', text: 'Share update when ready.' },
];

let idx = 0;
const interval = setInterval(() => {
  if (idx >= queue.length) {
    clearInterval(interval);
    console.log('[SECURE_CHANNEL] Simulation complete.');
    return;
  }
  const msg = queue[idx];
  const key = msg.from === 'CLIENT' ? clientKey : freelancerKey;
  sendMessage(msg.from, msg.to, key, msg.text);
  idx += 1;
}, 1200);
