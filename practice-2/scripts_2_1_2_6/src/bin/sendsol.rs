use scripts_2_1_2_6::load_keypair;
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction, pubkey::Pubkey, signature::Signer, system_instruction,
    transaction::Transaction,
};
use std::str::FromStr;

pub fn main() {
    let sender_keypair = load_keypair();
    let rec = Pubkey::from_str("8Wy8nY4QNQoFzRf8kff5FFnJR3LmGmpJpMN2GPrwWMrf")
        .expect("Invalid recipient key");
    let rpc_client = RpcClient::new("https://api.devnet.solana.com");
    let blockhash = rpc_client.get_latest_blockhash().unwrap();
    let memo_program = Pubkey::from_str("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")
        .expect("Invalid memo program key");
    let memo_text = "Hello from Rust!";

    let transfer_instruction =
        system_instruction::transfer(&sender_keypair.pubkey(), &rec, 5_000_000);

    // Create the memo instruction
    let memo_instruction = Instruction {
        program_id: memo_program,
        accounts: vec![solana_sdk::instruction::AccountMeta::new(
            sender_keypair.pubkey(),
            true,
        )],
        data: memo_text.as_bytes().to_vec(),
    };

    let transaction = Transaction::new_signed_with_payer(
        &[transfer_instruction, memo_instruction],
        Some(&sender_keypair.pubkey()),
        &[sender_keypair],
        blockhash,
    );

    let result = rpc_client.send_and_confirm_transaction(&transaction);
    match result {
        // unlike TypeScript lib, transaction in Rust returns only transaction code
        // to print link, use something like: format!("https://explorer.solana.com/tx/{}?cluster=devnet", signature)
        Ok(signature) => println!("Transaction successful! Signature: {:?}", signature),
        Err(e) => eprintln!("Error: {:?}", e),
    }
}
