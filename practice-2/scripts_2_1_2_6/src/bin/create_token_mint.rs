use scripts_2_1_2_6::load_keypair;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
};

use spl_token::instruction::initialize_mint;

fn main() {
    let sender = load_keypair();

    println!("🔑 Our public key is: {}", sender.pubkey());

    // Connect to the Solana devnet cluster
    let rpc_url = "https://api.devnet.solana.com";
    let rpc_client = RpcClient::new(rpc_url);

    let blockhash = rpc_client.get_latest_blockhash().unwrap();

    // Create a new token mint account
    let mint_keypair = Keypair::new();
    const MINT_ACCOUNT_SIZE: usize = 82;

    let rent_exemption = rpc_client
        .get_minimum_balance_for_rent_exemption(MINT_ACCOUNT_SIZE)
        .unwrap();

    let create_account_instruction = system_instruction::create_account(
        &sender.pubkey(),
        &mint_keypair.pubkey(),
        rent_exemption,
        MINT_ACCOUNT_SIZE as u64,
        &spl_token::id(),
    );

    // Initialize the mint
    let decimals = 2;
    let initialize_mint_instruction = initialize_mint(
        &spl_token::id(),
        &mint_keypair.pubkey(),
        &sender.pubkey(),
        None,
        decimals,
    )
    .unwrap();

    // Build and send the transaction
    let transaction = Transaction::new_signed_with_payer(
        &[create_account_instruction, initialize_mint_instruction],
        Some(&sender.pubkey()),
        &[&sender, &mint_keypair as &dyn Signer],
        blockhash,
    );

    rpc_client
        .send_and_confirm_transaction(&transaction)
        .unwrap();

    println!("✅ Token Mint Created: {}", mint_keypair.pubkey());

    // Get the explorer link
    let explorer_link = format!(
        "https://explorer.solana.com/address/{}?cluster=devnet",
        mint_keypair.pubkey()
    );
    println!("🌐 Explorer Link: {}", explorer_link);
}
