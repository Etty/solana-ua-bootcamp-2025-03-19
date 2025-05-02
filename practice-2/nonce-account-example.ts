import "dotenv/config";
import { Connection, Keypair, NONCE_ACCOUNT_LENGTH, NonceAccount, SystemProgram, Transaction, clusterApiUrl, sendAndConfirmRawTransaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { createMint, createMintToInstruction, createMultisig, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
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
  const onlineAccount = Keypair.fromSecretKey(asArray);
  const asArray2 = Uint8Array.from(JSON.parse(signer2Key));
  const signer2 = Keypair.fromSecretKey(asArray2);
  const asArray3 = Uint8Array.from(JSON.parse(signer3Key));
  const signer3 = Keypair.fromSecretKey(asArray3);

  const nonceAccount = Keypair.generate();

  const connection = new Connection(
    clusterApiUrl('devnet'),
    'confirmed',
  );

  const multisigKey = await createMultisig(connection, onlineAccount, [onlineAccount.publicKey, signer2.publicKey, signer3.publicKey], 2);
  
  const mint = await createMint(
      connection,
      onlineAccount,
      multisigKey,
      multisigKey,
      5
    );
  
    console.log(`✅ Created multisig token: ${mint.toString()}`);
  
  await sleep(15_000);
  
    const multisigTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      onlineAccount,
      mint,
      signer2.publicKey
    );
  
    console.log("Token account:", multisigTokenAccount.address.toBase58());

  const minimumAmount = await connection.getMinimumBalanceForRentExemption(
    NONCE_ACCOUNT_LENGTH,
  );

  // Form CreateNonceAccount transaction
const transaction = new Transaction()
.add(
SystemProgram.createNonceAccount({
  fromPubkey: onlineAccount.publicKey,
  noncePubkey: nonceAccount.publicKey,
  authorizedPubkey: onlineAccount.publicKey,
  lamports: minimumAmount,
}),
);

await sendAndConfirmTransaction(connection, transaction, [onlineAccount, nonceAccount])

const nonceAccountInfo = await connection.getAccountInfo(
    nonceAccount.publicKey,
    'confirmed'
  );
  
  const nonceAccountFromInfo = NonceAccount.fromAccountData(nonceAccountInfo.data);
  
  console.log(nonceAccountFromInfo);

const nonceInstruction = SystemProgram.nonceAdvance({
    authorizedPubkey: onlineAccount.publicKey,
    noncePubkey: nonceAccount.publicKey
  });
  
  const nonce = nonceAccountFromInfo.nonce;

  const MINOR_UNITS_PER_MAJOR_UNITS = Math.pow(10, 5);
  
  const mintToTransaction = new Transaction({
    feePayer: onlineAccount.publicKey,
    nonceInfo: {nonce, nonceInstruction}
  })
    .add(
      createMintToInstruction(
        mint,
        multisigTokenAccount.address,
        multisigKey,
        10 * MINOR_UNITS_PER_MAJOR_UNITS,
        [
          onlineAccount,
          signer2
        ],
        TOKEN_PROGRAM_ID
      )
    );

mintToTransaction.partialSign(onlineAccount);
await sleep(180_000);
mintToTransaction.partialSign(signer2);

let rawMintToTransaction = mintToTransaction.serialize();
const res = await sendAndConfirmRawTransaction(connection, rawMintToTransaction);

console.log('Offile transaction', getExplorerLink("transaction", res, "devnet"));

function sleep(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

