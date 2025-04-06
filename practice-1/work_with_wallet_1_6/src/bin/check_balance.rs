use solana_client::rpc_client::RpcClient;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::pubkey::Pubkey;
use std::str::FromStr;
use work_with_wallet_1_6::get_pubkey;

pub fn main() {
    let rpc_url = String::from("https://api.devnet.solana.com");
    let connection = RpcClient::new_with_commitment(rpc_url, CommitmentConfig::confirmed());

    let token_account = Pubkey::from_str(&get_pubkey()).expect("Invalid public key");

    let lamports = 1_000_000_000;
    match connection.request_airdrop(&token_account, lamports) {
        Ok(signature) => {
            println!(
                "Airdrop requested successfully! Transaction signature: {}",
                signature
            );
        }
        Err(err) => {
            eprintln!("Failed to request airdrop: {}", err);
        }
    }

    match connection.get_balance(&token_account) {
        Ok(balance) => {
            println!(
                "Account balance in SOL: {} SOL",
                balance as f64 / 1_000_000_000.0
            );
        }
        Err(err) => {
            eprintln!("Failed to get account balance: {}", err);
        }
    }
}
