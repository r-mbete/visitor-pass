import { generateSigningKey } from "../lib/pass/keys";

// Prints a new pass-signing key for .env.local; the private key must never be committed or sent to a client.
async function main() {
  const { privateJwk } = await generateSigningKey();
  console.log(`PASS_SIGNING_KEY='${JSON.stringify(privateJwk)}'`);
}

void main();
