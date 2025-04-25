use scripts_2_1_2_6::load_keypair;
use solana_client::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Signer;
use solana_sdk::transaction::Transaction;
use spl_associated_token_account::{
    get_associated_token_address, instruction::create_associated_token_account,
};
use std::str::FromStr;

fn main() {
    let rpc_url = "https://api.devnet.solana.com";
    let rpc_client = RpcClient::new(rpc_url);
    let recipient = Pubkey::from_str("3iUzRvC7CoTroUFZ6Ncs4pxPpEg7JzxeWMWQxCM6XiRp").unwrap();
    let owner = load_keypair();
    let mint_pubkey = Pubkey::from_str("EbqXNvEBmVox6e85Z6UBCFeCZDpYXHgkBEF9LK139kzu").unwrap();

    // Calculate associated token account address
    let associated_token_address = get_associated_token_address(&recipient, &mint_pubkey);

    println!("Associated Token Address: {}", associated_token_address);

    match rpc_client.get_account(&associated_token_address) {
        Ok(_) => {}
        Err(_) => {
            // Create instruction to create the associated token account
            let instruction = create_associated_token_account(
                &owner.pubkey(),
                &recipient,
                &mint_pubkey,
                &associated_token_address,
            );
            // Fetch the latest blockhash
            let blockhash = rpc_client.get_latest_blockhash().unwrap();

            // Build and sign the transaction
            let transaction = Transaction::new_signed_with_payer(
                &[instruction],
                Some(&owner.pubkey()),
                &[owner],
                blockhash,
            );

            // Send and confirm the transaction
            match rpc_client.send_and_confirm_transaction(&transaction) {
                Ok(signature) => {
                    println!("✅ Associated Token Account Created Successfully!");
                    println!("Address: {}", associated_token_address);
                    println!("Transaction Signature: {}", signature);
                }
                Err(err) => {
                    eprintln!("❌ Failed to Create Associated Token Account: {:?}", err);
                }
            };
        }
    }
}
