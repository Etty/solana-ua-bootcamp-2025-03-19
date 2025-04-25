use scripts_2_1_2_6::load_keypair;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{pubkey::Pubkey, signature::Signer, transaction::Transaction};
use spl_token::instruction::mint_to;
use std::str::FromStr;

fn main() {
    const MINOR_UNITS_PER_MAJOR_UNITS: u64 = 10_u64.pow(2);

    let rpc_client = RpcClient::new("https://api.devnet.solana.com");
    let mint = Pubkey::from_str("EbqXNvEBmVox6e85Z6UBCFeCZDpYXHgkBEF9LK139kzu").unwrap();
    let recipient_token_account =
        Pubkey::from_str("GSkhnopFsynYAQNpcmiErbgFuS1AqNqGQQe8MwBKDvL1").unwrap();
    let mint_authority = load_keypair();

    // Create the mint_to instruction
    let instruction = mint_to(
        &spl_token::id(),
        &mint,                            // Mint address
        &recipient_token_account,         // Destination token account
        &mint_authority.pubkey(),         // Mint authority
        &[&mint_authority.pubkey()],      // Signers other than mint authority
        10 * MINOR_UNITS_PER_MAJOR_UNITS, // Amount to mint
    )
    .unwrap();

    // Fetch the latest blockhash
    let blockhash = rpc_client.get_latest_blockhash().unwrap();

    // Build and sign the transaction
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],                 // Instruction to mint tokens
        Some(&mint_authority.pubkey()), // Payer of the transaction fee
        &[mint_authority],              // Signers (payer and mint authority)
        blockhash,
    );

    // Send and confirm the transaction
    match rpc_client.send_and_confirm_transaction(&transaction) {
        Ok(signature) => {
            println!("✅ Tokens minted successfully!");
            println!("Transaction Signature: {}", signature);
        }
        Err(err) => {
            eprintln!("❌ Failed to mint tokens: {:?}", err);
        }
    };
}
