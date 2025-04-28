import "dotenv/config";
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { createMint, createMultisig, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { getExplorerLink } from "@solana-developers/helpers";

let privateKey = process.env["SECRET_KEY"];
let signer2Key = process.env["SIGNER2"];
let signer3Key = process.env["SIGNER3"];
if (privateKey === undefined) {
  console.log("Add SECRET_KEY to .env!");
  process.exit(1);
}
if (signer2Key === undefined) {
    console.log("Add SIGNER2 to .env!");
    process.exit(1);
  }
  if (signer3Key === undefined) {
    console.log("Add SIGNER3 to .env!");
    process.exit(1);
  }
const asArray = Uint8Array.from(JSON.parse(privateKey));
const payer = Keypair.fromSecretKey(asArray);
const asArray2 = Uint8Array.from(JSON.parse(signer2Key));
const signer2 = Keypair.fromSecretKey(asArray2);
const asArray3 = Uint8Array.from(JSON.parse(signer3Key));
const signer3 = Keypair.fromSecretKey(asArray3);

const connection = new Connection(clusterApiUrl("devnet"));

const multisigKey = await createMultisig(connection, payer, [payer.publicKey, signer2.publicKey, signer3.publicKey], 2);

const mint = await createMint(
    connection,
    payer,
    multisigKey,
    multisigKey,
    5
  );

  console.log(`✅ Created multisig token: ${mint.toString()}`);

await sleep(10_000);

  const multisigTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    signer2.publicKey
  );

  const MINOR_UNITS_PER_MAJOR_UNITS = Math.pow(10, 5);

    const transactionSignature = await mintTo(
      connection,
      payer,
      mint,
      multisigTokenAccount.address,
      multisigKey,
      10 * MINOR_UNITS_PER_MAJOR_UNITS,
      [signer2, signer3]
    );
    
    const link = getExplorerLink("transaction", transactionSignature, "devnet");
    
    console.log("✅ Tokens transfered successfully!");
    console.log(`Mint Token Transaction: ${link}`);



    function sleep(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }