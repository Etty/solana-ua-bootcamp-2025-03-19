import { clusterApiUrl, Connection, Keypair} from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo, transfer } from '@solana/spl-token';
import { getExplorerLink } from '@solana-developers/helpers';
import "dotenv/config";

    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

    // Generate a new wallet keypair and airdrop SOL
    let privateKey = process.env["SECRET_KEY"];
    if (privateKey === undefined) {
        console.log("Add SECRET_KEY to .env!");
        process.exit(1);
      }
const asArray = Uint8Array.from(JSON.parse(privateKey));
const fromWallet = Keypair.fromSecretKey(asArray);

  let recKey = process.env["TO_WALLET"];
if (recKey === undefined) {
    console.log("Add TO_WALLET to .env!");
    process.exit(1);
  }
  const asArrayRec = Uint8Array.from(JSON.parse(recKey));
  const toWallet = Keypair.fromSecretKey(asArrayRec)

    // Create new token mint
    const mint = await createMint(connection, fromWallet, fromWallet.publicKey, null, 9);

    // Get the token account of the fromWallet address, and if it does not exist, create it
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        fromWallet,
        mint,
        fromWallet.publicKey
    );

    // Get the token account of the toWallet address, and if it does not exist, create it
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(connection, fromWallet, mint, toWallet.publicKey);

    // Mint 1 new token to the "fromTokenAccount" account we just created
    let signature = await mintTo(
        connection,
        fromWallet,
        mint,
        fromTokenAccount.address,
        fromWallet.publicKey,
        1000000000
    );
    console.log('mint tx:', signature);
    console.log('From token account: ' + fromTokenAccount.address.toBase58());
    console.log("Sender wallet: " + fromWallet.publicKey);
    console.log('To token account: ' + toTokenAccount.address.toBase58());
    console.log("Recipient wallet: " + toWallet.publicKey);

    // Transfer the new token to the "toTokenAccount" we just created
     signature = await transfer(
        connection,
        toWallet,
        fromTokenAccount.address,
        toTokenAccount.address,
        fromWallet.publicKey,
        50,
        [fromWallet, toWallet]
    );

    
    console.log(getExplorerLink("transaction", signature, "devnet"));