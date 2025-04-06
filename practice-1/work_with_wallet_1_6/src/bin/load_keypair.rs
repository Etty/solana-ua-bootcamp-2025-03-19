use solana_sdk::signature::Signer;
use work_with_wallet_1_6::load_keypair;

pub fn main() {
    let keypair = load_keypair();
    println!("Public Key: {}", keypair.pubkey());
}
