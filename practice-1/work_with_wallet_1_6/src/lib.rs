use solana_sdk::signature::read_keypair_file;
use solana_sdk::signature::Signer;
use std::path::Path;

pub fn load_keypair() -> impl Signer {
    let keypair_path = "./config/pk.json";

    let keypair = read_keypair_file(&Path::new(keypair_path)).expect("Failed to read keypair file");

    return keypair;
}

pub fn get_pubkey() -> String {
    let keypair = load_keypair();
    return keypair.pubkey().to_string();
}
