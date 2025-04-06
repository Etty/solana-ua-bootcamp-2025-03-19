use solana_sdk::{signature::Keypair, signer::Signer};

pub fn main() {
    generate_keypair();
}
fn generate_keypair() {
    let keypair = Keypair::new();
    let pubkey = keypair.pubkey();
    let privkey = keypair.to_bytes();

    println!("public key: {pubkey}");
    println!("private key: {:?}", privkey);
}
