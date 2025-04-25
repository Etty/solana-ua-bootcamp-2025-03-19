use mpl_token_metadata::ID as metadata_program_id;
use mpl_token_metadata::instructions::CreateMetadataAccountV3Builder;
use mpl_token_metadata::types::DataV2;
use scripts_2_1_2_6::load_keypair;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{pubkey::Pubkey, signature::Signer, transaction::Transaction};
use std::process::exit;
use std::str::FromStr;

fn main() {
    let rpc_client = RpcClient::new("https://api.devnet.solana.com");
    let mint = Pubkey::from_str("EbqXNvEBmVox6e85Z6UBCFeCZDpYXHgkBEF9LK139kzu").unwrap();

    // Metadata PDA (Program Derived Address)
    let metadata_address = Pubkey::find_program_address(
        &[
            b"metadata",
            &metadata_program_id.to_bytes(),
            &mint.to_bytes(),
        ],
        &metadata_program_id,
    )
    .0;

    // Check if the Metadata PDA already exists
    match rpc_client.get_account(&metadata_address) {
        Ok(_) => {
            println!(
                "✅ Token metadata already exitsts for this mint: https://explorer.solana.com/address/{}?cluster=devnet",
                mint
            );
            exit(0);
        }
        Err(_) => {}
    }

    let mint_authority = load_keypair();

    let metadata = DataV2 {
        name: "Solana Bootcamp 2025-03-19 Rust".to_string(),
        symbol: "UAB-R-3".to_string(),
        uri: "https://arweave.net/1234".to_string(),
        seller_fee_basis_points: 0,
        creators: None,   // Optional creators
        collection: None, // Optional collection info
        uses: None,       // Optional usage limits
    };

    let create_metadata_account_instruction = CreateMetadataAccountV3Builder::new()
        .metadata(metadata_address)
        .mint(mint)
        .mint_authority(mint_authority.pubkey())
        .payer(mint_authority.pubkey())
        .update_authority(mint_authority.pubkey(), true)
        .data(metadata)
        .is_mutable(true)
        .instruction();

    // Fetch the latest blockhash
    let blockhash = rpc_client.get_latest_blockhash().unwrap();

    // Create a transaction with instructions
    let transaction = Transaction::new_signed_with_payer(
        &[create_metadata_account_instruction], // Instructions (in this case, metadata creation)
        Some(&mint_authority.pubkey()),         // Fee payer
        &[&mint_authority],                     // Signers (user in this case)
        blockhash,                              // Recent blockhash
    );

    // Send and confirm the transaction
    match rpc_client.send_and_confirm_transaction(&transaction) {
        Ok(signature) => {
            println!("✅ Token metadata created successfully!");
            println!("Transaction Signature: {}", signature);
        }
        Err(err) => {
            eprintln!("❌ Failed to create token metadata: {:?}", err);
        }
    };

    println!(
        "✅ Look at the token mint again: https://explorer.solana.com/address/{}?cluster=devnet",
        mint
    );
}
